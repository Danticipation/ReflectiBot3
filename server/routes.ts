import type { Express, Request, Response } from "express";
import { storage } from "./storage.js";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
async function generateResponse(userMessage: string, botId: number, userId: number): Promise<string> {
  try {
    const memories = await storage.getUserMemories(userId);
    const facts = await storage.getUserFacts(userId);
    const learnedWords = await storage.getLearnedWords(botId);
    
    const stage = getStageFromWordCount(learnedWords.length);
    const memoryContext = memories.slice(-5).map(m => m.memory).join('\n');
    const factContext = facts.map(f => f.fact).join('\n');
    
    const systemPrompt = `You are Reflectibot, an AI companion in the "${stage}" learning stage.

Your knowledge:
Facts: ${factContext || 'None yet'}
Recent memories: ${memoryContext || 'None yet'}
Words learned: ${learnedWords.length}

Respond naturally according to your developmental stage.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
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
      const { message, userId = 1 } = req.body;

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
      const aiResponse = await generateResponse(message, bot.id, userId);
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

  // Text-to-speech placeholder
  app.post('/api/text-to-speech', async (req: Request, res: Response) => {
    // Placeholder - implement with your TTS service
    res.json({ status: 'TTS not implemented yet' });
  });

  // Transcribe endpoint (for voice recording)
  app.post('/api/transcribe', async (req: Request, res: Response) => {
    try {
      // For now, return a placeholder since we don't have OpenAI Whisper set up
      // In a full implementation, you'd use OpenAI's Whisper API or another transcription service
      res.json({ 
        text: 'Voice transcription received! (OpenAI Whisper not configured yet)',
        status: 'placeholder' 
      });
    } catch (error) {
      console.error('Transcription error:', error);
      res.status(500).json({ error: 'Transcription failed' });
    }
  });
}