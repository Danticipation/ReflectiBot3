// Emotion-based voice switching system
export interface VoiceProfile {
  voiceId: string;
  name: string;
  emotion: string;
  characteristics: string[];
}

export const voiceProfiles: VoiceProfile[] = [
  {
    voiceId: "Rachel",
    name: "Rachel - Calm & Supportive",
    emotion: "calm",
    characteristics: ["supportive", "gentle", "therapeutic"]
  },
  {
    voiceId: "Josh",
    name: "Josh - Energetic & Enthusiastic", 
    emotion: "excited",
    characteristics: ["energetic", "motivational", "upbeat"]
  },
  {
    voiceId: "Nicole",
    name: "Nicole - Warm & Empathetic",
    emotion: "empathetic",
    characteristics: ["warm", "caring", "understanding"]
  },
  {
    voiceId: "Adam",
    name: "Adam - Professional & Clear",
    emotion: "professional",
    characteristics: ["clear", "professional", "authoritative"]
  }
];

export function selectVoiceForMood(mood: string, stage: string): string {
  // Map mood to appropriate voice
  const moodToVoice: Record<string, string> = {
    "excited": "Josh",
    "happy": "Josh", 
    "calm": "Rachel",
    "peaceful": "Rachel",
    "reflective": "Nicole",
    "contemplative": "Nicole",
    "anxious": "Rachel",
    "stressed": "Rachel",
    "professional": "Adam",
    "neutral": "Rachel"
  };

  // Adjust voice selection based on developmental stage
  if (stage === "Infant" || stage === "Toddler") {
    return "Nicole"; // Warmer, more nurturing voice for early stages
  }

  return moodToVoice[mood.toLowerCase()] || "Rachel";
}

export function getVoiceSettings(mood: string, stage: string) {
  const voiceId = selectVoiceForMood(mood, stage);
  
  // Adjust voice parameters based on mood and stage
  const baseSettings = {
    voiceId,
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.0,
    useSpeakerBoost: true
  };

  // Mood-based adjustments
  switch (mood.toLowerCase()) {
    case "excited":
    case "happy":
      return {
        ...baseSettings,
        stability: 0.3, // More variation for excitement
        style: 0.2 // Slightly more expressive
      };
    
    case "calm":
    case "peaceful":
      return {
        ...baseSettings,
        stability: 0.8, // Very stable for calmness
        style: 0.0 // Neutral expression
      };
    
    case "anxious":
    case "stressed":
      return {
        ...baseSettings,
        stability: 0.7, // Stable but gentle
        similarityBoost: 0.8, // Higher similarity for consistency
        style: -0.1 // Slightly softer
      };
    
    default:
      return baseSettings;
  }
}