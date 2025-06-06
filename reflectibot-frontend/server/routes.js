"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const multer_1 = __importDefault(require("multer"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const form_data_1 = __importDefault(require("form-data"));
const openai_1 = require("openai");
const reflect_1 = require("./routes/reflect");
const storage_1 = require("./storage");
const promptUtils_1 = require("./utils/promptUtils");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const openai = new openai_1.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
function getStageFromWordCount(wordCount) {
    if (wordCount < 10)
        return "Infant";
    if (wordCount < 25)
        return "Toddler";
    if (wordCount < 50)
        return "Child";
    if (wordCount < 100)
        return "Adolescent";
    return "Adult";
}
function extractKeywords(text) {
    return text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(word => word.length > 2).slice(0, 10);
}
async function generateResponse(message, botId, userId, stylePrompt) {
    const memories = await storage_1.storage.getUserMemories(userId);
    const facts = await storage_1.storage.getUserFacts(userId);
    const learnedWords = await storage_1.storage.getLearnedWords(botId);
    const stage = getStageFromWordCount(learnedWords.length);
    const systemPrompt = (0, promptUtils_1.getReflectibotPrompt)({
        factContext: facts.map(f => f.fact).join('\n'),
        memoryContext: memories.map(m => m.memory).join('\n'),
        stage,
        learnedWordCount: learnedWords.length,
        personality: { tone: 'neutral' }
    });
    const promptWithStyle = `${stylePrompt || ''}\n\n${systemPrompt}`;
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: promptWithStyle },
            { role: 'user', content: message }
        ],
        max_tokens: 150
    });
    return response.choices[0].message?.content || "Sorry, I’m not sure how to respond.";
}
async function handleTTSRequest(req, res) {
    try {
        const { text, voiceId = 'iCrDUkL56s3C8sCRl7wb' } = req.body;
        if (!text) {
            res.status(400).json({ error: 'Text is required' });
            return;
        }
        const response = await (0, node_fetch_1.default)(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });
        if (!response.ok)
            throw new Error(`ElevenLabs API error: ${response.status}`);
        const audioBuffer = await response.arrayBuffer();
        res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': audioBuffer.byteLength.toString() });
        res.send(Buffer.from(audioBuffer));
    }
    catch (error) {
        console.error('TTS error:', error);
        res.status(500).json({ error: 'Text-to-speech failed' });
    }
}
async function handleTranscriptionRequest(req, res) {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'Audio file is required' });
            return;
        }
        const formData = new form_data_1.default();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'audio.webm',
            contentType: req.file.mimetype || 'audio/webm'
        });
        formData.append('model', 'whisper-1');
        formData.append('language', 'en');
        const response = await (0, node_fetch_1.default)('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                ...formData.getHeaders()
            },
            body: formData
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI Whisper API error: ${response.status} - ${errorText}`);
        }
        const result = await response.json();
        res.json({ text: result.text });
    }
    catch (error) {
        console.error('Transcription error:', error);
        res.status(500).json({ error: 'Transcription failed' });
    }
}
async function handleChat(req, res) {
    try {
        const { message, userId = 1, stylePrompt } = req.body;
        if (!message) {
            res.status(400).json({ error: 'message required' });
            return;
        }
        let bot = await storage_1.storage.getBotByUserId(userId);
        if (!bot) {
            bot = await storage_1.storage.createBot({ userId, name: "Reflect" });
        }
        if (!bot)
            throw new Error("Bot could not be created or fetched.");
        await storage_1.storage.createMessage({ botId: bot.id, sender: 'user', text: message });
        const aiResponse = await generateResponse(message, bot.id, userId, stylePrompt);
        await storage_1.storage.createMessage({ botId: bot.id, sender: 'bot', text: aiResponse });
        const keywords = extractKeywords(message);
        for (const word of keywords) {
            await storage_1.storage.createOrUpdateWord({ botId: bot.id, word, context: message });
        }
        const learnedWords = await storage_1.storage.getLearnedWords(bot.id);
        const stage = getStageFromWordCount(learnedWords.length);
        await storage_1.storage.updateBot(bot.id, {
            wordsLearned: learnedWords.length,
            level: stage === 'Infant' ? 1 : stage === 'Toddler' ? 2 : stage === 'Child' ? 3 : stage === 'Adolescent' ? 4 : 5
        });
        res.json({ response: aiResponse, stage, wordsLearned: learnedWords.length });
    }
    catch (error) {
        console.error("Error in /api/chat:", error);
        res.status(500).json({ error: 'Failed to process chat message' });
    }
}
async function handleStats(req, res) {
    try {
        const userId = parseInt(req.query.userId) || 1;
        let bot = await storage_1.storage.getBotByUserId(userId);
        if (!bot) {
            bot = await storage_1.storage.createBot({ userId, name: "Reflect" });
        }
        if (!bot)
            throw new Error("Bot could not be created or fetched.");
        const learnedWords = await storage_1.storage.getLearnedWords(bot.id);
        const stage = getStageFromWordCount(learnedWords.length);
        res.json({ stage, wordCount: learnedWords.length, level: stage === 'Infant' ? 1 : stage === 'Toddler' ? 2 : stage === 'Child' ? 3 : stage === 'Adolescent' ? 4 : 5 });
    }
    catch (error) {
        console.error("Error in /api/stats:", error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
}
async function handleUserSwitch(req, res) {
    try {
        const { name } = req.body;
        if (!name) {
            res.status(400).json({ error: 'name required' });
            return;
        }
        const user = await storage_1.storage.createUser({ username: name, email: `${name.toLowerCase()}@temp.com` });
        res.json({ userId: user.id });
    }
    catch (error) {
        console.error("Error switching user:", error);
        res.status(500).json({ error: 'Failed to switch user' });
    }
}
function registerRoutes(app) {
    (0, reflect_1.registerReflectRoutes)(app);
    app.get('/api/test', (req, res) => {
        res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
    });
    app.post('/api/chat', handleChat);
    app.get('/api/stats', handleStats);
    app.post('/api/user/switch', handleUserSwitch);
    app.post('/api/tts', handleTTSRequest);
    app.post('/api/text-to-speech', handleTTSRequest);
    app.post('/api/transcribe', upload.single('audio'), handleTranscriptionRequest);
}
