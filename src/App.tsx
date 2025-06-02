import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

interface BotStats {
  level: number;
  stage: string;
  wordsLearned: number;
}

interface Message {
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

const AppComponent = () => {
  const [botStats, setBotStats] = useState<BotStats | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get('/api/stats?userId=1')
      .then(res => {
        setBotStats({
          level: res.data.stage === 'Infant' ? 1 : res.data.stage === 'Toddler' ? 2 : res.data.stage === 'Child' ? 3 : res.data.stage === 'Adolescent' ? 4 : 5,
          stage: res.data.stage,
          wordsLearned: res.data.wordCount
        });
      })
      .catch(() => setBotStats({ level: 1, stage: 'Infant', wordsLearned: 0 }));
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessage: Message = {
      sender: 'user',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const res = await axios.post('/api/chat', { message: newMessage.text, userId: 1 });
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: res.data.response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      
      // Update stats
      setBotStats(prev => prev ? {
        ...prev,
        wordsLearned: res.data.wordsLearned || prev.wordsLearned,
        stage: res.data.stage || prev.stage,
        level: res.data.stage === 'Infant' ? 1 : res.data.stage === 'Toddler' ? 2 : res.data.stage === 'Child' ? 3 : res.data.stage === 'Adolescent' ? 4 : 5
      } : null);
      
    } catch (err) {
      console.error('Chat failed', err);
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: 'Sorry, I encountered an error. Please try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white font-sans flex flex-col">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-slate-800/80 to-gray-800/80 backdrop-blur-sm shadow-lg border-b border-slate-700/50">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              Reflectibot
            </h1>
            <p className="text-slate-400 text-sm font-medium">Your evolving AI companion</p>
          </div>
          {botStats && (
            <div className="text-right">
              <div className="flex gap-4">
                <div className="bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-600/50 shadow-lg">
                  <div className="text-emerald-400 font-bold text-lg">Level {botStats.level}</div>
                  <div className="text-slate-400 text-xs font-medium">{botStats.stage}</div>
                </div>
                <div className="bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-600/50 shadow-lg">
                  <div className="text-blue-400 font-bold text-lg">{botStats.wordsLearned}</div>
                  <div className="text-slate-400 text-xs font-medium">words learned</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
                <div className="text-4xl">🤖</div>
              </div>
              <h2 className="text-2xl font-bold text-slate-200 mb-3">Welcome to Reflectibot!</h2>
              <p className="text-slate-400 max-w-md mx-auto mb-2">Start a conversation and watch me learn from you.</p>
              <p className="text-slate-500 text-sm">I'll adapt to your style over time.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`rounded-2xl p-4 max-w-lg shadow-lg ${
                    msg.sender === 'user' 
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white' 
                      : 'bg-slate-800/80 backdrop-blur-sm border border-slate-700/50'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <p className="text-xs opacity-60 mt-2">{msg.time}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 shadow-lg">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex gap-3 items-end mb-4">
            <input
              type="text"
              placeholder="Share your thoughts..."
              className="flex-1 bg-slate-800/80 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-slate-600 disabled:to-slate-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-xs text-slate-500">
              Press Enter to send
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppComponent />
    </QueryClientProvider>
  );
}

export default App;