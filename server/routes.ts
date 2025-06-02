import type { Express, Request, Response } from "express";
import { createServer } from "http";
import type { Server } from "http";
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

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Chat endpoint
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { message, userId = 1 } = req.body;

      if (!message) {
        res.status(400).json({ error: 'message required' });
        return;
      }

      // Get or create bot
      let bot = await storage.getBotByUserId(userId);
      if (!bot) {
        bot = await storage.createBot({
          userId,
          name: "Reflect"
        });
      }

      // Store user message
      await storage.createMessage({
        botId: bot.id,
        sender: 'user',
        text: message
      });

      // Generate AI response
      const aiResponse = await generateResponse(message, bot.id, userId);

      // Store bot response
      await storage.createMessage({
        botId: bot.id,
        sender: 'bot',
        text: aiResponse
      });

      // Learn words from user message
      const keywords = extractKeywords(message);
      for (const word of keywords) {
        await storage.createOrUpdateWord({
          botId: bot.id,
          word: word,
          context: message
        });
      }

      // Update bot stats
      const learnedWords = await storage.getLearnedWords(bot.id);
      const stage = getStageFromWordCount(learnedWords.length);
      
      await storage.updateBot(bot.id, {
        wordsLearned: learnedWords.length,
        level: stage === 'Infant' ? 1 : stage === 'Toddler' ? 2 : stage === 'Child' ? 3 : stage === 'Adolescent' ? 4 : 5
      });

      res.json({
        response: aiResponse,
        stage: stage,
        wordsLearned: learnedWords.length
      });

    } catch (error) {
      console.error("Error in /api/chat endpoint:", error);
      res.status(500).json({ error: 'Failed to process chat message' });
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

  return httpServer;
}