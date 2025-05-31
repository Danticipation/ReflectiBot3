import type { Express, Request, Response, NextFunction } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { storage } from "./storage.js";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ElevenLabs helper function
async function getElevenLabsClient() {
  const { ElevenLabs } = await import("elevenlabs");
  return ElevenLabs({
    apiKey: process.env.ELEVENLABS_API_KEY
  });
}

// Learning stage tracker
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

// Extract meaningful words from text
function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those']);
  
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10);
}

// Extract facts from user messages
function extractFacts(message: string): string[] {
  const facts = [];
  const patterns = [
    /i am (a |an |the )?([^.!?]+)/gi,
    /i work (as |at |in |for )?([^.!?]+)/gi,
    /i live (in |at |near )?([^.!?]+)/gi,
    /i like ([^.!?]+)/gi,
    /i don't like ([^.!?]+)/gi,
    /my ([^.!?]+)/gi,
    /i have ([^.!?]+)/gi
  ];
  
  for (const pattern of patterns) {
    const matches = [...message.matchAll(pattern)];
    for (const match of matches) {
      if (match[0] && match[0].trim().length > 5) {
        facts.push(match[0].trim());
      }
    }
  }
  
  return facts.slice(0, 3);
}

// Generate AI response with memory context
async function generateResponse(userMessage: string, botId: number, userId: number): Promise<string> {
  try {
    // Get stored memories and facts
    const memories = await storage.getUserMemories(userId);
    const facts = await storage.getUserFacts(userId);
    const learnedWords = await storage.getLearnedWords(botId);
    const recentMessages = await storage.getMessages(botId);
    
    // Determine learning stage
    const stage = getStageFromWordCount(learnedWords.length);
    
    // Build enhanced context for AI
    const memoryContext = memories.slice(-10).map(m => m.memory).join('\n');
    const factContext = facts.map(f => f.fact).join('\n');
    const conversationHistoryContext = recentMessages.slice(-6).map(m => `${m.sender}: ${m.text}`).join('\n');
    
    const systemPrompt = `You are Reflectibot, an AI companion in the "${stage}" learning stage. You learn and grow through conversations.

Your current knowledge:
Facts about user: ${factContext || 'None yet'}
Recent memories: ${memoryContext || 'None yet'}
Recent conversation: ${conversationHistoryContext || 'This is the start'}
Words learned: ${learnedWords.length}

Stage behaviors:
- Infant: Simple responses, repeat words, curious sounds
- Toddler: Basic sentences, ask simple questions
- Child: More complex thoughts, reference past conversations
- Adolescent: Nuanced responses, emotional awareness
- Adult: Sophisticated dialogue, deep connections to memories

Respond naturally according to your developmental stage. Show emotional intelligence and contextual awareness.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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

    wss.on('connection', (ws: WebSocket) => {
      console.log('WebSocket client connected');
      
      ws.addEventListener('message', async (event) => {
        const data = event.data;
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'chat') {
            // Broadcast to all clients for real-time updates
            wss.clients.forEach((client) => {
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

    // Memory API - Save new facts
    app.post('/api/memory/save', async (req: Request, res: Response) => {
      const { userId, text, type } = req.body;
      try {
        if (!userId || !text) {
          res.status(400).json({ error: 'userId and text required' });
          return;
        }

        if (type === 'fact') {
          const fact = await storage.createUserFact({
            userId,
            fact: text,
            category: 'user_input',
            confidence: 'high'
          });
          res.json({ success: true, fact });
        } else {
          const memory = await storage.createUserMemory({
            userId,
            memory: text,
            category: 'conversation',
            importance: 'medium'
          });
          res.json({ success: true, memory });
        }
      } catch (error) {
        console.error('Memory save error:', error);
        res.status(500).json({ error: 'Failed to save memory' });
      }
    });

    // Memory API - Get facts by user ID
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

    // Create or get bot
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

    // Get bot info with learning progress
    app.get('/api/bot/:id', async (req: Request, res: Response) => {
      try {
        const botId = parseInt(req.params.id);
        const bot = await storage.getBot(botId);
        
        if (!bot) {
          res.status(404).json({ error: 'Bot not found' });
          return;
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

    // Chat endpoint
    app.post('/api/chat', async (req: Request<ParamsDictionary, any, { message: string; userId?: number }, Record<string, any>>, res: Response): Promise<void> => {
      try {
        const { message, userId = 1 } = req.body;
        
        if (!message) {
          res.status(400).json({ error: 'message required' });
          return;
        }

        // Handle voice commands
        const lowerMessage = message.toLowerCase().trim();
        if (lowerMessage === 'list voices') {
          res.json({
            response: "Available voices:\n• Hope - Warm American female\n• Ophelia - Calm British female\n• Adam - Laid-back British male\n• Dan - Smooth American male\n\nType 'set voice [name]' to change my voice."
          });
          return;
        }
        
        if (lowerMessage.startsWith('set voice ')) {
          const voiceName = lowerMessage.replace('set voice ', '');
          // Simplified voice handling - you can expand this
          const voices = ['hope', 'ophelia', 'adam', 'dan'];
          
          if (voices.includes(voiceName)) {
            await storage.createUserFact({
              userId,
              fact: `User prefers voice: ${voiceName}`,
              category: 'voice_preference',
              confidence: 'high'
            });
            
            res.json({
              response: `Voice changed to ${voiceName}. This will apply to my future responses.`
            });
            return;
          } else {
            res.json({
              response: "Voice not found. Available voices: Hope, Ophelia, Adam, Dan"
            });
            return;
          }
        }

        const bot = await storage.getBotByUserId(userId);
        if (!bot) {
          res.status(404).json({ error: 'Bot not found' });
          return;
        }

        // Extract and store new learning
        const keywords = extractKeywords(message);
        const facts = extractFacts(message);
        
        // Store memories
        await storage.createUserMemory({
          userId: bot.userId,
          memory: message,
          category: 'conversation',
          importance: 'medium'
        });
        
        // Store facts
        for (const fact of facts) {
          await storage.createUserFact({
            userId: bot.userId,
            fact,
            category: 'extracted',
            confidence: 'medium'
          });
        }
        
        // Learn new words
        const learnedWords = await storage.getLearnedWords(bot.id);
        const existingWords = learnedWords.map(w => w.word);
        
        for (const word of keywords) {
          if (!existingWords.includes(word)) {
            await storage.createOrUpdateWord({
              botId: bot.id,
              word,
              frequency: 1,
              context: message.substring(0, 200)
            });
          }
        }

        // Generate AI response
        const response = await generateResponse(message, bot.id, bot.userId);
        
        // Save conversation
        await storage.createMessage({ botId: bot.id, sender: 'user', text: message });
        await storage.createMessage({ botId: bot.id, sender: 'bot', text: response });
        
        // Update bot stats
        const updatedWords = await storage.getLearnedWords(bot.id);
        await storage.updateBot(bot.id, { wordsLearned: updatedWords.length });
        
        res.json({
          response,
          stage: getStageFromWordCount(updatedWords.length),
          wordsLearned: updatedWords.length,
          newWordsThisMessage: keywords.filter(w => !existingWords.includes(w))
        });
        
      } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process chat' });
      }
    });

    // Text-to-Speech API
    app.post('/api/tts', async (req: Request, res: Response) => {
      try {
        const { text } = req.body;
        
        if (!text) {
          res.status(400).json({ error: 'text required' });
          return;
        }

        if (!process.env.ELEVENLABS_API_KEY) {
          res.status(400).json({ error: 'ElevenLabs API key not configured' });
          return;
        }

        const elevenlabs = await getElevenLabsClient();

        const audioStream = await elevenlabs.generate({
          voice: "Rachel",
          text: text,
          model_id: "eleven_monolingual_v1"
        });

        res.setHeader('Content-Type', 'audio/mpeg');
        audioStream.pipe(res);
        
      } catch (error) {
        console.error('TTS error:', error);
        res.status(500).json({ error: 'Failed to generate speech' });
      }
    });

    // Get conversation history
    app.get('/api/messages/:botId', async (req, res) => {
      try {
        const botId = parseInt(req.params.botId);
        const messages = await storage.getMessages(botId);
        res.json(messages);
      } catch (error) {
        console.error('Messages get error:', error);
        res.status(500).json({ error: 'Failed to get messages' });
      }
    });

    // Get memory statistics for dashboard
    app.get('/api/stats', async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.query.userId as string);
        if (!userId) {
          res.status(400).json({ error: 'Missing userId' });
          return;
        }

        const memories = await storage.getUserMemories(userId);
        const facts = await storage.getUserFacts(userId);
        const bot = await storage.getBotByUserId(userId);
        
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

    // Get memory list by type
    app.get('/api/memory/list', async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.query.userId as string);
        const type = req.query.type as string | undefined;

        if (!userId) {
          res.status(400).json({ error: 'Missing userId' });
          return;
        }

        if (type === 'fact') {
          const facts = await storage.getUserFacts(userId);
          res.json(facts.map(f => ({
            id: f.id,
            memory: f.fact,
            type: 'fact',
            createdAt: f.createdAt
          })));
          return;
        } else if (type === 'memory') {
          const memories = await storage.getUserMemories(userId);
          res.json(memories.map(m => ({
            id: m.id,
            memory: m.memory,
            type: 'memory',
            createdAt: m.createdAt
          })));
          return;
        } else {
          const memories = await storage.getUserMemories(userId);
          const facts = await storage.getUserFacts(userId);
          const combined = [
            ...memories.map(m => ({ id: m.id, memory: m.memory, type: 'memory', createdAt: m.createdAt })),
            ...facts.map(f => ({ id: f.id, memory: f.fact, type: 'fact', createdAt: f.createdAt }))
          ];
          res.json(combined);
          return;
        }
      } catch (error) {
        console.error('Error getting memory list:', error);
        res.status(500).json({ error: 'Failed to get memory list' });
        return;
      }
    });

    // Weekly reflection summary endpoint
    app.get('/api/weekly-summary', async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = parseInt(req.query.userId as string);
        if (!userId) {
          res.status(400).json({ error: 'Missing userId' });
          return;
        }

        // Get recent memories and facts (last 7 days)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const memories = await storage.getUserMemories(userId);
        const facts = await storage.getUserFacts(userId);
        const bot = await storage.getBotByUserId(userId);

        // Filter recent data
        const recentMemories = memories.filter(m => new Date(m.createdAt) >= oneWeekAgo);
        const recentFacts = facts.filter(f => new Date(f.createdAt) >= oneWeekAgo);

        if (recentMemories.length === 0 && recentFacts.length === 0) {
          res.json({
            summary: "You haven't shared much with me this week yet. I'm here whenever you want to talk about your thoughts, experiences, or anything on your mind.",
            insights: [],
            growthMetrics: {
              newMemories: 0,
              newFacts: 0,
              currentStage: bot ? getStageFromWordCount(bot.wordsLearned) : 'Infant'
            }
          });
          return;
        }

        // Prepare context for AI summary
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
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        });

        const summary = completion.choices[0].message.content;

        // Generate simple insights
        const insights = [];
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
    app.get('/api/mood-analysis', async (req, res) => {
      try {
        const userId = parseInt(req.query.userId as string);
        if (!userId) {
          res.status(400).json({ error: 'Missing userId' });
          return;
        }

        const memories = await storage.getUserMemories(userId);
        const facts = await storage.getUserFacts(userId);
        const bot = await storage.getBotByUserId(userId);

        if (memories.length === 0) {
          res.json({
            mood: 'neutral',
            primaryColor: '#1f2937',
            accentColor: '#10b981',
            textColor: '#ffffff',
            stage: bot ? getStageFromWordCount(bot.wordsLearned) : 'Infant'
          });
          return;
        }

        // Get recent conversations for mood analysis
        const recentMemories = memories.slice(-10);
        const conversationText = recentMemories.map(m => m.memory).join('\n');
        const currentStage = bot ? getStageFromWordCount(bot.wordsLearned) : 'Infant';

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
            {
              role: "user",
              content: prompt
            }
          ],
          response_format: { type: "json_object" },
          max_tokens: 200,
          temperature: 0.3
        });

        const moodData = JSON.parse(completion.choices[0].message.content || '{}');
        
        // Fallback to defaults if parsing fails
        const response = {
          mood: moodData.mood || 'neutral',
          primaryColor: moodData.primaryColor || '#1f2937',
          accentColor: moodData.accentColor || '#10b981',
          textColor: moodData.textColor || '#ffffff',
          stage: currentStage
        };

        res.json(response);

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
    app.post('/api/transcribe', async (req: Request, res: Response) => {
      try {
        // Set up multer for handling file uploads
        const multer = (await import('multer')).default;
        const upload = multer({ storage: multer.memoryStorage() });
        
        // Handle the file upload
        upload.single('audio')(req, res, async (err: any) => {
          if (err) {
            return res.status(400).json({ error: 'File upload error' });
          }
    
          const file = (req as Request & { file?: Express.Multer.File }).file;
          const userId = req.body.userId;

          if (!file || !userId) {
            return res.status(400).json({ error: 'Missing audio file or userId' });
          }

          try {
            // Create a File object for OpenAI Whisper API
            const audioFile = new File([file.buffer], 'recording.webm', {
              type: file.mimetype
            });

            const transcription = await openai.audio.transcriptions.create({
              file: audioFile,
              model: 'whisper-1',
              response_format: 'json',
              language: 'en'
            });

            const transcribedText = transcription.text;

            // Store transcription as memory
            await storage.createUserMemory({
              userId: parseInt(userId),
              memory: transcribedText,
              category: 'voice_input',
              importance: 'medium'
            });

            res.json({ 
              text: transcribedText,
              success: true 
            });

          } catch (transcriptionError) {
            console.error('Whisper transcription error:', transcriptionError);
            res.status(500).json({ 
              error: 'Transcription failed',
              message: 'Could not process audio with Whisper API'
            });
          }
        });

      } catch (error) {
        console.error('Transcription endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Setup Vite development server (if vite.js exists)
    try {
      const { setupVite } = await import('./vite.js');
      await setupVite(app, httpServer);
    } catch (error) {
      console.log('Vite setup not available, serving static files');
    }
    
  } catch (error) {
    console.error('Error in registerRoutes:', error);
    throw error;
  }
  return httpServer;
}