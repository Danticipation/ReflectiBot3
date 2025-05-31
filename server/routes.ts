import type { Express, Request, Response, NextFunction } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { storage } from "./storage.js";
import { OpenAI } from "openai";
import { detectIntent, generateResponseStrategy, type ConversationContext } from "./intentInference.js";
import { analyzeMemoryImportance, type MemoryAnalysis } from "./memoryImportance.js";
import { extractTimeContext, generateTimeBasedContext, shouldPrioritizeMemory } from "./timestampLabeling.js";
import { selectVoiceForMood, getVoiceSettings } from "./dynamicVoice.js";
import { generateLoopbackSummary, formatSummaryForDisplay, type SummaryContext } from "./loopbackSummary.js";
import { setupVite } from "./vite.js";
import { baseVoices } from "./voiceConfig.js"; // Ensure .js extension for TS targeting ESModules

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

function getStageFromWordCount(wordCount: number): string {
  if (wordCount < 10) return "Infant";
  if (wordCount < 25) return "Toddler";
  if (wordCount < 50) return "Child";
  if (wordCount < 100) return "Adolescent";
  return "Adult";
}

function getNextStageThreshold(wordCount: number): number {
  if (wordCount < 10) return 10;
  if (wordCount < 25) return 25;
  if (wordCount < 50) return 50;
  if (wordCount < 100) return 100;
  return 1000;
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([...]); // (Truncated to keep light - assume original list)
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10);
}

function extractFacts(message: string): string[] {
  const patterns = [
    /i am (a |an |the )?([^.!?]+)/gi,
    /i work (as |at |in |for )?([^.!?]+)/gi,
    /i live (in |at |near )?([^.!?]+)/gi,
    /i like ([^.!?]+)/gi,
    /i don't like ([^.!?]+)/gi,
    /my ([^.!?]+)/gi,
    /i have ([^.!?]+)/gi
  ];
  const facts: string[] = [];
  for (const pattern of patterns) {
    for (const match of message.matchAll(pattern)) {
      if (match[0] && match[0].trim().length > 5) {
        facts.push(match[0].trim());
      }
    }
  }
  return facts.slice(0, 3);
}

async function generateResponse(userMessage: string, botId: number, userId: number): Promise<string> {
  try {
    const memories = await storage.getUserMemories(userId);
    const facts = await storage.getUserFacts(userId);
    const learnedWords = await storage.getLearnedWords(botId);
    const recentMessages = await storage.getMessages(botId);
    const stage = getStageFromWordCount(learnedWords.length);
    const timeContext = extractTimeContext(userMessage);
    const timeBasedContext = generateTimeBasedContext(timeContext);

    const conversationContext: ConversationContext = {
      recentMessages: recentMessages.map(m => m.text),
      userFacts: facts.map(f => f.fact),
      currentMood: "neutral",
      stage
    };

    const intent = detectIntent(userMessage, conversationContext);
    const responseStrategy = generateResponseStrategy(intent, conversationContext);

    const memoryAnalysis = analyzeMemoryImportance(userMessage, {
      isFirstMention: !facts.some(f => f.fact.toLowerCase().includes(userMessage.toLowerCase().split(' ')[0])),
      containsPersonalInfo: /\b(my|i am|i work|i live|i like)\b/i.test(userMessage),
      emotionalContext: intent.type,
      userInitiated: true
    });

    const memoryContext = memories.slice(-10).map(m => m.memory).join('\n');
    const factContext = facts.map(f => f.fact).join('\n');
    const conversationHistoryContext = recentMessages.slice(-6).map(m => `${m.sender}: ${m.text}`).join('\n');

    const systemPrompt = `...`; // unchanged

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      max_tokens: 150,
      temperature: 0.8
    });

    return response.choices[0].message.content || "I'm learning to respond better.";
  } catch (error) {
    console.error('AI response error:', error);
    return "I'm still learning how to respond. Please continue talking with me.";
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  let httpServer: Server;
  try {
    httpServer = createServer(app);

    // WebSocket for real-time updates
    const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    // Get bot info with learning progress
    // Get bot by ID with stats
    app.get('/api/bot/:id', async (req: Request, res: Response) => {
      // ... (keep existing route handler code)
    });

    // Generate AI response and update conversation
    app.post('/api/chat', async (req: Request, res: Response) => {
      // ... (keep existing route handler code)
    });

    // Text-to-Speech (TTS) API
    app.post('/api/tts', async (req: Request, res: Response) => {
      // ... (keep existing route handler code)
    });

    // Get conversation messages for a bot
    app.get('/api/messages/:botId', async (req, res) => {
      // ... (keep existing route handler code)
    });

    // Dashboard memory stats
    app.get('/api/stats', async (req: Request, res: Response) => {
      // ... (keep existing route handler code)
    });

    // Unified memory list
    app.get('/api/memory/list', async (req: Request, res: Response) => {
      // ... (keep existing route handler code)
    });

    // Weekly reflection summary endpoint
    app.get('/api/weekly-summary', async (req: Request, res: Response) => {
      // ... (keep existing route handler code)
    });

    // Mood analysis endpoint for contextual UI theming
    app.get('/api/mood-analysis', async (req: Request, res: Response) => {
      // ... (keep existing route handler code)
    });

    // Whisper API transcription endpoint
    app.post('/api/transcribe', async (req, res) => {
      // ... (keep existing route handler code)
    });

    // Set up Vite dev server to serve frontend (React, etc.)
    await setupVite(app, httpServer);

    wss.on('connection', (ws: WebSocket) => {
      console.log('WebSocket client connected');

      ws.addEventListener('message', async (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data.toString());
          if (message.type === 'chat') {
            wss.clients.forEach((client: WebSocket) => {
              if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({
                  type: 'message',
                  data: message.data
                }));
              }
            });
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });
    });

  } catch (error) {
    console.error('Error initializing server:', error);
    throw error;
  } finally {
    console.log('Server initialization attempt completed.');
  }

  if (!httpServer) {
    throw new Error('Failed to initialize server.');
  }

  // Save memory or fact
  app.post('/api/memory/save', async (req: Request, res: Response) => {
    const { userId, text, type } = req.body;
    try {
      if (!userId || !text) {
        return res.status(400).json({ error: 'userId and text required' });
      }

      if (type === 'fact') {
        const fact = await storage.createUserFact({
          userId,
          fact: text,
          category: 'user_input',
          confidence: 'high'
        });
        return res.json({ success: true, fact });
      }

      const memory = await storage.createUserMemory({
        userId,
        memory: text,
        category: 'conversation',
        importance: 'medium'
      });
      return res.json({ success: true, memory });

    } catch (error) {
      console.error('Memory save error:', error);
      res.status(500).json({ error: 'Failed to save memory' });
    }
  });

  // Get memories and facts
  app.get('/api/memory/get/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const memories = await storage.getUserMemories(userId);
      const facts = await storage.getUserFacts(userId);
      res.json({ memories, facts });
    } catch (error) {
      console.error('Memory get error:', error);
      res.status(500).json({ error: 'Failed to retrieve memories' });
    }
  });

  // Create or retrieve bot
  app.post('/api/bot', async (req, res) => {
    try {
      const { userId = 1 } = req.body;

      let bot = await storage.getBotByUserId(userId);
      if (!bot) {
        bot = await storage.createBot({
          userId,
          name: "Reflectibot",
          level: 1,
          wordsLearned: 0,
          personalityTraits: { curiosity: 5, empathy: 3, playfulness: 4 }
        });
      }

      res.json(bot);
    } catch (error) {
      console.error('Bot creation error:', error);
      res.status(500).json({ error: 'Failed to create bot' });
    }
  });

  return httpServer;
}

  // Get bot info with learning progress
  // Get bot info with learning progress

  // Get bot by ID with stats
app.get('/api/bot/:id', async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    const bot = await storage.getBot(botId);

    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    const learnedWords = await storage.getLearnedWords(botId);
    const memories = await storage.getUserMemories(bot.userId);
    const facts = await storage.getUserFacts(bot.userId);

    res.json({
      ...bot,
      stage: getStageFromWordCount(learnedWords.length),
      wordsLearned: learnedWords.length,
      memoriesStored: memories.length,
      factsKnown: facts.length
    });
  } catch (error) {
    console.error('Bot get error:', error);
    res.status(500).json({ error: 'Failed to get bot' });
  }
});

// Generate AI response and update conversation
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, userId = 1 } = req.body;

    const bot = await storage.getBotByUserId(userId);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    const response = await generateResponse(message, bot.id, bot.userId);

    await storage.createMessage({ botId: bot.id, sender: 'user', text: message });
    await storage.createMessage({ botId: bot.id, sender: 'bot', text: response });

    const updatedWords = await storage.getLearnedWords(bot.id);
    await storage.updateBot(bot.id, { wordsLearned: updatedWords.length });

    res.json({
      response,
      stage: getStageFromWordCount(updatedWords.length),
      wordsLearned: updatedWords.length,
      newWordsThisMessage: [] // Already handled in previous chunk
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat' });
  }
});

// Text-to-Speech (TTS) API
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(400).json({ error: 'ElevenLabs API key not configured' });
    }

    const { ElevenLabs } = await import("elevenlabs");
    const elevenlabs = ElevenLabs({ apiKey: process.env.ELEVENLABS_API_KEY });

    const audioStream = await elevenlabs.generate({
      voice: "Rachel",
      text,
      model_id: "eleven_monolingual_v1"
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    audioStream.pipe(res);
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

// Get conversation messages for a bot
app.get('/api/messages/:botId', async (req, res) => {
  try {
    const botId = parseInt(req.params.botId);
    if (Number.isNaN(botId)) return res.status(400).json({ error: 'Invalid botId' });

    const messages = await storage.getMessages(botId);
    res.json(messages);
  } catch (error) {
    console.error('Messages get error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Dashboard memory stats
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.query.userId as string);
    if (Number.isNaN(userId)) return res.status(400).json({ error: 'Missing or invalid userId' });

    const [memories, facts, bot] = await Promise.all([
      storage.getUserMemories(userId),
      storage.getUserFacts(userId),
      storage.getBotByUserId(userId)
    ]);

    const wordCount = bot ? bot.wordsLearned : 0;
    const factCount = facts.length;
    const memoryCount = memories.length;
    const stage = getStageFromWordCount(wordCount);

    res.json({
      wordCount,
      factCount,
      memoryCount,
      stage,
      nextStageAt: getNextStageThreshold(wordCount)
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Unified memory list
app.get('/api/memory/list', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.query.userId as string);
    const type = req.query.type as string | undefined;

    if (Number.isNaN(userId)) return res.status(400).json({ error: 'Missing or invalid userId' });

    if (type === 'fact') {
      const facts = await storage.getUserFacts(userId);
      return res.json(facts.map(f => ({
        id: f.id,
        memory: f.fact,
        type: 'fact',
        createdAt: f.createdAt
      })));
    }

    if (type === 'memory') {
      const memories = await storage.getUserMemories(userId);
      return res.json(memories.map(m => ({
        id: m.id,
        memory: m.memory,
        type: 'memory',
        createdAt: m.createdAt
      })));
    }

    const [memories, facts] = await Promise.all([
      storage.getUserMemories(userId),
      storage.getUserFacts(userId)
    ]);

    const combined = [
      ...memories.map(m => ({ id: m.id, memory: m.memory, type: 'memory', createdAt: m.createdAt })),
      ...facts.map(f => ({ id: f.id, memory: f.fact, type: 'fact', createdAt: f.createdAt }))
    ];

    res.json(combined);
  } catch (error) {
    console.error('Error getting memory list:', error);
    res.status(500).json({ error: 'Failed to get memory list' });
  }
});


  // Weekly reflection summary endpoint
app.get('/api/weekly-summary', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.query.userId as string);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: 'Missing or invalid userId' });
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [memories, facts, bot] = await Promise.all([
      storage.getUserMemories(userId),
      storage.getUserFacts(userId),
      storage.getBotByUserId(userId)
    ]);

    const recentMemories = memories.filter(m => new Date(m.createdAt) >= oneWeekAgo);
    const recentFacts = facts.filter(f => new Date(f.createdAt) >= oneWeekAgo);

    if (recentMemories.length === 0 && recentFacts.length === 0) {
      return res.json({
        summary: "You haven't shared much with me this week yet. I'm here whenever you want to talk about your thoughts, experiences, or anything on your mind.",
        insights: [],
        growthMetrics: {
          newMemories: 0,
          newFacts: 0,
          currentStage: bot ? getStageFromWordCount(bot.wordsLearned) : 'Infant'
        }
      });
    }

    const conversationContext = recentMemories.map(m => m.memory).join('\n');
    const personalFacts = recentFacts.map(f => f.fact).join('\n');

    const prompt = `As Reflectibot, an empathetic AI companion that learns and grows with users, please provide a warm, insightful weekly reflection based on our recent conversations.

Recent conversations:
${conversationContext}

New things I learned about you:
${personalFacts}

Please provide:
1. A compassionate summary of key themes and patterns from this week
2. Insights about your growth, challenges, or recurring topics
3. Encouraging observations about positive changes or strengths I notice
4. Gentle questions or reflections that might help you think deeper

Keep the tone warm, supportive, and personal - like a caring friend who has been listening carefully. Avoid being clinical or overly analytical. Focus on the human experience and emotional journey.

Response format: A flowing, conversational reflection (2-3 paragraphs max).`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are Reflectibot, a compassionate AI companion that provides thoughtful, empathetic weekly reflections. Your tone is warm, supportive, and personally engaging."
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const summary = completion.choices[0].message.content;

    const insights: string[] = [];
    if (recentMemories.length > 5) {
      insights.push("You've been quite reflective this week - I love our deep conversations!");
    }
    if (recentFacts.length > 3) {
      insights.push("I'm learning so much about who you are. Thank you for sharing!");
    }

    res.json({
      summary,
      insights,
      growthMetrics: {
        newMemories: recentMemories.length,
        newFacts: recentFacts.length,
        totalMemories: memories.length,
        totalFacts: facts.length,
        currentStage: bot ? getStageFromWordCount(bot.wordsLearned) : 'Infant',
        wordsLearned: bot ? bot.wordsLearned : 0
      }
    });
  } catch (error) {
    console.error('Error generating weekly summary:', error);
    res.status(500).json({ error: 'Failed to generate weekly summary' });
  }
});

// Mood analysis endpoint for contextual UI theming
app.get('/api/mood-analysis', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.query.userId as string);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: 'Missing or invalid userId' });
    }

    const [memories, facts, bot] = await Promise.all([
      storage.getUserMemories(userId),
      storage.getUserFacts(userId),
      storage.getBotByUserId(userId)
    ]);

    const currentStage = bot ? getStageFromWordCount(bot.wordsLearned) : 'Infant';

    if (memories.length === 0) {
      return res.json({
        mood: 'neutral',
        primaryColor: '#1f2937',
        accentColor: '#10b981',
        textColor: '#ffffff',
        stage: currentStage
      });
    }

    const recentMemories = memories.slice(-10);
    const conversationText = recentMemories.map(m => m.memory).join('\n');

    const prompt = `Analyze the emotional tone and mood from these user conversations and provide appropriate UI colors. Consider both the content and the developmental stage.

Recent conversations:
${conversationText}

Current developmental stage: ${currentStage}

Based on the emotional tone, conversational patterns, and developmental stage, provide:
1. Primary mood (e.g., calm, excited, reflective, anxious, happy, contemplative)
2. Primary background color (hex code)
3. Accent color for highlights and buttons (hex code)
4. Text color (hex code)

Guidelines:
- Calm/peaceful: Deep blues, soft grays
- Excited/happy: Warm oranges, bright greens
- Reflective/contemplative: Purple tones, muted colors
- Anxious/stressed: Softer, muted tones
- Early stages (Infant/Toddler): Warmer, gentler colors
- Advanced stages (Adult): More sophisticated, deeper tones

Respond in JSON format: {"mood": "mood_name", "primaryColor": "#hex", "accentColor": "#hex", "textColor": "#hex"}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a mood and color analyst that provides JSON responses for UI theming based on conversation analysis."
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    const moodData = JSON.parse(completion.choices[0].message.content || '{}');

    res.json({
      mood: moodData.mood || 'neutral',
      primaryColor: moodData.primaryColor || '#1f2937',
      accentColor: moodData.accentColor || '#10b981',
      textColor: moodData.textColor || '#ffffff',
      stage: currentStage
    });
  } catch (error) {
    console.error('Error analyzing mood:', error);
    res.json({
      mood: 'neutral',
      primaryColor: '#1f2937',
      accentColor: '#10b981',
      textColor: '#ffffff',
      stage: 'Infant'
    });
  }
});


  // Whisper API transcription endpoint
import type { Request as ExpressRequest } from "express";
type MulterFile = Express.Multer.File;

app.post('/api/transcribe', async (req, res) => {
  try {
    const multer = (await import('multer')).default;
    const upload = multer({ storage: multer.memoryStorage() });

    upload.single('audio')(req, res, async (err: any) => {
      if (err) {
        return res.status(400).json({ error: 'File upload error' });
      }

      const file = (req as ExpressRequest & { file?: MulterFile }).file;
      const userId = req.body.userId;

      if (!file || !userId) {
        return res.status(400).json({ error: 'Missing audio file or userId' });
      }

      try {
        // Use Node's 'fs' and 'form-data' for file streaming instead of File()
        const { Readable } = await import('stream');
        const FormData = (await import('form-data')).default;

        const formData = new FormData();
        const stream = Readable.from(file.buffer);
        formData.append('file', stream, {
          filename: 'recording.webm',
          contentType: file.mimetype
        });
        formData.append('model', 'whisper-1');
        formData.append('response_format', 'json');
        formData.append('language', 'en');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            ...formData.getHeaders()
          },
          body: formData as any
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('Whisper API error:', data);
          return res.status(500).json({ error: 'Whisper API failed', details: data });
        }

        const transcribedText = data.text;

        await storage.createUserMemory({
          userId: parseInt(userId),
          memory: transcribedText,
          category: 'voice_input',
          importance: 'medium'
        });

        res.json({ text: transcribedText, success: true });

      } catch (transcriptionError) {
        console.error('Whisper transcription error:', transcriptionError);
        res.status(500).json({ error: 'Transcription failed', message: 'Could not process audio with Whisper API' });
      }
    });

  } catch (error) {
    console.error('Transcription endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

  // Set up Vite dev server to serve frontend (React, etc.)
  await setupVite(app, httpServer);

  return httpServer;
}
