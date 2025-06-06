// server/api.ts

import { Express, Request, Response } from "express";
import { storage } from "./storage.js";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function getStageFromWordCount(wordCount: number): string {
  if (wordCount < 10) return "Infant";
  if (wordCount < 25) return "Toddler";
  if (wordCount < 50) return "Child";
  if (wordCount < 100) return "Adolescent";
  return "Adult";
}

async function generateResponse(userMessage: string, botId: number, userId: number): Promise<string> {
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
}

export async function registerRoutes(app: Express) {
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { message, userId = 1 } = req.body;

      if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      let bot = await storage.getBotByUserId(userId);
      if (!bot) {
        bot = await storage.createBot({
          userId,
          name: "Reflect"
        });
      }

      const reply = await generateResponse(message, bot.id, userId);
      await storage.createMessage({ botId: bot.id, sender: "bot", text: reply });

      res.status(200).json({ reply });

    } catch (error) {
      console.error("Error in /api/chat:", error);
      res.status(500).json({ error: 'Failed to generate response' });
    }
  });
}
