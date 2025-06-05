// controllers/userController.ts
import { Request, Response } from 'express';
import { storage } from '../storage';

export async function handleSwitchBotRequest(req: Request, res: Response): Promise<void> {
  try {
    const { userId = 1, botName } = req.body;
    if (!botName) {
      res.status(400).json({ error: 'Bot name is required' });
      return;
    }

    const newBot = await storage.createBot({ userId, name: botName });
    res.json({ message: `Switched to bot: ${botName}`, botId: newBot.id });
  } catch (error) {
    console.error('Switch bot error:', error);
    res.status(500).json({ error: 'Bot switch failed' });
  }
}
