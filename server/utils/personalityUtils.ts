export function analyzeUserMessage(message: string): {
  tone?: 'chill' | 'formal' | 'enthusiastic';
  fillerWords?: string[];
  catchphrases?: string[];
} {
  const lower = message.toLowerCase();

  const isSurfer = /bro|dude|gnarly|totally|chill|rad|right on|catch the waves/.test(lower);
  const isFormal = /therefore|however|furthermore|i believe|it appears/.test(lower);
  const isHyped = /omg|!!!|so good|absolutely|insane|unreal|wow/.test(lower);

  if (isSurfer) {
    return {
      tone: 'chill',
      fillerWords: ['bro', 'dude', 'man'],
      catchphrases: ['you feel me?', 'let’s ride it out', 'right on']
    };
  }

  if (isFormal) {
    return {
      tone: 'formal',
      fillerWords: ['indeed', 'nevertheless'],
      catchphrases: ['to summarize', 'in conclusion']
    };
  }

  if (isHyped) {
    return {
      tone: 'enthusiastic',
      fillerWords: ['literally', 'so', 'like'],
      catchphrases: ['let’s freaking go!', 'this is wild!']
    };
  }

  return {};
}

export function extractPersonalityTraits(message: string): string[] {
  const traits: string[] = [];
  const lowered = message.toLowerCase();

  if (lowered.includes("bro") || lowered.includes("dude") || lowered.includes("gnarly")) {
    traits.push("surfer");
  }
  if (lowered.includes("y'all") || lowered.includes("fixin'") || lowered.includes("bless your heart")) {
    traits.push("southern");
  }
  if (lowered.includes("hella") || lowered.includes("no cap") || lowered.includes("fr")) {
    traits.push("gen z");
  }

  const emojiCount = (message.match(/\p{Emoji}/gu) || []).length;
  if (emojiCount >= 3) traits.push("expressive");

  if (message.trim().split(" ").length <= 3) traits.push("brief");

  if (lowered.includes("...")) traits.push("casual");
  if (lowered.includes("!!!")) traits.push("enthusiastic");

  return traits;
}
