// Memory importance tagging logic
export type ImportanceLevel = 'low' | 'medium' | 'high' | 'critical';

export interface MemoryAnalysis {
  importance: ImportanceLevel;
  category: string;
  tags: string[];
  emotionalWeight: number;
  recallPriority: number;
}

export function analyzeMemoryImportance(
  content: string,
  context: {
    isFirstMention: boolean;
    containsPersonalInfo: boolean;
    emotionalContext: string;
    userInitiated: boolean;
  }
): MemoryAnalysis {
  let importance: ImportanceLevel = 'medium';
  let emotionalWeight = 0.5;
  let recallPriority = 0.5;
  const tags: string[] = [];
  let category = 'general';

  // Personal information detection
  if (context.containsPersonalInfo || detectPersonalDetails(content)) {
    importance = 'high';
    category = 'personal_info';
    recallPriority = 0.9;
    tags.push('personal');
  }

  // Emotional significance
  const emotionalSignificance = analyzeEmotionalContent(content);
  if (emotionalSignificance.isHighlyEmotional) {
    importance = emotionalSignificance.isPositive ? 'high' : 'critical';
    emotionalWeight = emotionalSignificance.intensity;
    tags.push(...emotionalSignificance.emotions);
    category = 'emotional';
  }

  // First mention bonus
  if (context.isFirstMention) {
    recallPriority += 0.2;
    tags.push('first_mention');
  }

  // Goal or aspiration detection
  if (detectGoalsAndAspirations(content)) {
    importance = 'high';
    category = 'goals';
    recallPriority = 0.8;
    tags.push('goals', 'aspirations');
  }

  // Relationship information
  if (detectRelationshipInfo(content)) {
    importance = 'high';
    category = 'relationships';
    recallPriority = 0.8;
    tags.push('relationships');
  }

  // Work and professional context
  if (detectProfessionalContext(content)) {
    importance = 'medium';
    category = 'professional';
    recallPriority = 0.6;
    tags.push('work', 'professional');
  }

  // Temporal relevance
  if (detectTemporalRelevance(content)) {
    recallPriority += 0.1;
    tags.push('time_sensitive');
  }

  return {
    importance,
    category,
    tags,
    emotionalWeight: Math.min(1, emotionalWeight),
    recallPriority: Math.min(1, recallPriority)
  };
}

function detectPersonalDetails(content: string): boolean {
  const personalPatterns = [
    /my name is/i,
    /i am \d+ years old/i,
    /i live in/i,
    /my family/i,
    /my birthday/i,
    /my phone number/i,
    /my email/i
  ];
  
  return personalPatterns.some(pattern => pattern.test(content));
}

function analyzeEmotionalContent(content: string): {
  isHighlyEmotional: boolean;
  isPositive: boolean;
  intensity: number;
  emotions: string[];
} {
  const positiveEmotions = [
    'happy', 'excited', 'joy', 'love', 'grateful', 'proud',
    'amazing', 'wonderful', 'fantastic', 'thrilled'
  ];
  
  const negativeEmotions = [
    'sad', 'angry', 'frustrated', 'anxious', 'worried', 'stressed',
    'depressed', 'overwhelmed', 'disappointed', 'scared'
  ];
  
  const strongEmotions = [
    'devastated', 'ecstatic', 'furious', 'terrified', 'overjoyed',
    'heartbroken', 'elated', 'panicked', 'euphoric'
  ];

  const detectedEmotions: string[] = [];
  let intensity = 0;
  let positiveCount = 0;
  let negativeCount = 0;

  // Check for strong emotional indicators
  if (strongEmotions.some(emotion => content.toLowerCase().includes(emotion))) {
    intensity = 1.0;
    detectedEmotions.push('intense');
  }

  // Count positive emotions
  positiveEmotions.forEach(emotion => {
    if (content.toLowerCase().includes(emotion)) {
      positiveCount++;
      detectedEmotions.push(emotion);
      intensity = Math.max(intensity, 0.7);
    }
  });

  // Count negative emotions
  negativeEmotions.forEach(emotion => {
    if (content.toLowerCase().includes(emotion)) {
      negativeCount++;
      detectedEmotions.push(emotion);
      intensity = Math.max(intensity, 0.8);
    }
  });

  // Check for emotional punctuation
  if (content.includes('!') || content.includes('!!!')) {
    intensity += 0.2;
  }

  return {
    isHighlyEmotional: intensity > 0.6 || detectedEmotions.length > 1,
    isPositive: positiveCount > negativeCount,
    intensity: Math.min(1, intensity),
    emotions: detectedEmotions
  };
}

function detectGoalsAndAspirations(content: string): boolean {
  const goalPatterns = [
    /i want to/i,
    /i hope to/i,
    /my goal is/i,
    /i'm planning to/i,
    /i dream of/i,
    /i aspire to/i,
    /in the future/i,
    /i will/i,
    /i'm going to/i
  ];
  
  return goalPatterns.some(pattern => pattern.test(content));
}

function detectRelationshipInfo(content: string): boolean {
  const relationshipPatterns = [
    /my (partner|spouse|husband|wife|boyfriend|girlfriend)/i,
    /my (mother|father|mom|dad|parents)/i,
    /my (brother|sister|sibling)/i,
    /my (friend|best friend)/i,
    /my (colleague|coworker|boss)/i,
    /we (are|were) (dating|married|together)/i
  ];
  
  return relationshipPatterns.some(pattern => pattern.test(content));
}

function detectProfessionalContext(content: string): boolean {
  const professionalPatterns = [
    /at work/i,
    /my job/i,
    /my career/i,
    /i work as/i,
    /my company/i,
    /my boss/i,
    /my project/i,
    /meeting/i,
    /deadline/i,
    /promotion/i
  ];
  
  return professionalPatterns.some(pattern => pattern.test(content));
}

function detectTemporalRelevance(content: string): boolean {
  const temporalPatterns = [
    /today/i,
    /tomorrow/i,
    /this week/i,
    /next week/i,
    /urgent/i,
    /deadline/i,
    /appointment/i,
    /schedule/i
  ];
  
  return temporalPatterns.some(pattern => pattern.test(content));
}