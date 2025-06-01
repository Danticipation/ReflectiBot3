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

      res.status(200).send("OK");
    } catch (error) {
      console.error("Error in /api/chat endpoint:", error);
      res.status(500).json({ error: 'Failed to process chat message' });
    }
  });

  // Start the HTTP server
  await new Promise<void>((resolve) => {
    httpServer.listen(3000, () => {
      console.log('Server started on port 3000');
      resolve();
    });
  });

  return Promise.resolve(httpServer);
}