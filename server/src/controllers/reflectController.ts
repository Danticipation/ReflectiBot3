// controllers/reflectController.ts
import { Request, Response } from 'express';
import { OpenAI } from 'openai';
import { updateUserStyleAndGetPrompt } from '../services/userStyleService';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handleOpenAITest(req: Request, res: Response) {
  try {
    const { message } = req.query;
    const stylePrompt = updateUserStyleAndGetPrompt({ recentMessages: [message as string], previousStyle: '' });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 10
    });

    res.json({ success: true, message: 'OpenAI connection working', response: response.choices[0].message?.content });
  } catch (error) {
    console.error('OpenAI test error:', error);
    res.status(500).json({ error: 'OpenAI test failed' });
  }
}
