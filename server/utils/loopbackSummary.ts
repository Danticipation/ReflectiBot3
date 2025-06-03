// Loopback summary generation for enhanced memory reflection
import OpenAI from "openai";

export interface SummaryContext {
  userMessages: string[];
  botResponses: string[];
  timeframe: string;
  userFacts: string[];
  emotionalTone: string;
  stage: string;
}

export interface MemorySummary {
  keyThemes: string[];
  emotionalJourney: string;
  personalGrowth: string;
  importantFacts: string[];
  conversationPatterns: string[];
  recommendations: string[];
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateLoopbackSummary(context: SummaryContext): Promise<MemorySummary> {
  try {
    const prompt = constructSummaryPrompt(context);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an AI companion analyzing conversation patterns and personal growth. Generate insightful summaries that help understand the user's journey and emotional development."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const summary = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      keyThemes: summary.keyThemes || [],
      emotionalJourney: summary.emotionalJourney || "",
      personalGrowth: summary.personalGrowth || "",
      importantFacts: summary.importantFacts || [],
      conversationPatterns: summary.conversationPatterns || [],
      recommendations: summary.recommendations || []
    };
    
  } catch (error) {
    console.error("Error generating loopback summary:", error);
    return generateFallbackSummary(context);
  }
}

function constructSummaryPrompt(context: SummaryContext): string {
  return `
Analyze the following conversation data and provide a comprehensive summary in JSON format:

**Timeframe**: ${context.timeframe}
**Bot Development Stage**: ${context.stage}
**Overall Emotional Tone**: ${context.emotionalTone}

**User Messages** (${context.userMessages.length} messages):
${context.userMessages.join('\n')}

**Bot Responses** (${context.botResponses.length} responses):
${context.botResponses.join('\n')}

**Known User Facts**:
${context.userFacts.join('\n')}

Please provide a JSON response with the following structure:
{
  "keyThemes": ["array of 3-5 main conversation themes"],
  "emotionalJourney": "description of the user's emotional progression",
  "personalGrowth": "insights about the user's development and self-reflection",
  "importantFacts": ["array of key personal facts learned"],
  "conversationPatterns": ["array of notable communication patterns"],
  "recommendations": ["array of 2-3 suggestions for future conversations"]
}

Focus on:
1. Identifying recurring topics and interests
2. Emotional patterns and growth
3. Personal development and self-awareness
4. Communication style evolution
5. Meaningful insights that can improve future interactions
`;
}

function generateFallbackSummary(context: SummaryContext): MemorySummary {
  // Basic pattern analysis when OpenAI is unavailable
  const themes = extractBasicThemes(context.userMessages);
  const patterns = analyzeBasicPatterns(context.userMessages, context.botResponses);
  
  return {
    keyThemes: themes,
    emotionalJourney: `During ${context.timeframe}, conversations showed a ${context.emotionalTone} tone with varied emotional expressions.`,
    personalGrowth: `User engaged in ${context.userMessages.length} conversations, showing active participation in self-reflection.`,
    importantFacts: context.userFacts.slice(0, 5),
    conversationPatterns: patterns,
    recommendations: [
      "Continue exploring personal interests",
      "Build on established conversation themes",
      "Maintain open emotional expression"
    ]
  };
}

function extractBasicThemes(messages: string[]): string[] {
  const commonWords = new Map<string, number>();
  const themes: string[] = [];
  
  messages.forEach(message => {
    const words = message.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    words.forEach(word => {
      commonWords.set(word, (commonWords.get(word) || 0) + 1);
    });
  });
  
  // Get top themes
  const sortedWords = Array.from(commonWords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  sortedWords.forEach(([word, count]) => {
    if (count > 1) {
      themes.push(word);
    }
  });
  
  return themes.length > 0 ? themes : ["general conversation", "personal sharing"];
}

function analyzeBasicPatterns(userMessages: string[], botResponses: string[]): string[] {
  const patterns: string[] = [];
  
  // Analyze message lengths
  const avgUserLength = userMessages.reduce((sum, msg) => sum + msg.length, 0) / userMessages.length;
  const avgBotLength = botResponses.reduce((sum, msg) => sum + msg.length, 0) / botResponses.length;
  
  if (avgUserLength > 100) {
    patterns.push("Detailed, thoughtful messages");
  } else {
    patterns.push("Concise communication style");
  }
  
  // Analyze question frequency
  const userQuestions = userMessages.filter(msg => msg.includes('?')).length;
  if (userQuestions > userMessages.length * 0.3) {
    patterns.push("Frequently asks questions");
  }
  
  // Analyze emotional expressions
  const emotionalMessages = userMessages.filter(msg => 
    /feel|emotion|happy|sad|excited|worried/i.test(msg)
  ).length;
  
  if (emotionalMessages > userMessages.length * 0.2) {
    patterns.push("Open emotional expression");
  }
  
  return patterns.length > 0 ? patterns : ["Conversational engagement"];
}

export function formatSummaryForDisplay(summary: MemorySummary): string {
  return `
**Key Conversation Themes:**
${summary.keyThemes.map(theme => `• ${theme}`).join('\n')}

**Emotional Journey:**
${summary.emotionalJourney}

**Personal Growth Insights:**
${summary.personalGrowth}

**Important Facts Discovered:**
${summary.importantFacts.map(fact => `• ${fact}`).join('\n')}

**Communication Patterns:**
${summary.conversationPatterns.map(pattern => `• ${pattern}`).join('\n')}

**Recommendations:**
${summary.recommendations.map(rec => `• ${rec}`).join('\n')}
`.trim();
}