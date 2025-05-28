export function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'i', 'you', 'he', 'she',
    'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its',
    'our', 'their', 'this', 'that', 'these', 'those'
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10);
}

export function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const positiveWords = ['love', 'like', 'enjoy', 'amazing', 'awesome', 'great', 'fantastic', 'wonderful', 'excellent', 'good'];
  const negativeWords = ['hate', 'dislike', 'awful', 'terrible', 'bad', 'horrible', 'worst', 'annoying', 'frustrating'];
  
  const words = text.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  });
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

export function detectEmotions(text: string): Record<string, number> {
  const emotions = {
    joy: ['happy', 'excited', 'joy', 'love', 'amazing', 'awesome', 'great', 'fantastic'],
    sadness: ['sad', 'depressed', 'down', 'blue', 'unhappy'],
    anger: ['angry', 'mad', 'furious', 'annoyed', 'frustrated'],
    fear: ['scared', 'afraid', 'worried', 'anxious', 'nervous'],
    surprise: ['surprised', 'shocked', 'amazed', 'astonished'],
    disgust: ['disgusting', 'gross', 'yuck', 'eww']
  };
  
  const words = text.toLowerCase().split(/\s+/);
  const scores: Record<string, number> = {};
  
  Object.entries(emotions).forEach(([emotion, emotionWords]) => {
    scores[emotion] = words.filter(word => emotionWords.includes(word)).length;
  });
  
  return scores;
}
