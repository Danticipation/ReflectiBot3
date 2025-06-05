// services/responseService.ts
import { OpenAI } from 'openai';
import { storage } from '../storage';
import { getReflectibotPrompt } from '../utils/promptUtils';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface GenerateResponseOptions {
  message: string;
  userId: number;
  botId: number;
  stylePrompt?: string;
}

export async function generateResponseWithStyle({
  message,
  userId,
  botId,
  stylePrompt
}: GenerateResponseOptions): Promise<string> {
  const memories: { memory: string }[] = await storage.getUserMemories(userId);
  const facts: { fact: string }[] = await storage.getUserFacts(userId);
  const learnedWords = await storage.getLearnedWords(botId);

  const systemPrompt = getReflectibotPrompt({
    factContext: facts.map(f => f.fact).join('\n'),
    memoryContext: Array.isArray(memories) ? memories.map(m => m.memory).join('\n') : '',
    stage: 'Adolescent',
    learnedWordCount: learnedWords.length,
    personality: { tone: 'neutral' }
  });

  const prompt = `${stylePrompt || ''}\n\n${systemPrompt}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: message }
    ],
    max_tokens: 150
  });

  return response.choices[0].message?.content || 'Sorry, I’m not sure how to respond.';
}
