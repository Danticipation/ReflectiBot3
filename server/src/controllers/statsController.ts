// controllers/statsController.ts
import { Request, Response } from 'express';
import { storage } from '../storage';
import { getStageFromWordCount } from '../utils/promptUtils';

export async function handleStatsRequest(req: Request, res: Response): Promise<void> {
  try {
    const { userId = 1 } = req.query;
    const bot = await storage.getBotByUserId(Number(userId)) as { id: number } | null;
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const words = await storage.getLearnedWords(bot.id);
    const messages = await storage.getUserMemories(Number(userId));
    const stage = getStageFromWordCount(words.length);

    res.json({ stage, wordCount: words.length, messageCount: messages.length });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Stats failed' });
  }
}
