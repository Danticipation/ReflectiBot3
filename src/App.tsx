import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import WhisperRecorder from './components/WhisperRecorder';
import MemoryDashboard from './components/MemoryDashboard';
import VoiceSelector from './components/VoiceSelector';

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
  const [weeklySummary, setWeeklySummary] = useState<string>('');
  const [showReflection, setShowReflection] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
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
      
      window.speechSynthesis.cancel();
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

    axios.get('/api/weekly-summary?userId=1')
      .then(res => setWeeklySummary(res.data.summary))
      .catch(() => setWeeklySummary('No reflections available yet.'));
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white font-sans">
      
      {/* Clean Header */}
      <div className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              Reflectibot
            </h1>
            <p className="text-slate-400 text-sm">Your evolving AI companion</p>
          </div>
          {botStats && (
            <div className="flex gap-3">
              <div className="bg-slate-700/50 px-3 py-2 rounded-lg text-center">
                <div className="text-emerald-400 font-semibold">Level {botStats.level}</div>
                <div className="text-slate-400 text-xs">{botStats.stage}</div>
              </div>
              <div className="bg-slate-700/50 px-3 py-2 rounded-lg text-center">
                <div className="text-blue-400 font-semibold">{botStats.wordsLearned}</div>
                <div className="text-slate-400 text-xs">words</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-80px)]">
        
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
                <div className="text-3xl">🤖</div>
              </div>
              <h2 className="text-xl font-bold text-slate-200 mb-2">Welcome to Reflectibot!</h2>
              <p className="text-slate-400 mb-1">Start a conversation and watch me learn from you.</p>
              <p className="text-slate-500 text-sm">I'll speak my responses and adapt to your style over time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`rounded-xl p-3 max-w-lg ${
                    msg.sender === 'user' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-700 border border-slate-600'
                  }`}>
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-xs opacity-60 mt-1">{msg.time}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-700 border border-slate-600 rounded-xl p-3">
                    <div className="flex space-x-1">
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

        {/* Input Section */}
        <div className="border-t border-slate-700/50 bg-slate-800/30 p-4">
          
          {/* Text Input Row */}
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="Share your thoughts..."
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-all"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>

          {/* Voice Input */}
          <div className="mb-4">
            <WhisperRecorder 
              onTranscription={(text) => setInput(text)} 
              onResponse={() => {}} 
            />
          </div>

          {/* Action Buttons - Clean Grid Layout */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <button 
              onClick={() => setShowMemory(!showMemory)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
            >
              🧠 Memory
            </button>
            
            <button 
              onClick={() => setShowReflection(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
            >
              📘 Reflection
            </button>
            
            <button 
              onClick={() => setShowVoiceSelector(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
            >
              🎤 Voice
            </button>
            
            <button 
              onClick={() => setShowUserSwitch(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
            >
              👤 Switch User
            </button>
            
            <button 
              onClick={testBrowserTTS}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
            >
              🔊 Test TTS
            </button>
          </div>

          <div className="text-xs text-slate-500 text-center mt-2">
            Press Enter to send • Click buttons for options
          </div>
        </div>
      </div>

      {/* Reflection Modal */}
      {showReflection && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-blue-400">📘 Weekly Reflection</h3>
              <button 
                onClick={() => setShowReflection(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <div className="bg-slate-700 rounded-lg p-4">
              <p className="text-slate-300 leading-relaxed">
                {weeklySummary || "No reflection data available yet. Keep chatting to build up conversation history for weekly insights!"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Memory Dashboard */}
      {showMemory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-purple-400">🧠 Memory Dashboard</h3>
              <button 
                onClick={() => setShowMemory(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <MemoryDashboard userId={1} />
          </div>
        </div>
      )}

      {/* Voice Selector Modal */}
      {showVoiceSelector && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-emerald-400">🎤 Voice Selection</h3>
              <button 
                onClick={() => setShowVoiceSelector(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <VoiceSelector 
              userId={1} 
              onVoiceChange={(voice) => {
                console.log('Voice changed to:', voice.name);
              }}
            />
          </div>
        </div>
      )}

      {/* User Switch Modal */}
      {showUserSwitch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-amber-400">👤 Switch User</h3>
              <button 
                onClick={() => setShowUserSwitch(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <p className="text-slate-400 mb-4">Clear all memories and start fresh with a new user identity.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Enter new user name"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400"
                onKeyDown={(e) => e.key === 'Enter' && switchUser()}
              />
              <button 
                onClick={switchUser}
                disabled={!newUserName.trim()}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg"
              >
                Switch
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