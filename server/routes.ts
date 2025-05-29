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

  // Serve Mirror Bot application
  app.get("/", (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mirror Bot - AI Companion</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; }
        .chat-bubble { animation: slideIn 0.3s ease-out; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .typing { animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    </style>
</head>
<body class="bg-gradient-to-br from-gray-900 to-black text-white min-h-screen">
    <div class="container mx-auto max-w-4xl px-4 py-6 h-screen flex flex-col">
        <div class="text-center mb-6">
            <h1 class="text-3xl font-bold text-emerald-400 mb-2">🪞 Mirror Bot</h1>
            <p class="text-gray-400">AI companion that learns and speaks</p>
            <div class="flex justify-center gap-4 mt-4">
                <div class="bg-gray-800 px-3 py-1 rounded-lg border border-gray-700 text-sm">
                    <span class="text-emerald-400 font-semibold">Level <span id="botLevel">1</span></span>
                    <span class="text-gray-400 ml-2">• <span id="botStage">Infant</span></span>
                </div>
                <div class="bg-gray-800 px-3 py-1 rounded-lg border border-gray-700 text-sm">
                    <span class="text-blue-400 font-semibold"><span id="wordsLearned">0</span></span>
                    <span class="text-gray-400 ml-1">words learned</span>
                </div>
            </div>
        </div>
        <div class="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl overflow-hidden flex-1 flex flex-col">
            <div id="chatArea" class="flex-1 overflow-y-auto p-4 space-y-3">
                <div id="welcomeMessage" class="text-center py-16">
                    <div class="text-5xl mb-4">🤖</div>
                    <h3 class="text-lg font-semibold text-gray-300 mb-2">Welcome to Mirror Bot!</h3>
                    <p class="text-gray-500 text-sm">Start a conversation and watch me learn from you.</p>
                    <p class="text-gray-500 text-xs mt-2">I'll speak my responses and adapt to your style.</p>
                </div>
            </div>
            <div class="border-t border-gray-700 p-4">
                <div class="flex gap-2">
                    <input id="messageInput" type="text" placeholder="Type your message or use voice input..." class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                    <button id="voiceBtn" class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 text-sm" title="Voice Input">🎤</button>
                    <button id="sendBtn" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all duration-200 text-sm">Send</button>
                </div>
                <div class="flex justify-between items-center mt-2 text-xs text-gray-500">
                    <div id="statusArea"></div>
                    <span>Press Enter to send</span>
                </div>
            </div>
        </div>
    </div>
    <audio id="audioPlayer" style="display: none;"></audio>
    <script>
        let isLoading = false, isSpeaking = false, isListening = false, recognition = null;
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            recognition = new SpeechRecognition();
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
                voiceBtn.className = 'px-3 py-2 bg-red-600 text-white rounded-lg animate-pulse text-sm';
                statusArea.innerHTML = '<span class="text-red-400">🎤 Listening...</span>';
            } else {
                voiceBtn.className = 'px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 text-sm';
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
                document.getElementById('botStage').textContent = stages[stats.level] || 'Adult';
            }
            if (stats.wordsLearned !== undefined) {
                document.getElementById('wordsLearned').textContent = stats.wordsLearned;
            }
        }
        function addMessage(content, isUser, timestamp = new Date()) {
            const chatArea = document.getElementById('chatArea');
            const welcomeMessage = document.getElementById('welcomeMessage');
            if (welcomeMessage && welcomeMessage.style.display !== 'none') {
                welcomeMessage.style.display = 'none';
            }
            const messageDiv = document.createElement('div');
            messageDiv.className = \`flex \${isUser ? 'justify-end' : 'justify-start'} chat-bubble\`;
            const time = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const bgClass = isUser ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-100 border border-gray-600';
            messageDiv.innerHTML = \`<div class="max-w-xs lg:max-w-md px-3 py-2 rounded-xl \${bgClass}"><p class="text-sm leading-relaxed">\${content}</p><p class="text-xs opacity-70 mt-1">\${time}</p></div>\`;
            chatArea.appendChild(messageDiv);
            chatArea.scrollTop = chatArea.scrollHeight;
        }
        function showTyping() {
            const chatArea = document.getElementById('chatArea');
            const typingDiv = document.createElement('div');
            typingDiv.id = 'typingIndicator';
            typingDiv.className = 'flex justify-start';
            typingDiv.innerHTML = \`<div class="bg-gray-700 border border-gray-600 px-3 py-2 rounded-xl"><div class="flex items-center space-x-1"><div class="w-2 h-2 bg-emerald-400 rounded-full typing" style="animation-delay: 0s"></div><div class="w-2 h-2 bg-emerald-400 rounded-full typing" style="animation-delay: 0.2s"></div><div class="w-2 h-2 bg-emerald-400 rounded-full typing" style="animation-delay: 0.4s"></div></div></div>\`;
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
                    updateBotStats({ level: data.level, wordsLearned: data.wordsLearned });
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

  // Remove catch-all route - let Vite handle frontend routing

  return httpServer;
}