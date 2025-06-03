import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import WhisperRecorder from './components/WhisperRecorder';
import MemoryDashboard from './components/MemoryDashboard';

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
  const [showMemoryDashboard, setShowMemoryDashboard] = useState(false);
  const [showUserSwitch, setShowUserSwitch] = useState(false);
  const [newUserName, setNewUserName] = useState('');

  // Define TTS functions inline to avoid import path issues
  const speakWithElevenLabs = async (text: string): Promise<void> => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`TTS API failed with status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Audio playback failed'));
        };
        
        audio.play().catch(reject);
      });
    } catch (error) {
      console.error('Text-to-speech error:', error);
      throw error;
    }
  };

  const speakWithBrowserTTS = (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Browser speech synthesis not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(`Speech synthesis failed: ${event.error}`));
      
      window.speechSynthesis.cancel(); // Stop any ongoing speech before starting new
      speechSynthesis.speak(utterance);
    });
  };

  // Test TTS function for debugging
  const testBrowserTTS = () => {
    console.log('Testing browser TTS...');
    const utterance = new SpeechSynthesisUtterance("Hello! This is a test of the text to speech system.");
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    utterance.onstart = () => console.log('TTS started');
    utterance.onend = () => console.log('TTS ended');
    utterance.onerror = (e) => console.error('TTS error:', e);
    
    speechSynthesis.speak(utterance);
  };

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
      const botResponse = {
        sender: 'bot' as const,
        text: res.data.response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botResponse]);
      
      // Speak the response with multiple fallback methods
      console.log('Attempting to speak bot response:', res.data.response);
      
      try {
        // Method 1: Try ElevenLabs first
        console.log('Trying ElevenLabs TTS...');
        await speakWithElevenLabs(res.data.response);
        console.log('ElevenLabs TTS successful');
      } catch (elevenLabsError) {
        console.log('ElevenLabs TTS failed, trying browser TTS:', elevenLabsError);
        
        try {
          // Method 2: Fallback to browser TTS
          await speakWithBrowserTTS(res.data.response);
          console.log('Browser TTS successful');
        } catch (browserTTSError) {
          console.log('Browser TTS failed, trying direct API:', browserTTSError);
          
          try {
            // Method 3: Direct API call as final fallback
            const ttsResponse = await axios.post('/api/tts', { text: res.data.response }, {
              responseType: 'blob'
            });
            
            const audioBlob = new Blob([ttsResponse.data], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
              console.log('Direct API TTS completed');
            };
            
            audio.onerror = (e) => {
              console.error('Audio playback error:', e);
              URL.revokeObjectURL(audioUrl);
            };
            
            await audio.play();
            console.log('Direct API TTS successful');
          } catch (directAPIError) {
            console.error('All TTS methods failed:', directAPIError);
          }
        }
      }
      
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

  const switchUser = async () => {
    if (!newUserName.trim()) return;
    
    try {
      await axios.post('/api/user/switch', { name: newUserName.trim() });
      setMessages([]);
      setNewUserName('');
      setShowUserSwitch(false);
      
      // Refresh stats
      const statsRes = await axios.get('/api/stats?userId=1');
      setBotStats({
        level: statsRes.data.stage === 'Infant' ? 1 : statsRes.data.stage === 'Toddler' ? 2 : statsRes.data.stage === 'Child' ? 3 : statsRes.data.stage === 'Adolescent' ? 4 : 5,
        stage: statsRes.data.stage,
        wordsLearned: statsRes.data.wordCount
      });
      
    } catch (error) {
      console.error('User switch failed:', error);
    }
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
              <p className="text-slate-500 text-sm">I'll speak my responses and adapt to your style over time.</p>
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

      {/* Input & Actions */}
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
            <div className="flex gap-3 flex-wrap">
              <WhisperRecorder 
                onTranscription={(text) => setInput(text)} 
                onResponse={() => {}} 
              />
              <button 
                onClick={() => setShowMemoryDashboard(!showMemoryDashboard)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-all shadow-md"
              >
                🧠 Memory
              </button>
              <button 
                onClick={() => setShowUserSwitch(!showUserSwitch)}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-all shadow-md"
              >
                👤 Switch User
              </button>
              <button 
                onClick={testBrowserTTS}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-all shadow-md"
                title="Test if TTS is working"
              >
                🔊 Test TTS
              </button>
            </div>
            <div className="text-xs text-slate-500">
              Press Enter to send
            </div>
          </div>
        </div>
      </div>

      {/* Memory Dashboard Modal */}
      {showMemoryDashboard && (
        <div key="memory-dashboard-modal" className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-200">Memory Dashboard</h3>
              <button 
                onClick={() => setShowMemoryDashboard(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <MemoryDashboard userId={1} />
          </div>
        </div>
      )}

      {/* User Switch Modal */}
      {showUserSwitch && (
        <div key="user-switch-modal" className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-purple-400 mb-4">Switch User Identity</h3>
            <p className="text-slate-400 mb-4">Clear all memories and start fresh with a new user identity.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Enter new user name"
                className="flex-1 bg-slate-700/80 border border-slate-600/50 rounded-lg px-3 py-2 text-white placeholder-slate-400"
                onKeyDown={(e) => e.key === 'Enter' && switchUser()}
              />
              <button 
                onClick={switchUser}
                disabled={!newUserName.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg"
              >
                Switch
              </button>
              <button 
                onClick={() => setShowUserSwitch(false)}
                className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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