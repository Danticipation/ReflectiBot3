// services/responseService.ts

import { getReflectibotPrompt, getStageFromWordCountV2 } from '../utils/promptUtils';
import { storage } from '../storage';
import { OpenAI } from 'openai';

const openai = new OpenAI();

type Fact = { fact: string };
type Memory = { memory: string };

export async function generateResponseWithStyle(userId: number, botId: number, userInput: string): Promise<string> {
  const facts: Fact[] = await storage.getUserFacts(userId);
  const memories: Memory[] = await storage.getUserMemories(userId);
  const learnedWords = await storage.getLearnedWords(botId);
  const stage = getStageFromWordCountV2(learnedWords.length);

  const systemPrompt = getReflectibotPrompt({
    factContext: facts.map(f => f.fact).join('\n'),
    memoryContext: memories.map(m => m.memory).join('\n'),
    stage,
    learnedWordCount: learnedWords.length,
    personality: { tone: 'neutral' },
  });

  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput }
    ],
    model: 'gpt-4o'
  });

  return completion.choices[0].message.content || '[No response generated]';
}
