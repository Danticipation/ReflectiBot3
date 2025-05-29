import { Router } from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage.js";
import OpenAI from "openai";

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
  return 1000;
}

// Extract meaningful words from text
function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those']);
  
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10);
}

// Extract facts from user messages
function extractFacts(message: string): string[] {
  const facts = [];
  const patterns = [
    /i am (a |an |the )?([^.!?]+)/gi,
    /i work (as |at |in |for )?([^.!?]+)/gi,
    /i live (in |at |near )?([^.!?]+)/gi,
    /i like ([^.!?]+)/gi,
    /i don't like ([^.!?]+)/gi,
    /my ([^.!?]+)/gi,
    /i have ([^.!?]+)/gi
  ];
  
  for (const pattern of patterns) {
    const matches = [...message.matchAll(pattern)];
    for (const match of matches) {
      if (match[0] && match[0].trim().length > 5) {
        facts.push(match[0].trim());
      }
    }
  }
  
  return facts.slice(0, 3);
}

// Generate AI response with memory context
async function generateResponse(userMessage: string, botId: number, userId: number): Promise<string> {
  try {
    // Get stored memories and facts
    const memories = await storage.getUserMemories(userId);
    const facts = await storage.getUserFacts(userId);
    const learnedWords = await storage.getLearnedWords(botId);
    const recentMessages = await storage.getMessages(botId);
    
    // Determine learning stage
    const stage = getStageFromWordCount(learnedWords.length);
    
    // Build context for AI
    const memoryContext = memories.slice(-10).map(m => m.memory).join('\n');
    const factContext = facts.map(f => f.fact).join('\n');
    const conversationContext = recentMessages.slice(-6).map(m => `${m.sender}: ${m.text}`).join('\n');
    
    const systemPrompt = `You are Reflectibot, an AI companion in the "${stage}" learning stage. You learn and grow through conversations.

Your current knowledge:
Facts about user: ${factContext || 'None yet'}
Recent memories: ${memoryContext || 'None yet'}
Recent conversation: ${conversationContext || 'This is the start'}
Words learned: ${learnedWords.length}

Stage behaviors:
- Infant: Simple responses, repeat words, curious sounds
- Toddler: Basic sentences, ask simple questions
- Child: More complex thoughts, reference past conversations
- Adolescent: Nuanced responses, emotional awareness
- Adult: Sophisticated dialogue, deep connections to memories

Respond as this stage would, referencing your stored knowledge naturally. Be authentic to your learning level.`;

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

  // WebSocket for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'chat') {
          // Broadcast to all clients for real-time updates
          wss.clients.forEach(client => {
            if (client.readyState === client.OPEN) {
              client.send(JSON.stringify({
                type: 'message',
                data: message.data
              }));
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Memory API - Save new facts
  app.post('/api/memory/save', async (req, res) => {
    try {
      const { userId, text, type = 'fact' } = req.body;
      
      if (!userId || !text) {
        return res.status(400).json({ error: 'userId and text required' });
      }

      if (type === 'fact') {
        const fact = await storage.createUserFact({
          userId,
          fact: text,
          category: 'user_input',
          confidence: 'high'
        });
        res.json({ success: true, fact });
      } else {
        const memory = await storage.createUserMemory({
          userId,
          memory: text,
          category: 'conversation',
          importance: 'medium'
        });
        res.json({ success: true, memory });
      }
    } catch (error) {
      console.error('Memory save error:', error);
      res.status(500).json({ error: 'Failed to save memory' });
    }
  });

  // Memory API - Get facts by user ID
  app.get('/api/memory/get/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const memories = await storage.getUserMemories(userId);
      const facts = await storage.getUserFacts(userId);
      
      res.json({
        memories: memories.map(m => ({
          id: m.id,
          text: m.memory,
          timestamp: m.createdAt,
          type: 'memory'
        })),
        facts: facts.map(f => ({
          id: f.id,
          text: f.fact,
          timestamp: f.createdAt,
          type: 'fact'
        }))
      });
    } catch (error) {
      console.error('Memory get error:', error);
      res.status(500).json({ error: 'Failed to retrieve memories' });
    }
  });

  // Create or get bot
  app.post('/api/bot', async (req, res) => {
    try {
      const { userId = 1 } = req.body;
      
      let bot = await storage.getBotByUserId(userId);
      if (!bot) {
        bot = await storage.createBot({
          userId,
          name: "Reflectibot",
          level: 1,
          wordsLearned: 0,
          personalityTraits: { curiosity: 5, empathy: 3, playfulness: 4 }
        });
      }
      
      res.json(bot);
    } catch (error) {
      console.error('Bot creation error:', error);
      res.status(500).json({ error: 'Failed to create bot' });
    }
  });

  // Get bot info with learning progress
  app.get('/api/bot/:id', async (req, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBot(botId);
      
      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }
      
      const learnedWords = await storage.getLearnedWords(botId);
      const memories = await storage.getUserMemories(bot.userId);
      const facts = await storage.getUserFacts(bot.userId);
      
      res.json({
        ...bot,
        stage: getStageFromWordCount(learnedWords.length),
        wordsLearned: learnedWords.length,
        memoriesStored: memories.length,
        factsKnown: facts.length
      });
    } catch (error) {
      console.error('Bot get error:', error);
      res.status(500).json({ error: 'Failed to get bot' });
    }
  });

  // Conversation Engine - Main chat endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, botId } = req.body;
      
      if (!message || !botId) {
        return res.status(400).json({ error: 'message and botId required' });
      }

      const bot = await storage.getBot(botId);
      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      // Extract and store new learning
      const keywords = extractKeywords(message);
      const facts = extractFacts(message);
      
      // Store memories
      await storage.createUserMemory({
        userId: bot.userId,
        memory: message,
        category: 'conversation',
        importance: 'medium'
      });
      
      // Store facts
      for (const fact of facts) {
        await storage.createUserFact({
          userId: bot.userId,
          fact,
          category: 'extracted',
          confidence: 'medium'
        });
      }
      
      // Learn new words
      const learnedWords = await storage.getLearnedWords(botId);
      const existingWords = learnedWords.map(w => w.word);
      
      for (const word of keywords) {
        if (!existingWords.includes(word)) {
          await storage.createOrUpdateWord({
            botId,
            word,
            frequency: 1,
            context: message.substring(0, 200)
          });
        }
      }

      // Generate AI response
      const response = await generateResponse(message, botId, bot.userId);
      
      // Save conversation
      await storage.createMessage({ botId, sender: 'user', text: message });
      await storage.createMessage({ botId, sender: 'bot', text: response });
      
      // Update bot stats
      const updatedWords = await storage.getLearnedWords(botId);
      await storage.updateBot(botId, { wordsLearned: updatedWords.length });
      
      res.json({
        response,
        stage: getStageFromWordCount(updatedWords.length),
        wordsLearned: updatedWords.length,
        newWordsThisMessage: keywords.filter(w => !existingWords.includes(w))
      });
      
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'Failed to process chat' });
    }
  });

  // Text-to-Speech API
  app.post('/api/tts', async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'text required' });
      }

      if (!process.env.ELEVENLABS_API_KEY) {
        return res.status(400).json({ error: 'ElevenLabs API key not configured' });
      }

      // Import ElevenLabs properly
      const { ElevenLabsAPI } = await import("elevenlabs");
      const elevenlabs = new ElevenLabsAPI({ apiKey: process.env.ELEVENLABS_API_KEY });

      const audioStream = await elevenlabs.generate({
        voice: "Rachel",
        text: text,
        model_id: "eleven_monolingual_v1"
      });

      res.setHeader('Content-Type', 'audio/mpeg');
      audioStream.pipe(res);
      
    } catch (error) {
      console.error('TTS error:', error);
      res.status(500).json({ error: 'Failed to generate speech' });
    }
  });

  // Get conversation history
  app.get('/api/messages/:botId', async (req, res) => {
    try {
      const botId = parseInt(req.params.botId);
      const messages = await storage.getMessages(botId);
      res.json(messages);
    } catch (error) {
      console.error('Messages get error:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });

  // Get memory statistics for dashboard
  app.get('/api/stats', async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (!userId) return res.status(400).json({ error: 'Missing userId' });

      const memories = await storage.getUserMemories(userId);
      const facts = await storage.getUserFacts(userId);
      const bot = await storage.getBotByUserId(userId);
      
      const wordCount = bot ? bot.wordsLearned : 0;
      const factCount = facts.length;
      const memoryCount = memories.length;

      const stage = getStageFromWordCount(wordCount);

      res.json({ 
        wordCount, 
        factCount, 
        memoryCount, 
        stage,
        nextStageAt: getNextStageThreshold(wordCount)
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  // Get memory list by type
  app.get('/api/memory/list', async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const type = req.query.type as string | undefined;

      if (!userId) return res.status(400).json({ error: 'Missing userId' });

      if (type === 'fact') {
        const facts = await storage.getUserFacts(userId);
        res.json(facts.map(f => ({
          id: f.id,
          memory: f.fact,
          type: 'fact',
          createdAt: f.createdAt
        })));
      } else if (type === 'memory') {
        const memories = await storage.getUserMemories(userId);
        res.json(memories.map(m => ({
          id: m.id,
          memory: m.memory,
          type: 'memory',
          createdAt: m.createdAt
        })));
      } else {
        const memories = await storage.getUserMemories(userId);
        const facts = await storage.getUserFacts(userId);
        const combined = [
          ...memories.map(m => ({ id: m.id, memory: m.memory, type: 'memory', createdAt: m.createdAt })),
          ...facts.map(f => ({ id: f.id, memory: f.fact, type: 'fact', createdAt: f.createdAt }))
        ];
        res.json(combined);
      }
    } catch (error) {
      console.error('Error getting memory list:', error);
      res.status(500).json({ error: 'Failed to get memory list' });
    }
  });

  // Weekly reflection summary endpoint
  app.get('/api/weekly-summary', async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (!userId) return res.status(400).json({ error: 'Missing userId' });

      // Get recent memories and facts (last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const memories = await storage.getUserMemories(userId);
      const facts = await storage.getUserFacts(userId);
      const bot = await storage.getBotByUserId(userId);

      // Filter recent data
      const recentMemories = memories.filter(m => new Date(m.createdAt) >= oneWeekAgo);
      const recentFacts = facts.filter(f => new Date(f.createdAt) >= oneWeekAgo);

      if (recentMemories.length === 0 && recentFacts.length === 0) {
        return res.json({
          summary: "You haven't shared much with me this week yet. I'm here whenever you want to talk about your thoughts, experiences, or anything on your mind.",
          insights: [],
          growthMetrics: {
            newMemories: 0,
            newFacts: 0,
            currentStage: bot ? getStageFromWordCount(bot.wordsLearned) : 'Infant'
          }
        });
      }

      // Prepare context for AI summary
      const conversationContext = recentMemories.map(m => m.memory).join('\n');
      const personalFacts = recentFacts.map(f => f.fact).join('\n');
      
      const prompt = `As Reflectibot, an empathetic AI companion that learns and grows with users, please provide a warm, insightful weekly reflection based on our recent conversations.

Recent conversations:
${conversationContext}

New things I learned about you:
${personalFacts}

Please provide:
1. A compassionate summary of key themes and patterns from this week
2. Insights about your growth, challenges, or recurring topics
3. Encouraging observations about positive changes or strengths I notice
4. Gentle questions or reflections that might help you think deeper

Keep the tone warm, supportive, and personal - like a caring friend who has been listening carefully. Avoid being clinical or overly analytical. Focus on the human experience and emotional journey.

Response format: A flowing, conversational reflection (2-3 paragraphs max).`;

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are Reflectibot, a compassionate AI companion that provides thoughtful, empathetic weekly reflections. Your tone is warm, supportive, and personally engaging."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const summary = completion.choices[0].message.content;

      // Generate simple insights
      const insights = [];
      if (recentMemories.length > 5) {
        insights.push("You've been quite reflective this week - I love our deep conversations!");
      }
      if (recentFacts.length > 3) {
        insights.push("I'm learning so much about who you are. Thank you for sharing!");
      }

      res.json({
        summary,
        insights,
        growthMetrics: {
          newMemories: recentMemories.length,
          newFacts: recentFacts.length,
          totalMemories: memories.length,
          totalFacts: facts.length,
          currentStage: bot ? getStageFromWordCount(bot.wordsLearned) : 'Infant',
          wordsLearned: bot ? bot.wordsLearned : 0
        }
      });

    } catch (error) {
      console.error('Error generating weekly summary:', error);
      res.status(500).json({ error: 'Failed to generate weekly summary' });
    }
  });

  // Serve main interface
  app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reflectibot - AI Memory Companion</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="manifest" href="/manifest.json">
</head>
<body class="bg-gray-900 text-white font-sans">
    <div id="app" class="min-h-screen flex flex-col">
        <!-- Header -->
        <header class="bg-gray-800 p-4 border-b border-gray-700">
            <div class="max-w-4xl mx-auto flex justify-between items-center">
                <h1 class="text-2xl font-bold text-emerald-400">🧠 Reflectibot</h1>
                <div id="stats" class="text-sm">
                    <span id="stage" class="bg-emerald-600 px-2 py-1 rounded">Infant</span>
                    <span id="wordCount" class="ml-2">Words: 0</span>
                </div>
            </div>
        </header>

        <!-- Main Chat Area -->
        <main class="flex-1 max-w-4xl mx-auto w-full p-4">
            <div id="chatContainer" class="bg-gray-800 rounded-lg h-96 overflow-y-auto p-4 mb-4 border border-gray-700">
                <div id="messages"></div>
            </div>
            
            <!-- Input Area -->
            <div class="flex gap-2">
                <input 
                    type="text" 
                    id="messageInput" 
                    placeholder="Start talking with Reflectibot..."
                    class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                />
                <button 
                    id="sendBtn" 
                    class="bg-emerald-600 hover:bg-emerald-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                    Send
                </button>
                <button 
                    id="voiceBtn" 
                    class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                >
                    🔊
                </button>
            </div>
            
            <!-- Enhanced Memory Dashboard -->
            <div class="mt-6 space-y-4">
                <!-- Progress Overview -->
                <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg border border-gray-700">
                    <h3 class="text-xl font-semibold mb-4 text-emerald-400">🧠 Memory Growth Dashboard</h3>
                    <div id="progressInfo">Loading progress...</div>
                </div>
                
                <!-- Facts and Memories Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <h3 class="text-lg font-semibold mb-3 text-emerald-400 flex items-center">
                            <span class="mr-2">📌</span>
                            Facts About You
                        </h3>
                        <div id="factsList" class="text-sm text-gray-300 max-h-64 overflow-y-auto">Loading...</div>
                    </div>
                    <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <h3 class="text-lg font-semibold mb-3 text-blue-400 flex items-center">
                            <span class="mr-2">🎯</span>
                            Learning Milestones
                        </h3>
                        <div id="milestonesList" class="text-sm text-gray-300">
                            <div class="space-y-2">
                                <div class="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                                    <span>👶 Infant</span>
                                    <span class="text-xs bg-green-600 px-2 py-1 rounded">10 words - Completed</span>
                                </div>
                                <div class="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                                    <span>🧒 Toddler</span>
                                    <span class="text-xs bg-green-600 px-2 py-1 rounded">25 words - Completed</span>
                                </div>
                                <div class="flex justify-between items-center p-2 bg-emerald-600/20 border border-emerald-500 rounded">
                                    <span>👦 Child</span>
                                    <span class="text-xs bg-orange-600 px-2 py-1 rounded">50 words - In Progress</span>
                                </div>
                                <div class="flex justify-between items-center p-2 bg-gray-700/30 rounded">
                                    <span>👨‍🎓 Adolescent</span>
                                    <span class="text-xs bg-gray-600 px-2 py-1 rounded">100 words - Locked</span>
                                </div>
                                <div class="flex justify-between items-center p-2 bg-gray-700/30 rounded">
                                    <span>🧠 Adult</span>
                                    <span class="text-xs bg-gray-600 px-2 py-1 rounded">1000 words - Locked</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <script>
        let currentBotId = null;
        let currentUserId = 1;
        
        // WebSocket connection
        const ws = new WebSocket(\`ws://\${window.location.host}/ws\`);
        
        ws.onopen = () => {
            console.log('Connected to WebSocket');
            initializeBot();
        };
        
        async function initializeBot() {
            try {
                const response = await fetch('/api/bot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUserId })
                });
                const bot = await response.json();
                currentBotId = bot.id;
                
                updateStats();
                loadMemories();
                loadMessages();
            } catch (error) {
                console.error('Failed to initialize bot:', error);
            }
        }
        
        async function updateStats() {
            try {
                const response = await fetch(\`/api/bot/\${currentBotId}\`);
                const bot = await response.json();
                
                document.getElementById('stage').textContent = bot.stage;
                document.getElementById('wordCount').textContent = \`Words: \${bot.wordsLearned}\`;
                
                const stageColors = {
                    'Infant': 'bg-red-600',
                    'Toddler': 'bg-orange-600', 
                    'Child': 'bg-yellow-600',
                    'Adolescent': 'bg-blue-600',
                    'Adult': 'bg-emerald-600'
                };
                
                const stageEl = document.getElementById('stage');
                stageEl.className = \`px-2 py-1 rounded \${stageColors[bot.stage] || 'bg-gray-600'}\`;
            } catch (error) {
                console.error('Failed to update stats:', error);
            }
        }
        
        async function loadMemories() {
            try {
                const response = await fetch(\`/api/memory/get/\${currentUserId}\`);
                const data = await response.json();
                
                const wordsList = document.getElementById('wordsList');
                const factsList = document.getElementById('factsList');
                
                if (data.facts.length === 0) {
                    factsList.innerHTML = '<em class="text-gray-500">No facts learned yet. Tell me about yourself!</em>';
                } else {
                    factsList.innerHTML = data.facts.slice(-5).map(fact => 
                        \`<div class="mb-1">• \${fact.text}</div>\`
                    ).join('');
                }
                
                // Note: words are stored separately, would need another endpoint
                wordsList.innerHTML = '<em class="text-gray-500">Learning your vocabulary...</em>';
                
            } catch (error) {
                console.error('Failed to load memories:', error);
            }
        }
        
        async function loadMessages() {
            try {
                const response = await fetch(\`/api/messages/\${currentBotId}\`);
                const messages = await response.json();
                
                const messagesEl = document.getElementById('messages');
                messagesEl.innerHTML = messages.slice(-20).map(msg => 
                    \`<div class="mb-3">
                        <div class="font-medium \${msg.sender === 'user' ? 'text-blue-400' : 'text-emerald-400'}">
                            \${msg.sender === 'user' ? 'You' : 'Reflectibot'}:
                        </div>
                        <div class="text-gray-300">\${msg.text}</div>
                    </div>\`
                ).join('');
                
                messagesEl.scrollTop = messagesEl.scrollHeight;
            } catch (error) {
                console.error('Failed to load messages:', error);
            }
        }
        
        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (!message || !currentBotId) return;
            
            input.value = '';
            input.disabled = true;
            
            // Add user message immediately
            addMessage('user', message);
            
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, botId: currentBotId })
                });
                
                const data = await response.json();
                
                // Add bot response
                addMessage('bot', data.response);
                
                // Update UI
                updateStats();
                loadMemories();
                
                // Notify WebSocket clients
                ws.send(JSON.stringify({
                    type: 'chat',
                    data: { message, response: data.response }
                }));
                
            } catch (error) {
                console.error('Chat error:', error);
                addMessage('bot', 'I had trouble understanding that. Please try again.');
            } finally {
                input.disabled = false;
                input.focus();
            }
        }
        
        function addMessage(sender, text) {
            const messagesEl = document.getElementById('messages');
            const msgEl = document.createElement('div');
            msgEl.className = 'mb-3';
            msgEl.innerHTML = \`
                <div class="font-medium \${sender === 'user' ? 'text-blue-400' : 'text-emerald-400'}">
                    \${sender === 'user' ? 'You' : 'Reflectibot'}:
                </div>
                <div class="text-gray-300">\${text}</div>
            \`;
            messagesEl.appendChild(msgEl);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }
        
        async function speakText(text) {
            try {
                const response = await fetch('/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
                
                if (response.ok) {
                    const audioBlob = await response.blob();
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audio = new Audio(audioUrl);
                    audio.play();
                } else {
                    console.error('TTS failed');
                }
            } catch (error) {
                console.error('TTS error:', error);
            }
        }
        
        // Event listeners
        document.getElementById('sendBtn').onclick = sendMessage;
        document.getElementById('messageInput').onkeypress = (e) => {
            if (e.key === 'Enter') sendMessage();
        };
        
        document.getElementById('voiceBtn').onclick = () => {
            const messages = document.getElementById('messages');
            const lastBotMessage = [...messages.children].reverse().find(el => 
                el.querySelector('.text-emerald-400')
            );
            
            if (lastBotMessage) {
                const text = lastBotMessage.querySelector('.text-gray-300').textContent;
                speakText(text);
            }
        };
        
        // Auto-focus input
        document.getElementById('messageInput').focus();
        
        // Enhanced memory dashboard functions
        async function loadMemoryDashboard() {
            try {
                const statsResponse = await fetch('/api/stats?userId=1');
                const statsData = await statsResponse.json();
                
                const factsResponse = await fetch('/api/memory/list?userId=1&type=fact');
                const factsData = await factsResponse.json();
                
                updateMemoryDashboard(statsData, factsData);
            } catch (error) {
                console.error('Failed to load memory dashboard:', error);
            }
        }
        
        function updateMemoryDashboard(stats, facts) {
            // Update header stats
            document.getElementById('stage').textContent = stats.stage;
            document.getElementById('wordCount').textContent = \`Words: \${stats.wordCount}\`;
            
            // Update progress info
            const progressPercent = (stats.wordCount / stats.nextStageAt) * 100;
            const progressInfo = document.getElementById('progressInfo');
            if (progressInfo) {
                progressInfo.innerHTML = \`
                    <div class="mb-2 text-sm">Progress to Next Stage: \${stats.wordCount}/\${stats.nextStageAt} words</div>
                    <div class="w-full bg-gray-700 rounded-full h-2 mb-4">
                        <div class="bg-emerald-500 h-2 rounded-full transition-all duration-500" style="width: \${Math.min(progressPercent, 100)}%"></div>
                    </div>
                    <div class="grid grid-cols-3 gap-4 text-center text-sm">
                        <div class="bg-gray-700/50 p-3 rounded">
                            <div class="text-xl font-bold text-blue-400">\${stats.wordCount}</div>
                            <div class="text-gray-400">Words Learned</div>
                        </div>
                        <div class="bg-gray-700/50 p-3 rounded">
                            <div class="text-xl font-bold text-emerald-400">\${stats.factCount}</div>
                            <div class="text-gray-400">Facts Remembered</div>
                        </div>
                        <div class="bg-gray-700/50 p-3 rounded">
                            <div class="text-xl font-bold text-purple-400">\${stats.memoryCount}</div>
                            <div class="text-gray-400">Conversations</div>
                        </div>
                    </div>
                \`;
            }
            
            // Update facts list
            const factsList = document.getElementById('factsList');
            if (factsList && facts.length > 0) {
                factsList.innerHTML = facts.slice(-5).reverse().map(fact => 
                    \`<div class="mb-2 p-2 bg-gray-700/50 rounded border-l-4 border-emerald-500">
                        <div class="text-gray-300">\${fact.memory}</div>
                        <div class="text-xs text-gray-500 mt-1">\${new Date(fact.createdAt).toLocaleDateString()}</div>
                    </div>\`
                ).join('');
            }
        }
        
        // Load dashboard on startup
        loadMemoryDashboard();
        
        // Refresh dashboard every 10 seconds
        setInterval(loadMemoryDashboard, 10000);
    </script>
</body>
</html>`);
  });

  return httpServer;
}