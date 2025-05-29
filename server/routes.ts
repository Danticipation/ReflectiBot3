import { createServer, type Server } from "http";
import { Express } from "express";
import { storage } from "./storage";
import { z } from "zod";
import path from "path";

// Simple NLP for extracting keywords
function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their']);
  
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10);
}

function generateBotResponse(userMessage: string, bot: any, learnedWords: any[]): string {
  const level = bot.level || 1;
  const personality = bot.personalityTraits || {};
  
  // Basic mirroring responses based on level
  const userWords = extractKeywords(userMessage);
  const knownWords = learnedWords.map(w => w.word);
  const sharedWords = userWords.filter(word => knownWords.includes(word));
  
  if (level === 1) {
    // Infant stage - simple repetition
    if (sharedWords.length > 0) {
      return `${sharedWords[0]}... ${sharedWords[0]}?`;
    }
    return "Goo goo... *mimics your sounds*";
  } else if (level === 2) {
    // Child stage - basic sentences
    if (sharedWords.length > 0) {
      return `I learned "${sharedWords[0]}" from you! Tell me more about ${sharedWords[0]}.`;
    }
    return "I'm learning new words from you! What does that mean?";
  } else if (level === 3) {
    // Adolescent - more complex mirroring
    if (sharedWords.length > 1) {
      return `I remember you talking about ${sharedWords.join(' and ')}. I'm starting to understand your style.`;
    }
    return "I'm beginning to mirror your way of speaking. Keep teaching me!";
  } else {
    // Adult - sophisticated mirroring
    const enthusiasm = personality.enthusiasm || 1;
    const humor = personality.humor || 1;
    
    let response = "I've been learning from you, and I notice ";
    if (enthusiasm > 3) response += "you're very enthusiastic! ";
    if (humor > 3) response += "you have a great sense of humor! ";
    if (sharedWords.length > 0) {
      response += `We often discuss ${sharedWords.slice(0, 2).join(' and ')}.`;
    }
    return response || "I'm becoming more like you every day.";
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Catch-all handler: send back React's index.html file for SPA routing
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(process.cwd(), 'dist/public', 'index.html'));
    }
  });

  // Create a new bot
  app.post("/api/bot", async (req, res) => {
    try {
      const bot = await storage.createBot({
        userId: 1,
        name: "Mirror",
        level: 1,
        wordsLearned: 0,
        personalityTraits: {
          enthusiasm: 1,
          humor: 1,
          curiosity: 2
        }
      });
      res.json(bot);
    } catch (error) {
      res.status(500).json({ error: "Failed to create bot" });
    }
  });

  // Get bot by ID
  app.get("/api/bot/:id", async (req, res) => {
    try {
      const bot = await storage.getBot(parseInt(req.params.id));
      if (!bot) {
        return res.status(404).json({ error: "Bot not found" });
      }
      res.json(bot);
    } catch (error) {
      res.status(500).json({ error: "Failed to get bot" });
    }
  });

  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, botId } = req.body;
      
      if (!message || !botId) {
        return res.status(400).json({ error: "Message and botId are required" });
      }

      // Get bot and learned words
      const bot = await storage.getBot(botId);
      if (!bot) {
        return res.status(404).json({ error: "Bot not found" });
      }

      const learnedWords = await storage.getLearnedWords(botId);
      
      // Store user message
      await storage.createMessage({
        botId,
        content: message,
        isUser: true
      });

      // Extract and learn new words
      const keywords = extractKeywords(message);
      const newWords: string[] = [];
      
      for (const word of keywords) {
        try {
          const learned = await storage.createOrUpdateWord({
            botId,
            word,
            context: message,
            frequency: 1
          });
          
          if (learned.frequency === 1) {
            newWords.push(word);
          }
        } catch (error) {
          // Word already exists, just continue
        }
      }

      // Generate bot response
      const botResponse = generateBotResponse(message, bot, learnedWords);
      
      // Store bot response
      await storage.createMessage({
        botId,
        content: botResponse,
        isUser: false
      });

      // Update bot stats
      const updatedWordsCount = bot.wordsLearned + newWords.length;
      let newLevel = bot.level;
      
      // Level up logic
      if (updatedWordsCount >= 10 && bot.level === 1) {
        newLevel = 2;
      } else if (updatedWordsCount >= 25 && bot.level === 2) {
        newLevel = 3;
      } else if (updatedWordsCount >= 50 && bot.level === 3) {
        newLevel = 4;
      }

      // Update personality traits
      const personalityTraits = Object.assign({}, bot.personalityTraits || { enthusiasm: 1, humor: 1, curiosity: 2 });
      const enthusiasmWords = ['love', 'amazing', 'awesome', 'great', 'fantastic'];
      const humorWords = ['funny', 'hilarious', 'joke', 'laugh', 'lol'];
      
      if (keywords.some(word => enthusiasmWords.includes(word)) || message.includes('!')) {
        personalityTraits.enthusiasm = Math.min(5, (personalityTraits.enthusiasm || 1) + 0.1);
      }
      if (keywords.some(word => humorWords.includes(word))) {
        personalityTraits.humor = Math.min(5, (personalityTraits.humor || 1) + 0.1);
      }

      await storage.updateBot(botId, {
        wordsLearned: updatedWordsCount,
        level: newLevel,
        personalityTraits
      });

      res.json({
        response: botResponse,
        newWords,
        level: newLevel,
        wordsLearned: updatedWordsCount
      });

    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // Text-to-speech endpoint
  app.post("/api/text-to-speech", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const headers: Record<string, string> = {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY!
      };

      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());

      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      });

      return res.send(audioBuffer);
    } catch (error) {
      console.error('Text-to-speech error:', error);
      res.status(500).json({ error: 'Failed to generate speech' });
    }
  });

  // Get messages for a bot
  app.get("/api/bot/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getMessages(parseInt(req.params.id));
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  // Get learned words for a bot
  app.get("/api/bot/:id/words", async (req, res) => {
    try {
      const words = await storage.getLearnedWords(parseInt(req.params.id));
      res.json(words);
    } catch (error) {
      res.status(500).json({ error: "Failed to get learned words" });
    }
  });

  // Get milestones for a bot
  app.get("/api/bot/:id/milestones", async (req, res) => {
    try {
      const milestones = await storage.getMilestones(parseInt(req.params.id));
      res.json(milestones);
    } catch (error) {
      res.status(500).json({ error: "Failed to get milestones" });
    }
  });

  return httpServer;
}