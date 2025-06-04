import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { Topbar } from './components/Topbar';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
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
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('chat');
  const [weeklySummary, setWeeklySummary] = useState<string>('');
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
    // Load bot stats
    axios.get('/api/stats?userId=1')
      .then(res => {
        setBotStats({
          level: res.data.stage === 'Infant' ? 1 : res.data.stage === 'Toddler' ? 2 : res.data.stage === 'Child' ? 3 : res.data.stage === 'Adolescent' ? 4 : 5,
          stage: res.data.stage,
          wordsLearned: res.data.wordCount
        });
      })
      .catch(() => setBotStats({ level: 1, stage: 'Infant', wordsLearned: 0 }));

    // Load weekly summary
    axios.get('/api/weekly-summary?userId=1')
      .then(res => setWeeklySummary(res.data.summary))
      .catch(() => setWeeklySummary('No reflections available yet.'));
  }, []);

  const sendMessage = async (messageText: string) => {
    const newMessage: Message = {
      sender: 'user',
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMessage]);
    setLoading(true);
    
    try {
      const res = await axios.post('/api/chat', { message: messageText, userId: 1 });
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
          console.log('Browser TTS failed:', browserTTSError);
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
      setActiveSection('chat');
      
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

  const renderMainContent = () => {
    switch (activeSection) {
      case 'chat':
        return (
          <ChatWindow 
            messages={messages}
            onSendMessage={sendMessage}
            loading={loading}
          />
        );
      
      case 'memory':
        return (
          <div className="h-full overflow-y-auto p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-zinc-200 mb-2">🧠 Memory Dashboard</h2>
              <p className="text-zinc-400">Track your AI companion's learning progress and memories.</p>
            </div>
            <MemoryDashboard userId={1} />
          </div>
        );
      
      case 'reflection':
        return (
          <div className="h-full overflow-y-auto p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-zinc-200 mb-2">📘 Weekly Reflection</h2>
              <p className="text-zinc-400">AI-generated insights from your conversations.</p>
            </div>
            <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
              <p className="text-zinc-300 leading-relaxed">
                {weeklySummary || "No reflection data available yet. Keep chatting to build up conversation history for weekly insights!"}
              </p>
            </div>
          </div>
        );
      
      case 'voice':
        return (
          <div className="h-full overflow-y-auto p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-zinc-200 mb-2">🎤 Voice Settings</h2>
              <p className="text-zinc-400">Configure how your AI companion speaks to you.</p>
            </div>
            <VoiceSelector 
              userId={1} 
              onVoiceChange={(voice) => {
                console.log('Voice changed to:', voice.name);
              }}
            />
          </div>
        );
      
      case 'user':
        return (
          <div className="h-full overflow-y-auto p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-zinc-200 mb-2">👤 User Management</h2>
              <p className="text-zinc-400">Switch user identity or manage account settings.</p>
            </div>
            <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
              <h3 className="text-lg font-semibold text-amber-400 mb-4">Switch User Identity</h3>
              <p className="text-zinc-400 mb-4">Clear all memories and start fresh with a new user identity.</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Enter new user name"
                  className="flex-1 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-400"
                  onKeyDown={(e) => e.key === 'Enter' && switchUser()}
                />
                <button 
                  onClick={switchUser}
                  disabled={!newUserName.trim()}
                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-600 text-white px-6 py-2 rounded-lg font-medium transition-all"
                >
                  Switch
                </button>
              </div>
            </div>
          </div>
        );
      
      default:
        return <ChatWindow messages={messages} onSendMessage={sendMessage} loading={loading} />;
    }
  };

  return (
    <div className="flex h-screen bg-zinc-900 text-zinc-100">
      <Sidebar 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onTestTTS={testBrowserTTS}
      />
      <div className="flex flex-col flex-1">
        <Topbar botStats={botStats} />
        <main className="flex-1 overflow-hidden">
          {renderMainContent()}
        </main>
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