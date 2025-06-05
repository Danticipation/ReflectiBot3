// controllers/chatController.ts
import { Request, Response } from 'express';
import { generateResponseWithStyle } from '../services/responseService';
import { storage } from '../storage';

export async function handleChatRequest(req: Request, res: Response) {
  const { message, userId, botId } = req.body;

  try {
    const stylePrompt = await storage.getUserStylePrompt(userId);
    const reply = await generateResponseWithStyle({ message, userId, botId, stylePrompt });
    res.json({ success: true, message: reply });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Chat request failed' });
  }
}
