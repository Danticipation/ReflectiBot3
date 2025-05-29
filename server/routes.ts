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

  // Serve React app directly since Vite dev server isn't running
  app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mirror Bot</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        const { useState, useEffect, useRef } = React;

        function MirrorBot() {
            const [messages, setMessages] = useState([]);
            const [input, setInput] = useState('');
            const [growthStats, setGrowthStats] = useState({ wordsLearned: 0, stage: 'Infant 🍼' });
            const [isLoading, setIsLoading] = useState(false);
            const [isListening, setIsListening] = useState(false);
            const [isSpeaking, setIsSpeaking] = useState(false);
            const [showGrowth, setShowGrowth] = useState(false);
            const audioRef = useRef();
            const recognitionRef = useRef();

            useEffect(() => {
                if ('webkitSpeechRecognition' in window) {
                    recognitionRef.current = new webkitSpeechRecognition();
                    recognitionRef.current.continuous = false;
                    recognitionRef.current.onresult = (event) => {
                        setInput(event.results[0][0].transcript);
                        setIsListening(false);
                    };
                    recognitionRef.current.onend = () => setIsListening(false);
                }

                // Initialize bot
                fetch('/api/bot/1').catch(() => {
                    fetch('/api/bot', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: 1, name: 'Mirror', level: 1, wordsLearned: 0,
                            personalityTraits: { enthusiasm: 1, humor: 1, curiosity: 2 }
                        })
                    });
                });
            }, []);

            const handleVoiceInput = () => {
                if (recognitionRef.current) {
                    setIsListening(true);
                    recognitionRef.current.start();
                }
            };

            const speakText = async (text) => {
                try {
                    setIsSpeaking(true);
                    const response = await fetch('/api/text-to-speech', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text })
                    });
                    if (response.ok) {
                        const audioBlob = await response.blob();
                        const audioUrl = URL.createObjectURL(audioBlob);
                        audioRef.current.src = audioUrl;
                        audioRef.current.onended = () => {
                            setIsSpeaking(false);
                            URL.revokeObjectURL(audioUrl);
                        };
                        await audioRef.current.play();
                    } else {
                        setIsSpeaking(false);
                    }
                } catch (error) {
                    setIsSpeaking(false);
                }
            };

            const sendMessage = async () => {
                if (!input.trim() || isLoading) return;
                
                const userMessage = { text: input, sender: 'user' };
                setMessages(prev => [...prev, userMessage]);
                setInput('');
                setIsLoading(true);

                try {
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: userMessage.text, botId: 1 })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setGrowthStats({
                            wordsLearned: data.wordsLearned || 0,
                            stage: data.level === 1 ? 'Infant 🍼' : data.level === 2 ? 'Child 👶' : data.level === 3 ? 'Adolescent 🧒' : 'Adult 🧑'
                        });
                        const botResponse = { text: data.response, sender: 'bot' };
                        setMessages(prev => [...prev, botResponse]);
                        await speakText(data.response);
                    }
                } catch (error) {
                    setMessages(prev => [...prev, { text: 'Error connecting to server', sender: 'bot' }]);
                } finally {
                    setIsLoading(false);
                }
            };

            return (
                <div className="h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col">
                    <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col">
                        <div className="text-center p-4 border-b border-gray-700">
                            <h1 className="text-2xl font-bold text-emerald-400 mb-2">🪞 Mirror Bot</h1>
                            <p className="text-gray-400 text-sm">AI companion that learns and speaks</p>
                            <div className="flex justify-center gap-4 mt-3">
                                <div className="bg-gray-800 px-3 py-1 rounded-lg text-xs">
                                    <span className="text-emerald-400">Level {growthStats.wordsLearned < 10 ? 1 : growthStats.wordsLearned < 25 ? 2 : 3}</span>
                                    <span className="text-gray-400 ml-2">• {growthStats.stage}</span>
                                </div>
                                <div className="bg-gray-800 px-3 py-1 rounded-lg text-xs">
                                    <span className="text-blue-400">{growthStats.wordsLearned}</span>
                                    <span className="text-gray-400 ml-1">words learned</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {messages.length === 0 ? (
                                <div className="text-center py-20">
                                    <div className="text-5xl mb-4">🤖</div>
                                    <h3 className="text-lg text-gray-300 mb-2">Welcome to Mirror Bot!</h3>
                                    <p className="text-gray-500">Start a conversation and watch me learn from you.</p>
                                </div>
                            ) : (
                                messages.map((msg, i) => (
                                    <div key={i} className={\`mb-3 \${msg.sender === 'user' ? 'text-right' : 'text-left'}\`}>
                                        <span className={\`inline-block px-4 py-2 rounded-xl max-w-xs \${msg.sender === 'user' ? 'bg-emerald-600' : 'bg-gray-700'}\`}>
                                            {msg.text}
                                        </span>
                                    </div>
                                ))
                            )}
                            {isLoading && (
                                <div className="text-left">
                                    <div className="bg-gray-700 px-4 py-2 rounded-xl inline-block">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-700">
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder="Type your message..."
                                    disabled={isLoading}
                                />
                                <button
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
                                    onClick={sendMessage}
                                    disabled={isLoading}
                                >
                                    Send
                                </button>
                                <button
                                    className={\`bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg \${isListening ? 'animate-pulse bg-red-600' : ''}\`}
                                    onClick={handleVoiceInput}
                                >
                                    🎤
                                </button>
                                <button
                                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg"
                                    onClick={() => setShowGrowth(!showGrowth)}
                                >
                                    📊
                                </button>
                            </div>
                            <div className="mt-2 text-xs text-gray-500 flex justify-between">
                                <div>
                                    {isListening && <span className="text-red-400">🎤 Listening...</span>}
                                    {isSpeaking && <span className="text-emerald-400">🔊 Speaking...</span>}
                                </div>
                                <span>Press Enter to send</span>
                            </div>
                        </div>

                        {showGrowth && (
                            <div className="mx-4 mb-4 p-4 bg-gray-800 rounded-xl">
                                <h3 className="text-emerald-400 font-bold mb-2">Growth Dashboard</h3>
                                <ul className="text-sm space-y-1">
                                    <li>Words Learned: {growthStats.wordsLearned}</li>
                                    <li>Current Stage: {growthStats.stage}</li>
                                    <li>Next Milestone: {growthStats.wordsLearned < 50 ? '50 words for Adult stage' : 'Maximum development reached'}</li>
                                </ul>
                            </div>
                        )}
                    </div>
                    <audio ref={audioRef} style={{display: 'none'}} />
                </div>
            );
        }

        ReactDOM.render(<MirrorBot />, document.getElementById('root'));
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