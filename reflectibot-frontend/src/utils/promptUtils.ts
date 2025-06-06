// utils/promptUtils.ts

export function getStageFromWordCountV2(count: number): string {
  if (count < 50) return 'Infant';
  if (count < 100) return 'Toddler';
  if (count < 200) return 'Adolescent';
  if (count < 400) return 'Young Adult';
  return 'Adult';
}

export function getReflectibotPrompt(input: {
  factContext: string;
  memoryContext: string;
  stage: string;
  learnedWordCount: number;
  personality: { tone: string };
}): string {
  return `
You are Reflectibot – a reflective AI with a ${input.personality.tone} tone.
You're currently in the ${input.stage} stage of development with ${input.learnedWordCount} words learned.

Memories:
${input.memoryContext}

Facts:
${input.factContext}

Respond with deep insights, gentle curiosity, and a hint of playful growth.
`;
}
