// services/responseService.js
import { getStageFromWordCountV2, getReflectibotPrompt } from '../utils/promptUtils.js';
import { storage } from '../storage/index.js';
import { OpenAI } from 'openai';

const openai = new OpenAI();

export async function generateResponseWithStyle(userId, botId, userInput) {
  const facts = await storage.getUserFacts(userId);
  const memories = await storage.getUserMemories(userId);
  const learnedWords = await storage.getLearnedWords(botId);

  const stage = getStageFromWordCountV2(learnedWords.length);

  const systemPrompt = getReflectibotPrompt({
    factContext: facts.map(f => f.fact).join('\n'),
    memoryContext: memories.map(m => m.memory).join('\n'),
    stage,
    learnedWordCount: learnedWords.length,
    personality: { tone: 'neutral' }
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
