// controllers/chatController.ts
import { Request, Response } from 'express';
import { generateResponseWithStyle } from '../services/responseService';
import { storage } from '../storage';

export async function handleChatRequest(req: Request, res: Response) {
  const { message, userId, botId, stylePrompt } = req.body;

  try {
    const reply = await generateResponseWithStyle(userId, botId, message);
    res.json({ success: true, message: reply });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Chat request failed' });
  }
}
