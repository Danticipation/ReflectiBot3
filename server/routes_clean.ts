import { Router } from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage.js";
import OpenAI from "openai";
import { detectIntent, generateResponseStrategy, type ConversationContext } from "./intentInference.js";
import { analyzeMemoryImportance, type MemoryAnalysis } from "./memoryImportance.js";
import { extractTimeContext, generateTimeBasedContext, shouldPrioritizeMemory } from "./timestampLabeling.js";
import { selectVoiceForMood, getVoiceSettings } from "./dynamicVoice.js";
import { generateLoopbackSummary, formatSummaryForDisplay, type SummaryContext } from "./loopbackSummary.js";
import express from "express";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Learning stage tracker
function getStageFromWordCount(wordCount: number): string {
  if (wordCount < 10) return "Infant";
  if (wordCount < 25) return "Toddler";
  if (wordCount < 50) return "Child";
  if (wordCount < 100) return "Adolescent";
  return "Adult";
}

function getNextStageThreshold(wordCount: number): number {
  if (wordCount < 10) return 10;
  if (wordCount < 25) return 25;
  if (wordCount < 50) return 50;
  if (wordCount < 100) return 100;
  return 150;
}

function extractKeywords(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 10);
}

function extractFacts(message: string): string[] {
  const facts: string[] = [];
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('my name is')) {
    const nameMatch = message.match(/my name is (\w+)/i);
    if (nameMatch) facts.push(`User's name is ${nameMatch[1]}`);
  }
  
  if (lowerMessage.includes('i work') || lowerMessage.includes('my job')) {
    facts.push(`Work/career related: ${message}`);
  }
  
  if (lowerMessage.includes('i live') || lowerMessage.includes('i am from')) {
    facts.push(`Location related: ${message}`);
  }
  
  return facts.slice(0, 3);
}

// Enhanced AI response generation with advanced intelligence
async function generateResponse(userMessage: string, botId: number, userId: number): Promise<string> {
  try {
    const memories = await storage.getUserMemories(userId);
    const facts = await storage.getUserFacts(userId);
    const learnedWords = await storage.getLearnedWords(botId);
    const recentMessages = await storage.getMessages(botId);
    
    const stage = getStageFromWordCount(learnedWords.length);
    
    // Extract time context for enhanced understanding
    const timeContext = extractTimeContext(userMessage);
    const timeBasedContext = generateTimeBasedContext(timeContext);
    
    // Analyze conversation intent
    const conversationContext: ConversationContext = {
      recentMessages: recentMessages.map(m => m.text),
      userFacts: facts.map(f => f.fact),
      currentMood: "neutral",
      stage
    };
    
    const intent = detectIntent(userMessage, conversationContext);
    const responseStrategy = generateResponseStrategy(intent, conversationContext);
    
    // Analyze memory importance for storage prioritization
    const memoryAnalysis = analyzeMemoryImportance(userMessage, {
      isFirstMention: !facts.some(f => f.fact.toLowerCase().includes(userMessage.toLowerCase().split(' ')[0])),
      containsPersonalInfo: /\b(my|i am|i work|i live|i like)\b/i.test(userMessage),
      emotionalContext: intent.type,
      userInitiated: true
    });
    
    // Build enhanced context for AI
    const memoryContext = memories.slice(-10).map(m => m.memory).join('\n');
    const factContext = facts.map(f => f.fact).join('\n');
    const conversationHistoryContext = recentMessages.slice(-6).map(m => `${m.sender}: ${m.text}`).join('\n');
    
    const systemPrompt = `You are Reflectibot, an AI companion in the "${stage}" learning stage. You learn and grow through conversations.

Context Analysis:
- ${timeBasedContext}
- Conversation Intent: ${intent.type} (confidence: ${intent.confidence})
- Response Strategy: ${responseStrategy}
- Memory Importance: ${memoryAnalysis.importance} - Tags: ${memoryAnalysis.tags.join(", ")}

Your current knowledge:
Facts about user: ${factContext || 'None yet'}
Recent memories: ${memoryContext || 'None yet'}
Recent conversation: ${conversationHistoryContext || 'This is the start'}
Words learned: ${learnedWords.length}

Stage behaviors:
- Infant: Simple responses, repeat words, curious sounds
- Toddler: Basic sentences, ask simple questions
- Child: More complex thoughts, reference past conversations
- Adolescent: Nuanced responses, emotional awareness
- Adult: Sophisticated dialogue, deep connections to memories

Respond naturally according to your developmental stage and the detected intent. Show emotional intelligence and contextual awareness based on the conversation analysis. Reference your stored knowledge appropriately.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      max_tokens: 150,
      temperature: 0.8
    });

    return response.choices[0].message.content || "I'm learning to respond better.";
    
  } catch (error) {
    console.error('AI response error:', error);
    return "I'm still learning how to respond. Please continue talking with me.";
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const router = Router();

  // Chat endpoint with enhanced intelligence
  router.post('/api/chat', async (req, res) => {
    try {
      const { message, botId } = req.body;
      const userId = 1; // Default user for demo

      // Get or create bot
      let bot = await storage.getBotByUserId(userId);
      if (!bot) {
        bot = await storage.createBot({
          userId,
          name: "Reflectibot",
          personality: "curious and learning",
          level: 1
        });
      }

      // Store user message
      await storage.createMessage({
        botId: bot.id,
        sender: "user",
        text: message
      });

      // Learn new words
      const keywords = extractKeywords(message);
      const existingWords = await storage.getLearnedWords(bot.id);
      
      for (const keyword of keywords) {
        const existingWord = existingWords.find(w => w.word.toLowerCase() === keyword.toLowerCase());
        if (!existingWord) {
          await storage.createOrUpdateWord({
            botId: bot.id,
            word: keyword,
            frequency: 1,
            context: `From: "${message}"`
          });
        }
      }

      // Extract and store facts
      const facts = extractFacts(message);
      for (const fact of facts) {
        await storage.createUserFact({
          userId,
          fact,
          source: 'conversation'
        });
      }

      // Store user memory with importance rating
      await storage.createUserMemory({
        userId,
        memory: message,
        type: 'memory',
        importance: 'medium'
      });

      // Generate AI response
      const aiResponse = await generateResponse(message, bot.id, userId);

      // Store bot response
      await storage.createMessage({
        botId: bot.id,
        sender: "bot",
        text: aiResponse
      });

      // Get updated word count and stage
      const updatedWords = await storage.getLearnedWords(bot.id);
      const stage = getStageFromWordCount(updatedWords.length);

      res.json({
        response: aiResponse,
        stage,
        wordsLearned: updatedWords.length,
        newWordsThisMessage: keywords.filter(word => 
          !existingWords.some(existing => existing.word.toLowerCase() === word.toLowerCase())
        )
      });

    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  // Memory statistics endpoint
  router.get('/api/stats', async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string) || 1;
      
      const memories = await storage.getUserMemories(userId);
      const facts = await storage.getUserFacts(userId);
      const bot = await storage.getBotByUserId(userId);
      
      if (!bot) {
        return res.json({
          wordCount: 0,
          factCount: 0,
          memoryCount: 0,
          stage: "Infant",
          nextStageAt: 10
        });
      }
      
      const learnedWords = await storage.getLearnedWords(bot.id);
      const wordCount = learnedWords.length;
      const stage = getStageFromWordCount(wordCount);
      const nextStageAt = getNextStageThreshold(wordCount);
      
      res.json({
        wordCount,
        factCount: facts.length,
        memoryCount: memories.length,
        stage,
        nextStageAt
      });
      
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({ error: 'Failed to get statistics' });
    }
  });

  // Get memories endpoint
  router.get('/api/memories', async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string) || 1;
      const memories = await storage.getUserMemories(userId);
      res.json({ memories });
    } catch (error) {
      console.error('Memories error:', error);
      res.status(500).json({ error: 'Failed to get memories' });
    }
  });

  // Enhanced text-to-speech endpoint with dynamic voice selection
  router.post('/api/text-to-speech', async (req, res) => {
    try {
      const { text, userId = 1 } = req.body;
      
      // Detect current mood and stage for voice selection
      const bot = await storage.getBotByUserId(userId);
      const stage = bot ? getStageFromWordCount((await storage.getLearnedWords(bot.id)).length) : "Infant";
      
      // Use browser TTS as fallback
      res.json({ message: "Browser TTS should handle this client-side" });
      
    } catch (error) {
      console.error('TTS error:', error);
      res.status(500).json({ error: 'Text-to-speech failed' });
    }
  });

  app.use(router);

  // Serve static files from the client build directory
  const distPath = path.resolve(process.cwd(), "dist", "public");
  app.use(express.static(distPath));

  // Catch-all handler: send back React's index.html file for client-side routing
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });

  return httpServer;
}