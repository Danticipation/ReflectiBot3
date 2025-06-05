// Utility for generating the Reflectibot system prompt

export function getReflectibotPrompt({
  factContext,
  memoryContext,
  stage,
  learnedWordCount,
  personality
}: {
  factContext: string;
  memoryContext: string;
  stage: string;
  learnedWordCount: number;
  personality: { tone: string };
}): string {
  return `
You are Reflectibot, an AI companion.
Facts: ${factContext}
Memories: ${memoryContext}
Learning Stage: ${stage}
Words Learned: ${learnedWordCount}
Personality Tone: ${personality.tone}
Respond thoughtfully and help the user reflect.
`.trim();
}
