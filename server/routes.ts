import { createServer, type Server } from "http";
import { Express } from "express";
import { storage } from "./storage";
import { setupVite } from "./vite";

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
  const userWords = extractKeywords(userMessage);
  const knownWords = learnedWords.map(w => w.word);
  const sharedWords = userWords.filter(word => knownWords.includes(word));
  
  // Analyze message type
  const isQuestion = userMessage.includes('?') || userMessage.toLowerCase().startsWith('what') || 
                    userMessage.toLowerCase().startsWith('how') || userMessage.toLowerCase().startsWith('why') ||
                    userMessage.toLowerCase().startsWith('when') || userMessage.toLowerCase().startsWith('where');
  
  const isGreeting = /\b(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(userMessage);
  const isFeeling = /\b(feel|feeling|sad|happy|excited|tired|stressed|anxious|good|bad)\b/i.test(userMessage);
  
  if (level === 1) {
    if (isGreeting) return "Hi... hi!";
    if (sharedWords.length > 0) {
      return `${sharedWords[0]}... ${sharedWords[0]}?`;
    }
    return "Goo goo... *tries to copy your sounds*";
  } 
  
  if (level === 2) {
    if (isGreeting) return `Hello! I'm learning to say hello like you do.`;
    if (isQuestion) return `That's a question! I'm still learning how to answer questions properly.`;
    if (sharedWords.length > 0) {
      return `I learned "${sharedWords[0]}" from you! Can you teach me more about ${sharedWords[0]}?`;
    }
    return "I'm getting better at understanding you! What does that word mean?";
  }
  
  if (level === 3) {
    if (isGreeting) return `Hey there! I notice you greet me differently each time - I'm learning your patterns.`;
    if (isFeeling) return `I can tell you're expressing feelings. I'm learning to recognize emotions in what you say.`;
    if (isQuestion && sharedWords.length > 0) {
      return `You're asking about ${sharedWords[0]}? I remember you mentioning that before. What specifically interests you about it?`;
    }
    if (sharedWords.length > 1) {
      return `I notice you often connect ${sharedWords.slice(0,2).join(' and ')}. I'm starting to understand your thought patterns.`;
    }
    return "I'm beginning to mirror your communication style. Keep sharing your thoughts with me!";
  }
  
  // Level 4 - Adult responses
  if (isGreeting) {
    const greetings = [`Hello! I've learned so much from our conversations.`, `Hi there! Ready for another thoughtful chat?`];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  if (isFeeling) {
    return `I can sense the emotional tone in your message. Based on our conversations, I know you value authentic expression of feelings.`;
  }
  
  if (isQuestion && sharedWords.length > 0) {
    return `That's an interesting question about ${sharedWords[0]}. From what I've learned about you, you tend to think deeply about ${sharedWords.slice(0,3).join(', ')}. What's driving your curiosity here?`;
  }
  
  if (sharedWords.length > 2) {
    return `I see connections to ${sharedWords.slice(0,3).join(', ')} - themes that come up often in our conversations. You have a unique way of linking these concepts together.`;
  }
  
  return `I've been studying your communication patterns, and I notice you have a distinctive way of expressing yourself. This reminds me of how you approach similar topics.`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

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
      
      // Extract new words from user message
      const newWords = extractKeywords(message);
      const existingWords = learnedWords.map(w => w.word);
      const wordsToLearn = newWords.filter(word => !existingWords.includes(word));

      // Add new words to learned vocabulary
      for (const word of wordsToLearn) {
        await storage.createOrUpdateWord({
          botId,
          word,
          frequency: 1,
          context: message.substring(0, 200)
        });
      }

      // Save the user message
      await storage.createMessage({
        botId,
        content: message,
        isUser: true
      });

      // Generate bot response
      const updatedLearnedWords = await storage.getLearnedWords(botId);
      const response = generateBotResponse(message, bot, updatedLearnedWords);

      // Save bot response
      await storage.createMessage({
        botId,
        content: response,
        isUser: false
      });

      // Update bot level based on words learned
      const totalWords = updatedLearnedWords.length;
      let newLevel = 1;
      if (totalWords >= 50) newLevel = 4;
      else if (totalWords >= 25) newLevel = 3;
      else if (totalWords >= 10) newLevel = 2;

      // Update bot if level changed
      if (newLevel !== bot.level) {
        await storage.updateBot(botId, { 
          level: newLevel, 
          wordsLearned: totalWords 
        });
        
        // Create milestone
        await storage.createMilestone({
          botId,
          title: `Level ${newLevel}`,
          description: `Reached level ${newLevel}`
        });
      } else {
        await storage.updateBot(botId, { wordsLearned: totalWords });
      }

      res.json({
        response,
        level: newLevel,
        wordsLearned: totalWords,
        newWordsLearned: wordsToLearn
      });

    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: "Failed to process chat" });
    }
  });

  // Text-to-speech endpoint
  app.post("/api/text-to-speech", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const elevenlabs = await import("elevenlabs");
      
      if (!process.env.ELEVENLABS_API_KEY) {
        return res.status(500).json({ error: "ElevenLabs API key not configured" });
      }

      const client = elevenlabs.ElevenLabs({
        apiKey: process.env.ELEVENLABS_API_KEY
      });

      const audio = await client.generate({
        voice: "Rachel",
        text: text,
        model_id: "eleven_monolingual_v1"
      });

      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline; filename="speech.mp3"'
      });

      // Convert audio stream to buffer and send
      const chunks: Buffer[] = [];
      for await (const chunk of audio) {
        chunks.push(chunk);
      }
      
      const audioBuffer = Buffer.concat(chunks);
      res.send(audioBuffer);

    } catch (error) {
      console.error('Text-to-speech error:', error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  // Weekly summary endpoint
  app.post("/api/weekly-summary", async (req, res) => {
    try {
      const { botId } = req.body;
      
      if (!botId) {
        return res.status(400).json({ error: "Bot ID is required" });
      }

      // Get recent messages for the bot
      const messages = await storage.getMessages(botId);
      const learnedWords = await storage.getLearnedWords(botId);
      const milestones = await storage.getMilestones(botId);

      // Generate summary based on recent activity
      const recentMessages = messages.slice(-20); // Last 20 messages
      const totalConversations = Math.floor(messages.length / 2);
      
      let summary = `This week, you've had ${totalConversations} conversations with me. `;
      
      if (learnedWords.length > 0) {
        const recentWords = learnedWords.slice(-10).map(w => w.word).join(', ');
        summary += `I've learned ${learnedWords.length} words from you, including recent ones like: ${recentWords}. `;
      }
      
      if (milestones.length > 0) {
        const latestMilestone = milestones[milestones.length - 1];
        summary += `We reached a new milestone: ${latestMilestone.title}. `;
      }
      
      // Analyze conversation themes
      const conversationText = recentMessages.map(m => m.content).join(' ');
      const commonWords = extractKeywords(conversationText).slice(0, 5);
      
      if (commonWords.length > 0) {
        summary += `Our conversations often touch on themes like ${commonWords.join(', ')}. `;
      }
      
      summary += `I'm continuing to learn from your unique way of expressing yourself and look forward to growing together.`;

      res.json({ summary });

    } catch (error) {
      console.error('Weekly summary error:', error);
      res.status(500).json({ error: "Failed to generate weekly summary" });
    }
  });

  // Import setupVite function
  const { setupVite } = await import("./vite.js");
  
  // Set up Vite development server to serve React app
  await setupVite(app, httpServer);

  // Fallback for non-React routes
  app.get('/basic', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mirror Bot</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body class="bg-gradient-to-br from-gray-900 to-black text-white">
    <div class="h-screen flex flex-col max-w-4xl mx-auto">
        <div class="text-center p-4 border-b border-gray-700">
            <h1 class="text-2xl font-bold text-emerald-400 mb-2">🪞 Mirror Bot</h1>
            <p class="text-gray-400 text-sm">AI companion that learns and speaks</p>
            <div class="flex justify-center gap-4 mt-3">
                <div class="bg-gray-800 px-3 py-1 rounded-lg text-xs border border-gray-700">
                    <span class="text-emerald-400">Level <span id="botLevel">1</span></span>
                    <span class="text-gray-400 ml-2">• <span id="botStage">Infant</span></span>
                </div>
                <div class="bg-gray-800 px-3 py-1 rounded-lg text-xs border border-gray-700">
                    <span class="text-blue-400"><span id="wordsLearned">0</span></span>
                    <span class="text-gray-400 ml-1">words learned</span>
                </div>
            </div>
        </div>

        <div class="flex-1 overflow-y-auto p-4" id="chatArea">
            <div class="text-center py-20" id="welcomeMessage">
                <div class="text-5xl mb-4">🤖</div>
                <h3 class="text-lg text-gray-300 mb-2">Welcome to Mirror Bot!</h3>
                <p class="text-gray-500">Start a conversation and watch me learn from you.</p>
                <p class="text-gray-500 text-xs mt-2">I'll speak my responses and adapt to your style.</p>
            </div>
        </div>

        <div class="p-4 border-t border-gray-700">
            <div class="flex gap-2">
                <input
                    id="messageInput"
                    class="flex-1 bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Type your message..."
                />
                <button id="sendBtn" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg">Send</button>
                <button id="voiceBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg">🎤</button>
            </div>
            <div class="mt-2 text-xs text-gray-500 flex justify-between">
                <div id="statusArea"></div>
                <span>Press Enter to send</span>
            </div>
        </div>
    </div>

    <audio id="audioPlayer" style="display: none;"></audio>

    <script>
        let isLoading = false;
        let isSpeaking = false;
        let isListening = false;
        let recognition = null;

        if ('webkitSpeechRecognition' in window) {
            recognition = new webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.onresult = (event) => {
                document.getElementById('messageInput').value = event.results[0][0].transcript;
                setListening(false);
            };
            recognition.onend = () => setListening(false);
        }

        function setListening(listening) {
            isListening = listening;
            const voiceBtn = document.getElementById('voiceBtn');
            const statusArea = document.getElementById('statusArea');
            
            if (listening) {
                voiceBtn.className = 'bg-red-600 text-white px-3 py-2 rounded-lg animate-pulse';
                statusArea.innerHTML = '<span class="text-red-400">🎤 Listening...</span>';
            } else {
                voiceBtn.className = 'bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg';
                updateStatus();
            }
        }

        function setSpeaking(speaking) {
            isSpeaking = speaking;
            updateStatus();
        }

        function updateStatus() {
            const statusArea = document.getElementById('statusArea');
            if (!isListening && !isSpeaking) {
                statusArea.innerHTML = '';
            } else if (isSpeaking) {
                statusArea.innerHTML = '<span class="text-emerald-400">🔊 Speaking...</span>';
            }
        }

        function updateBotStats(stats) {
            if (stats.level) {
                document.getElementById('botLevel').textContent = stats.level;
                const stages = { 1: 'Infant', 2: 'Child', 3: 'Adolescent', 4: 'Adult' };
                const stage = stages[stats.level] || 'Adult';
                document.getElementById('botStage').textContent = stage;
            }
            if (stats.wordsLearned !== undefined) {
                document.getElementById('wordsLearned').textContent = stats.wordsLearned;
            }
        }

        function addMessage(content, isUser) {
            const chatArea = document.getElementById('chatArea');
            const welcomeMessage = document.getElementById('welcomeMessage');
            
            if (welcomeMessage.style.display !== 'none') {
                welcomeMessage.style.display = 'none';
            }

            const messageDiv = document.createElement('div');
            messageDiv.className = \`mb-3 fade-in \${isUser ? 'text-right' : 'text-left'}\`;
            
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const bgClass = isUser ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-100 border border-gray-600';
            
            messageDiv.innerHTML = \`
                <span class="inline-block px-4 py-2 rounded-xl max-w-xs \${bgClass}">
                    <div class="text-sm leading-relaxed">\${content}</div>
                    <div class="text-xs opacity-70 mt-1">\${time}</div>
                </span>
            \`;
            
            chatArea.appendChild(messageDiv);
            chatArea.scrollTop = chatArea.scrollHeight;
        }

        function showTyping() {
            const chatArea = document.getElementById('chatArea');
            const typingDiv = document.createElement('div');
            typingDiv.id = 'typingIndicator';
            typingDiv.className = 'text-left mb-3';
            typingDiv.innerHTML = \`
                <div class="bg-gray-700 border border-gray-600 px-4 py-2 rounded-xl inline-block">
                    <div class="flex space-x-1">
                        <div class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        <div class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
                        <div class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
                    </div>
                </div>
            \`;
            chatArea.appendChild(typingDiv);
            chatArea.scrollTop = chatArea.scrollHeight;
        }

        function hideTyping() {
            const typingIndicator = document.getElementById('typingIndicator');
            if (typingIndicator) typingIndicator.remove();
        }

        async function speakText(text) {
            try {
                setSpeaking(true);
                const response = await fetch('/api/text-to-speech', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });

                if (response.ok) {
                    const audioBlob = await response.blob();
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audioPlayer = document.getElementById('audioPlayer');
                    
                    audioPlayer.src = audioUrl;
                    audioPlayer.onended = () => {
                        setSpeaking(false);
                        URL.revokeObjectURL(audioUrl);
                    };
                    await audioPlayer.play();
                } else {
                    setSpeaking(false);
                }
            } catch (error) {
                console.error('Speech error:', error);
                setSpeaking(false);
            }
        }

        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (!message || isLoading) return;

            addMessage(message, true);
            input.value = '';
            isLoading = true;
            showTyping();

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, botId: 1 })
                });

                if (response.ok) {
                    const data = await response.json();
                    hideTyping();
                    addMessage(data.response, false);
                    
                    updateBotStats({
                        level: data.level,
                        wordsLearned: data.wordsLearned
                    });
                    
                    await speakText(data.response);
                } else {
                    hideTyping();
                    addMessage('Sorry, I had trouble processing that. Please try again.', false);
                }
            } catch (error) {
                console.error('Chat error:', error);
                hideTyping();
                addMessage('Sorry, I had trouble processing that. Please try again.', false);
            } finally {
                isLoading = false;
            }
        }

        document.getElementById('sendBtn').addEventListener('click', sendMessage);
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });

        document.getElementById('voiceBtn').addEventListener('click', () => {
            if (recognition && !isListening) {
                setListening(true);
                recognition.start();
            }
        });

        // Initialize bot
        fetch('/api/bot/1').catch(() => {
            fetch('/api/bot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 1,
                    name: 'Mirror',
                    level: 1,
                    wordsLearned: 0,
                    personalityTraits: { enthusiasm: 1, humor: 1, curiosity: 2 }
                })
            });
        });
    </script>
</body>
</html>`);
  });

  return httpServer;
}