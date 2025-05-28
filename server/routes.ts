import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertBotSchema, insertMessageSchema, type ChatMessage, type LearningUpdate } from "@shared/schema";
import { z } from "zod";

// Simple NLP for extracting keywords
function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their']);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10); // Limit to 10 keywords per message
}

function generateBotResponse(userMessage: string, bot: any, learnedWords: any[]): string {
  const keywords = extractKeywords(userMessage);
  const knownWords = learnedWords.map(w => w.word.toLowerCase());
  const newWords = keywords.filter(word => !knownWords.includes(word));
  
  // Simple response generation based on bot level
  if (bot.level === 1) {
    // Level 1: Simple repetition
    if (newWords.length > 0) {
      return `${userMessage}! I learn: ${newWords.join(', ')}! 🤖`;
    }
    return `${userMessage}! I remember!`;
  } else if (bot.level === 2) {
    // Level 2: Mix repetition with simple understanding
    const responses = [
      `I think I understand! ${userMessage.split(' ').slice(0, 3).join(' ')}... right?`,
      `That's interesting! I'm learning about ${keywords.slice(0, 2).join(' and ')}.`,
      `${userMessage}! I'm getting better at this! 🧠`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  } else {
    // Level 3+: More sophisticated responses
    const enthusiasmWords = ['amazing', 'awesome', 'love', 'great', 'fantastic'];
    const isEnthusiastic = keywords.some(word => enthusiasmWords.includes(word)) || userMessage.includes('!');
    
    if (isEnthusiastic) {
      return `I can feel your excitement! ${keywords.slice(0, 2).join(' and ')} seems really important to you! 🎉`;
    }
    
    const responses = [
      `I'm starting to understand your perspective on ${keywords[0] || 'this'}. Tell me more!`,
      `That's fascinating! I think I'm developing my own thoughts about ${keywords.slice(0, 2).join(' and ')}.`,
      `Your way of expressing things is helping me grow. I notice you often mention ${keywords[0] || 'interesting things'}! 🤔`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');
    
    ws.on('message', async (data: Buffer) => {
      try {
        const message: ChatMessage = JSON.parse(data.toString());
        
        if (message.type === 'user_message') {
          // Store user message
          await storage.createMessage({
            botId: message.botId,
            content: message.content!,
            isUser: true
          });
          
          // Get bot and learned words
          const bot = await storage.getBot(message.botId);
          const learnedWords = await storage.getLearnedWords(message.botId);
          
          if (!bot) {
            ws.send(JSON.stringify({ type: 'error', content: 'Bot not found' }));
            return;
          }
          
          // Extract and learn new words
          const keywords = extractKeywords(message.content!);
          const newWords: string[] = [];
          
          for (const word of keywords) {
            const learned = await storage.createOrUpdateWord({
              botId: message.botId,
              word,
              context: message.content!,
              frequency: 1
            });
            
            if (learned.frequency === 1) {
              newWords.push(word);
            }
          }
          
          // Update bot stats
          const updatedWordsCount = bot.wordsLearned + newWords.length;
          let newLevel = bot.level;
          let levelUp = false;
          
          // Level up logic
          if (updatedWordsCount >= 50 && bot.level === 1) {
            newLevel = 2;
            levelUp = true;
          } else if (updatedWordsCount >= 100 && bot.level === 2) {
            newLevel = 3;
            levelUp = true;
          } else if (updatedWordsCount >= 200 && bot.level === 3) {
            newLevel = 4;
            levelUp = true;
          }
          
          // Update personality traits based on user input
          const personalityTraits = { ...bot.personalityTraits } as Record<string, number>;
          const enthusiasmWords = ['love', 'amazing', 'awesome', 'great', 'fantastic'];
          const humorWords = ['funny', 'hilarious', 'joke', 'laugh', 'lol'];
          const curiosityWords = ['why', 'how', 'what', 'wonder', 'think'];
          
          if (keywords.some(word => enthusiasmWords.includes(word)) || message.content!.includes('!')) {
            personalityTraits.enthusiasm = Math.min(5, (personalityTraits.enthusiasm || 1) + 0.1);
          }
          if (keywords.some(word => humorWords.includes(word))) {
            personalityTraits.humor = Math.min(5, (personalityTraits.humor || 1) + 0.1);
          }
          if (keywords.some(word => curiosityWords.includes(word)) || message.content!.includes('?')) {
            personalityTraits.curiosity = Math.min(5, (personalityTraits.curiosity || 1) + 0.1);
          }
          
          await storage.updateBot(message.botId, {
            wordsLearned: updatedWordsCount,
            level: newLevel,
            personalityTraits
          });
          
          // Check for milestones
          if (levelUp) {
            await storage.createMilestone({
              botId: message.botId,
              title: `Reached Level ${newLevel}!`,
              description: `Advanced to intelligence level ${newLevel}`
            });
          }
          
          if (updatedWordsCount === 100) {
            await storage.createMilestone({
              botId: message.botId,
              title: "First 100 Words!",
              description: "Learned my first 100 words from you"
            });
          }
          
          if (newWords.includes('sarcasm') || newWords.includes('sarcastic')) {
            await storage.createMilestone({
              botId: message.botId,
              title: "Learned Sarcasm",
              description: "Now I understand sarcasm!"
            });
          }
          
          // Generate bot response
          const botResponse = generateBotResponse(message.content!, bot, learnedWords);
          
          // Store bot response
          await storage.createMessage({
            botId: message.botId,
            content: botResponse,
            isUser: false
          });
          
          // Send bot response
          ws.send(JSON.stringify({
            type: 'bot_response',
            content: botResponse,
            botId: message.botId
          }));
          
          // Send learning update if there are new words
          if (newWords.length > 0 || levelUp) {
            const learningUpdate: LearningUpdate = {
              newWords,
              levelUp,
              personalityUpdate: personalityTraits
            };
            
            ws.send(JSON.stringify({
              type: 'learning_update',
              botId: message.botId,
              data: learningUpdate
            }));
          }
          
          // Send milestone if achieved
          if (levelUp || updatedWordsCount === 100 || newWords.includes('sarcasm')) {
            ws.send(JSON.stringify({
              type: 'milestone_achieved',
              botId: message.botId
            }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', content: 'Failed to process message' }));
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  // REST API routes
  app.post('/api/bot', async (req, res) => {
    try {
      const botData = insertBotSchema.parse(req.body);
      const bot = await storage.createBot(botData);
      res.json(bot);
    } catch (error) {
      res.status(400).json({ error: 'Invalid bot data' });
    }
  });

  app.get('/api/bot/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bot = await storage.getBot(id);
      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }
      res.json(bot);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get bot' });
    }
  });

  app.get('/api/bot/:id/messages', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const messages = await storage.getMessages(id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });

  app.get('/api/bot/:id/words', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const words = await storage.getLearnedWords(id);
      res.json(words);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get learned words' });
    }
  });

  app.get('/api/bot/:id/milestones', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const milestones = await storage.getMilestones(id);
      res.json(milestones);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get milestones' });
    }
  });

  return httpServer;
}
