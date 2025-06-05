// services/userStyleService.ts

import { storage } from '../storage';

export async function updateUserStyleAndGetPrompt(userId: number, recentMessages: string[]): Promise<string> {
  // Here you could run some real tone detection — for now we just return a dummy style.
  const tone = 'neutral';
  await storage.setUserStylePrompt(userId, tone);
  return tone;
}
