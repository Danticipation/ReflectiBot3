import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: number;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface BotStats {
  level: number;
  wordsLearned: number;
  stage: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [botStats, setBotStats] = useState<BotStats>({ level: 1, wordsLearned: 0, stage: 'Infant' });
  const [showStats, setShowStats] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Initialize bot
  useEffect(() => {
    const initBot = async () => {
      try {
        const response = await fetch('/api/bot/1');
        if (!response.ok) {
          // Create new bot
          await fetch('/api/bot', {
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
        }
      } catch (error) {
        console.log('Bot initialization handled');
      }
    };
    initBot();
  }, []);

  const speakText = async (text: string) => {
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
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };
          await audioRef.current.play();
        }
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      setIsSpeaking(false);
    }
  };

  const startVoiceInput = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      content: input,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          botId: 1
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        const botMessage: Message = {
          id: Date.now() + 1,
          content: data.response,
          isUser: false,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, botMessage]);
        
        // Update bot stats
        setBotStats({
          level: data.level,
          wordsLearned: data.wordsLearned,
          stage: data.level === 1 ? 'Infant' : data.level === 2 ? 'Child' : data.level === 3 ? 'Adolescent' : 'Adult'
        });
        
        // Speak the bot's response
        await speakText(data.response);
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-emerald-400 mb-2 flex items-center justify-center gap-3">
            🪞 Mirror Bot
          </h1>
          <p className="text-gray-400 text-lg">Your AI companion that learns and evolves</p>
          <div className="flex justify-center gap-4 mt-4">
            <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
              <span className="text-emerald-400 font-semibold">Level {botStats.level}</span>
              <span className="text-gray-400 ml-2">• {botStats.stage}</span>
            </div>
            <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
              <span className="text-blue-400 font-semibold">{botStats.wordsLearned}</span>
              <span className="text-gray-400 ml-1">words learned</span>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
          {/* Chat Area */}
          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold text-gray-300 mb-2">Welcome to Mirror Bot!</h3>
                <p className="text-gray-500">Start a conversation and watch me learn from you.</p>
                <p className="text-gray-500 text-sm mt-2">I'll speak my responses and adapt to your style.</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                      message.isUser
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-100 border border-gray-600'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 border border-gray-600 px-4 py-3 rounded-2xl">
                  <div className="flex items-center space-x-2">
                    <div className="animate-bounce w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <div className="animate-bounce w-2 h-2 bg-emerald-400 rounded-full" style={{animationDelay: '0.1s'}}></div>
                    <div className="animate-bounce w-2 h-2 bg-emerald-400 rounded-full" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message or use voice input..."
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
              
              {/* Voice Input Button */}
              <button
                onClick={startVoiceInput}
                disabled={isLoading || isListening}
                className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                🎤
              </button>

              {/* Send Button */}
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  input.trim() && !isLoading
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-emerald-500/25'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? '•••' : 'Send'}
              </button>
            </div>

            {/* Status Indicators */}
            <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
              <div className="flex gap-4">
                {isListening && (
                  <span className="text-red-400 animate-pulse">🎤 Listening...</span>
                )}
                {isSpeaking && (
                  <span className="text-emerald-400">🔊 Speaking...</span>
                )}
              </div>
              <span>Press Enter to send</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          Mirror Bot v1.0 • Advanced AI Learning System with Voice Integration
        </div>

        <audio ref={audioRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}