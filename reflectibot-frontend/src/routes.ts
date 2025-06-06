import type { Express, Request, Response } from "express";
import multer from 'multer';
import { storage } from "./storage.js";
import { OpenAI } from "openai";
import { getReflectibotPrompt } from './utils/promptUtils.js';
import { analyzeUserMessage } from './utils/personalityUtils.js';
import updateUserStyleAndGetPrompt from './userStyleService.js';

// Polyfills for fetch, FormData, and Blob in Node.js
import fetch, { Blob } from 'node-fetch';
import FormData from 'form-data';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Learning stage tracker
function getStageFromWordCount(wordCount: number): string {
  if (wordCount < 10) return "Infant";
  if (wordCount < 25) return "Toddler";
  if (wordCount < 50) return "Child";
  if (wordCount < 100) return "Adolescent";
  return "Adult";
}

function extractKeywords(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 10);
}

// Generate AI response
async function generateResponse(userMessage: string, botId: number, userId: number, stylePrompt?: string): Promise<string> {
  try {
    const memories = await storage.getUserMemories(userId);
    const facts = await storage.getUserFacts(userId);
    const learnedWords = await storage.getLearnedWords(botId);
    const personality = analyzeUserMessage(userMessage);
    const stage = getStageFromWordCount(learnedWords.length);

    const systemPrompt = getReflectibotPrompt({
      factContext: facts.map(f => f.fact).join('\n'),
      memoryContext: memories.map(m => m.memory).join('\n'),
      stage,
      learnedWordCount: learnedWords.length,
      personality: personality?.tone ? { tone: personality.tone } : { tone: "neutral" }
    });

    const promptWithStyle = `${stylePrompt || ''}\n\n${systemPrompt}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: promptWithStyle },
        { role: "user", content: userMessage }
      ],
      max_tokens: 150,
    });

  return response.choices[0].message?.content || "Sorry, I'm not sure how to respond.";
} catch (error) {
  console.error("Error generating AI response:", error);
  return "I'm having trouble generating a response right now.";
}
}


export function registerRoutes(app: Express): void {
  // Simple test endpoint
  app.get('/api/test', (req: Request, res: Response) => {
    res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
  });

  // Test OpenAI connection
  app.get('/api/test-openai', async (req: Request, res: Response) => {
    try {
      console.log('Testing OpenAI connection...');
      console.log('API Key present:', !!process.env.OPENAI_API_KEY);
      console.log('API Key format:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
      console.log('Analyzing style profile...');

      const userId = parseInt(req.query.userId as string) || 1; // Default userId to 1 if not provided
      const { message } = req.query;
      const stylePrompt = await updateUserStyleAndGetPrompt(userId.toString());
      
      // Test with a simple completion
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Say hello" }],
        max_tokens: 10
      });
      
      res.json({ 
        success: true, 
        message: 'OpenAI connection working',
        response: response.choices[0].message?.content 
      });
    } catch (error) {
      console.error('OpenAI test error:', error);
      res.status(500).json({ 
        error: 'OpenAI test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Setup endpoint to create database tables
  app.get('/api/setup', async (req: Request, res: Response) => {
    try {
      console.log('Creating database tables...');
      
      // Create users table
      await storage.setupTables();
      
      res.json({ 
        message: 'Database tables created successfully!',
        status: 'ready'
      });
    } catch (error) {
      console.error('Setup error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ 
        error: 'Failed to create tables',
        details: errorMessage
      });
    }
  });

  // Chat endpoint
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      console.log('Chat request received:', req.body);
      const { message, userId = 1, stylePrompt } = req.body;

      if (!message) {
        res.status(400).json({ error: 'message required' });
        return;
      }

      console.log('Getting bot for userId:', userId);
      // Get or create bot
      let bot = await storage.getBotByUserId(userId);
      if (!bot) {
        console.log('Creating new bot for userId:', userId);
        bot = await storage.createBot({
          userId,
          name: "Reflect"
        });
      }
      console.log('Bot found/created:', bot.id);

      // Store user message
      console.log('Storing user message...');
      await storage.createMessage({
        botId: bot.id,
        sender: 'user',
        text: message
      });

      // Generate AI response
      console.log('Generating AI response...');
      const aiResponse = await generateResponse(message, bot.id, userId, stylePrompt);
      console.log('AI response generated:', aiResponse);

      // Store bot response
      console.log('Storing bot response...');
      await storage.createMessage({
        botId: bot.id,
        sender: 'bot',
        text: aiResponse
      });

      // Learn words from user message
      console.log('Learning words...');
      const keywords = extractKeywords(message);
      for (const word of keywords) {
        await storage.createOrUpdateWord({
          botId: bot.id,
          word: word,
          context: message
        });
      }

      // Update bot stats
      console.log('Updating bot stats...');
      const learnedWords = await storage.getLearnedWords(bot.id);
      const stage = getStageFromWordCount(learnedWords.length);
      
      await storage.updateBot(bot.id, {
        wordsLearned: learnedWords.length,
        level: stage === 'Infant' ? 1 : stage === 'Toddler' ? 2 : stage === 'Child' ? 3 : stage === 'Adolescent' ? 4 : 5
      });

      console.log('Chat completed successfully');
      res.json({
        response: aiResponse,
        stage: stage,
        wordsLearned: learnedWords.length
      });

    } catch (error) {
      console.error("Detailed error in /api/chat endpoint:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ 
        error: 'Failed to process chat message',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  });

  // Stats endpoint
  app.get('/api/stats', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string) || 1;
      
      let bot = await storage.getBotByUserId(userId);
      if (!bot) {
        bot = await storage.createBot({
          userId,
          name: "Reflect"
        });
      }

      const learnedWords = await storage.getLearnedWords(bot.id);
      const stage = getStageFromWordCount(learnedWords.length);

      res.json({
        stage: stage,
        wordCount: learnedWords.length,
        level: stage === 'Infant' ? 1 : stage === 'Toddler' ? 2 : stage === 'Child' ? 3 : stage === 'Adolescent' ? 4 : 5
      });

    } catch (error) {
      console.error("Error in /api/stats endpoint:", error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  // Memory endpoints
  app.get('/api/memories/:userId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const memories = await storage.getUserMemories(userId);
      res.json(memories);
    } catch (error) {
      console.error("Error getting memories:", error);
      res.status(500).json({ error: 'Failed to get memories' });
    }
  });

  app.get('/api/facts/:userId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const facts = await storage.getUserFacts(userId);
      res.json(facts);
    } catch (error) {
      console.error("Error getting facts:", error);
      res.status(500).json({ error: 'Failed to get facts' });
    }
  });

  // User switch endpoint
  app.post('/api/user/switch', async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: 'name required' });
        return;
      }

      // Create new user
      const user = await storage.createUser({
        username: name,
        email: `${name.toLowerCase()}@temp.com`
      });

      res.json({ userId: user.id });
    } catch (error) {
      console.error("Error switching user:", error);
      res.status(500).json({ error: 'Failed to switch user' });
    }
  });

  // ElevenLabs Text-to-Speech endpoint
  app.post('/api/tts', async (req: Request, res: Response) => {
    try {
      const { text, voiceId = 'iCrDUkL56s3C8sCRl7wb' } = req.body; // Default to Hope voice
      
      if (!text) {
        res.status(400).json({ error: 'Text is required' });
        return;
      }

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString()
      });
      
      res.send(Buffer.from(audioBuffer));

    } catch (error) {
      console.error('TTS error:', error);
      res.status(500).json({ error: 'Text-to-speech failed' });
    }
  });

  // Text-to-speech alias endpoint (for backward compatibility)
  app.post('/api/text-to-speech', async (req: Request, res: Response) => {
    // Redirect to the main TTS endpoint
    req.url = '/api/tts';
    app._router.handle(req, res);
  });

  // OpenAI Whisper transcription endpoint
  app.post('/api/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
    try {
      console.log('Transcription request received');
      
      if (!req.file) {
        console.log('No audio file received');
        res.status(400).json({ error: 'Audio file is required' });
        return;
      }

      console.log('Audio file received:', {
        originalname: req.file.originalname,
      });

      // Create form data for OpenAI API
      const formData = new FormData();
      
      // Append buffer directly as file to form data
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname || 'audio.webm',
        contentType: req.file.mimetype || 'audio/webm'
      });
      formData.append('model', 'whisper-1');
      formData.append('language', 'en'); // Optional: specify language

      console.log('Sending request to OpenAI Whisper API...');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders()
        },
        body: formData
      });

      console.log('OpenAI API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error response:', errorText);
        throw new Error(`OpenAI Whisper API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as { text: string };
      console.log('Transcription successful:', result.text);
      
      res.json({ text: result.text });

    } catch (error) {
      console.error('Transcription error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown transcription error';
      res.status(500).json({ 
        error: 'Transcription failed',
        details: errorMessage
      });
    }
  });
}