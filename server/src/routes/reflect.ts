import type { Express, Request, Response } from 'express';
import { updateUserStyleAndGetPrompt } from '../services/userStyleService';
import { getReflectibotPrompt } from '../utils/promptUtils';
import { storage } from '../storage';

export function registerReflectRoutes(app: Express): void {
  /**
   * @openapi
   * /api/reflect:
   *   get:
   *     summary: Get Reflectibot prompt and user tone
   *     tags:
   *       - Reflect
   *     responses:
   *       200:
   *         description: Reflectibot prompt and user tone returned successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 prompt:
   *                   type: string
   *                 tone:
   *                   type: string
   *                 stage:
   *                   type: string
   *                 learnedWordCount:
   *                   type: integer
   */
  app.get('/api/reflect', async (req: Request, res: Response) => {
    const userId = 1; // 🔐 Replace with auth logic later
    const botId = 1;

    const memories = await storage.getUserMemories(userId); // string[]
    const facts = await storage.getUserFacts(userId);       // string[]
    const stage = 'Adolescent';                             // 🔧 can be dynamic
    const learnedWordCount = 128;                           // 🔧 example
    const previousStyle = 'neutral';                        // or from DB

    // ✨ Detect user tone
    const tone = updateUserStyleAndGetPrompt({
      recentMessages: memories,
      previousStyle,
    });

    const personality = { tone };

    const systemPrompt = getReflectibotPrompt({
      factContext: facts.join('\n'),
      memoryContext: memories.join('\n'),
      stage,
      learnedWordCount,
      personality,
    });

    res.json({
      prompt: systemPrompt,
      tone,
      stage,
      learnedWordCount,
    });
  });
}
