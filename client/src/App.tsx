import React, { useState, useRef, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MemoryDashboard from './components/MemoryDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const journalingPrompts = [
  "What made you smile recently?",
  "Is there anything weighing on your mind?",
  "What's one thing you're proud of this week?",
  "What's something you wish others understood about you?",
  "What are you avoiding right now that you probably shouldn't be?",
  "Describe a moment when you felt truly yourself.",
  "What would your younger self be surprised to know about you now?",
  "What's a small daily ritual that brings you peace?",
  "If you could have a conversation with anyone, who would it be and why?",
  "What's something you've learned about yourself this week?"
];

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [botStats, setBotStats] = useState({
    level: 1,
    wordsLearned: 0,
    stage: 'Infant'
  });
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showGrowth, setShowGrowth] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showUserSwitch, setShowUserSwitch] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new (window as any).webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event: any) => {
        setInput(event.results[0][0].transcript);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch bot statistics on load
  useEffect(() => {
    const fetchBotStats = async () => {
      try {
        const response = await fetch('/api/stats?userId=1');
        if (response.ok) {
          const data = await response.json();
          setBotStats({
            level: data.stage === 'Infant' ? 1 : data.stage === 'Toddler' ? 2 : data.stage === 'Child' ? 3 : data.stage === 'Adolescent' ? 4 : 5,
            wordsLearned: data.wordCount,
            stage: data.stage
          });
        }
      } catch (error) {
        console.error('Failed to fetch bot stats:', error);
      }
    };

    fetchBotStats();
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

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
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        await audio.play();
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, botId: 1 })
      });

      if (response.ok) {
        const data = await response.json();
        
        const botMessage: Message = {
          text: data.response,
          sender: 'bot',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, botMessage]);
        
        setBotStats({
          level: data.level,
          wordsLearned: data.wordsLearned,
          stage: data.level === 1 ? 'Infant' : data.level === 2 ? 'Child' : data.level === 3 ? 'Adolescent' : 'Adult'
        });

        await speakText(data.response);
      } else {
        const errorMessage: Message = {
          text: 'Sorry, I had trouble processing that. Please try again.',
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        text: 'Sorry, I had trouble processing that. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendJournalingPrompt = () => {
    const prompt = journalingPrompts[Math.floor(Math.random() * journalingPrompts.length)];
    const promptMessage: Message = {
      text: `Here's a reflection question for you: ${prompt}`,
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, promptMessage]);
    setShowPrompt(false);
  };

  const generateWeeklySummary = async () => {
    setSummaryLoading(true);
    try {
      const response = await fetch('/api/weekly-summary?userId=1');

      if (response.ok) {
        const data = await response.json();
        setWeeklySummary(data.summary);
      } else {
        setWeeklySummary('Unable to generate weekly summary at this time.');
      }
    } catch (error) {
      console.error('Summary error:', error);
      setWeeklySummary('Unable to generate weekly summary at this time.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const switchUser = async () => {
    if (!newUserName.trim()) return;
    
    try {
      const response = await fetch('/api/user/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUserName.trim() })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages([]);
        setNewUserName('');
        setShowUserSwitch(false);
        
        // Add a system message about the switch
        const switchMessage: Message = {
          text: `Identity switched to ${newUserName}. Previous memories cleared. Starting fresh conversation.`,
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages([switchMessage]);
        
        // Refresh stats after user switch
        const statsResponse = await fetch('/api/stats?userId=1');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setBotStats({
            level: statsData.stage === 'Infant' ? 1 : statsData.stage === 'Toddler' ? 2 : statsData.stage === 'Child' ? 3 : statsData.stage === 'Adolescent' ? 4 : 5,
            wordsLearned: statsData.wordCount,
            stage: statsData.stage
          });
        }
      }
    } catch (error) {
      console.error('User switch failed:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white">
      <div className="max-w-6xl mx-auto flex flex-col h-screen">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-800/50 to-gray-800/50 backdrop-blur-sm border-b border-slate-700/50">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-blue-500/10"></div>
          <div className="relative p-6">
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent mb-2">
                Reflectibot
              </h1>
              <p className="text-slate-400 text-sm font-medium">Your evolving AI companion</p>
            </div>
            
            <div className="flex justify-center gap-6 mt-6">
              <div className="bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-600/50 shadow-lg">
                <div className="text-center">
                  <div className="text-emerald-400 font-bold text-lg">Level {botStats.level}</div>
                  <div className="text-slate-400 text-xs font-medium">{botStats.stage}</div>
                </div>
              </div>
              <div className="bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-600/50 shadow-lg">
                <div className="text-center">
                  <div className="text-blue-400 font-bold text-lg">{botStats.wordsLearned}</div>
                  <div className="text-slate-400 text-xs font-medium">words learned</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
                <div className="text-4xl">🤖</div>
              </div>
              <h2 className="text-2xl font-bold text-slate-200 mb-3">Welcome to Reflectibot!</h2>
              <p className="text-slate-400 max-w-md mx-auto mb-2">Start a conversation and watch me learn from you.</p>
              <p className="text-slate-500 text-sm">I'll speak my responses and adapt to your style over time.</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {messages.map((message, index) => (
                <div key={index} className={`mb-6 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block px-6 py-4 rounded-2xl max-w-lg shadow-lg ${
                    message.sender === 'user' 
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white' 
                      : 'bg-slate-800/80 backdrop-blur-sm text-slate-100 border border-slate-700/50'
                  }`}>
                    <div className="text-sm leading-relaxed">{message.text}</div>
                    <div className="text-xs opacity-60 mt-2">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="text-left mb-6">
                  <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 px-6 py-4 rounded-2xl inline-block shadow-lg">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <button 
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Send
          </button>
          <button 
            onClick={startListening}
            disabled={isListening || isLoading}
            className={`px-3 py-2 rounded-lg text-white ${
              isListening 
                ? 'bg-red-600 animate-pulse' 
                : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600'
            }`}
          >
            🎤
          </button>
          <button 
            onClick={() => setShowGrowth(!showGrowth)}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg"
          >
            📊
          </button>
          <button 
            onClick={() => setShowPrompt(!showPrompt)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg"
          >
            🧠
          </button>
          <button 
            onClick={() => setShowSummary(!showSummary)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg"
          >
            📝
          </button>
          <button 
            onClick={() => setShowUserSwitch(!showUserSwitch)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg"
          >
            👤
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

      {/* Enhanced Memory Dashboard */}
      {showGrowth && (
        <div className="w-full max-w-4xl mt-4">
          <QueryClientProvider client={queryClient}>
            <MemoryDashboard userId={1} />
          </QueryClientProvider>
        </div>
      )}

      {/* Journaling Prompts */}
      {showPrompt && (
        <div className="w-full max-w-4xl mt-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
          <h3 className="text-lg font-bold text-purple-400 mb-3">Reflection Time</h3>
          <p className="text-gray-300 mb-4">Ready for a thoughtful question to deepen our conversation?</p>
          <div className="flex gap-2">
            <button 
              onClick={sendJournalingPrompt}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
            >
              Give me a prompt
            </button>
            <button 
              onClick={() => setShowPrompt(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Weekly Summary */}
      {showSummary && (
        <div className="w-full max-w-4xl mt-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
          <h3 className="text-lg font-bold text-indigo-400 mb-3">Weekly Summary</h3>
          {weeklySummary ? (
            <div className="bg-gray-900 p-4 rounded-lg">
              <p className="text-gray-300 leading-relaxed">{weeklySummary}</p>
            </div>
          ) : (
            <p className="text-gray-400 mb-4">Generate an AI summary of your conversations and growth this week.</p>
          )}
          <div className="flex gap-2 mt-4">
            <button 
              onClick={generateWeeklySummary}
              disabled={summaryLoading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              {summaryLoading ? 'Generating...' : 'Generate Summary'}
            </button>
            <button 
              onClick={() => setShowSummary(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* User Switch */}
      {showUserSwitch && (
        <div className="w-full max-w-4xl mt-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
          <h3 className="text-lg font-bold text-purple-400 mb-3">Switch User Identity</h3>
          <p className="text-gray-400 mb-4">Clear all memories and start fresh with a new user identity.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Enter new user name"
              className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
              onKeyPress={(e) => e.key === 'Enter' && switchUser()}
            />
            <button 
              onClick={switchUser}
              disabled={!newUserName.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              Switch
            </button>
            <button 
              onClick={() => setShowUserSwitch(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;