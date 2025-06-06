// Intent detection system for enhanced conversation understanding
export interface Intent {
  type: string;
  confidence: number;
  entities?: Record<string, any>;
  response_strategy?: string;
}

export interface ConversationContext {
  recentMessages: string[];
  userFacts: string[];
  currentMood: string;
  stage: string;
}

export function detectIntent(message: string, context: ConversationContext): Intent {
  const normalizedMessage = message.toLowerCase().trim();
  
  // Emotional support intents
  if (detectEmotionalSupport(normalizedMessage)) {
    return {
      type: "emotional_support",
      confidence: 0.9,
      response_strategy: "empathetic"
    };
  }
  
  // Information sharing intents
  if (detectInformationSharing(normalizedMessage)) {
    return {
      type: "information_sharing", 
      confidence: 0.85,
      entities: extractPersonalInfo(normalizedMessage),
      response_strategy: "acknowledgment_and_followup"
    };
  }
  
  // Question asking intents
  if (detectQuestion(normalizedMessage)) {
    return {
      type: "question",
      confidence: 0.8,
      response_strategy: "informative"
    };
  }
  
  // Reflection request intents
  if (detectReflectionRequest(normalizedMessage)) {
    return {
      type: "reflection_request",
      confidence: 0.9,
      response_strategy: "reflective_summary"
    };
  }
  
  // Casual conversation intents
  return {
    type: "casual_conversation",
    confidence: 0.6,
    response_strategy: "conversational"
  };
}

function detectEmotionalSupport(message: string): boolean {
  const emotionalIndicators = [
    "feeling", "stressed", "anxious", "worried", "sad", "upset", "frustrated",
    "tired", "overwhelmed", "difficult", "hard time", "struggling", "challenging"
  ];
  
  return emotionalIndicators.some(indicator => message.includes(indicator));
}

function detectInformationSharing(message: string): boolean {
  const sharingPatterns = [
    /i am/i, /i work/i, /i live/i, /i like/i, /i love/i, /i have/i,
    /my/i, /today i/i, /yesterday i/i, /recently i/i
  ];
  
  return sharingPatterns.some(pattern => pattern.test(message));
}

function detectQuestion(message: string): boolean {
  return message.includes('?') || 
         message.startsWith('what') || 
         message.startsWith('how') ||
         message.startsWith('why') ||
         message.startsWith('when') ||
         message.startsWith('where') ||
         message.startsWith('can you') ||
         message.startsWith('do you');
}

function detectReflectionRequest(message: string): boolean {
  const reflectionKeywords = [
    "what do you remember", "tell me about", "what do you think",
    "reflect on", "summarize", "what have we talked about",
    "what do you know about me", "thoughts on"
  ];
  
  return reflectionKeywords.some(keyword => message.includes(keyword));
}

function extractPersonalInfo(message: string): Record<string, any> {
  const entities: Record<string, any> = {};
  
  // Extract names
  const nameMatch = message.match(/my name is (\w+)/i);
  if (nameMatch) entities.name = nameMatch[1];
  
  // Extract occupation
  const jobMatch = message.match(/i work (?:as |at |in )?([^.!?]+)/i);
  if (jobMatch) entities.occupation = jobMatch[1].trim();
  
  // Extract location
  const locationMatch = message.match(/i live (?:in |at |near )?([^.!?]+)/i);
  if (locationMatch) entities.location = locationMatch[1].trim();
  
  // Extract interests
  const interestMatch = message.match(/i (?:like|love|enjoy) ([^.!?]+)/i);
  if (interestMatch) entities.interest = interestMatch[1].trim();
  
  return entities;
}

export function generateResponseStrategy(intent: Intent, context: ConversationContext): string {
  switch (intent.response_strategy) {
    case "empathetic":
      return "Respond with empathy and emotional support. Acknowledge their feelings and offer comfort or encouragement.";
    
    case "acknowledgment_and_followup":
      return "Acknowledge the shared information and ask a thoughtful follow-up question to deepen the conversation.";
    
    case "informative":
      return "Provide helpful information or ask clarifying questions to better understand what they're looking for.";
    
    case "reflective_summary":
      return "Provide a thoughtful summary of our conversations and reflect on patterns or insights about their experiences.";
    
    case "conversational":
    default:
      return "Engage in natural, friendly conversation while being mindful of their developmental stage and emotional state.";
  }
}