import React, { useState, useRef, useEffect } from 'react';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp?: Date;
}

interface GrowthStats {
  wordsLearned: number;
  factsRemembered: number;
  stage: string;
}

const journalingPrompts = [
  "What made you smile recently?",
  "Is there anything weighing on your mind?",
  "What's one thing you're proud of this week?",
  "What's something you wish others understood about you?",
  "What are you avoiding right now that you probably shouldn't be?"
];

function MirrorBotInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showGrowth, setShowGrowth] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [growthStats, setGrowthStats] = useState<GrowthStats>({
    wordsLearned: 0,
    factsRemembered: 0,
    stage: 'Infant 🍼',
  });
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new (window as any).webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  // Initialize bot on startup
  useEffect(() => {
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
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleVoiceInput = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    } else {
      alert('Voice recognition is not supported in this browser.');
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

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    setIsLoading(true);
    const userMessage = { text: input, sender: 'user' as const };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          botId: 1
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        setGrowthStats({
          wordsLearned: data.wordsLearned || 0,
          factsRemembered: data.factsCount || 0,
          stage: data.level === 1 ? 'Infant 🍼' : data.level === 2 ? 'Child 👶' : data.level === 3 ? 'Adolescent 🧒' : 'Adult 🧑',
        });
        
        const botResponse = { text: data.response, sender: 'bot' as const };
        setMessages(prev => [...prev, botResponse]);
        
        // Speak the bot's response
        await speakText(data.response);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { text: 'Sorry, I had trouble processing that. Please try again.', sender: 'bot' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendPrompt = () => {
    const prompt = journalingPrompts[Math.floor(Math.random() * journalingPrompts.length)];
    setMessages(prev => [...prev, { text: prompt, sender: 'bot' }]);
    setShowPrompt(false);
  };

  const toggleGrowthPanel = () => setShowGrowth(!showGrowth);
  const toggleSummaryPanel = async () => {
    setShowSummary(!showSummary);
    if (!showSummary && !weeklySummary) {
      setSummaryLoading(true);
      try {
        const response = await fetch('/api/weekly-summary?userId=1');
        const data = await response.json();
        setWeeklySummary(data.summary || 'No summary available yet.');
      } catch (error) {
        setWeeklySummary('Failed to load summary.');
      } finally {
        setSummaryLoading(false);
      }
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white px-2 py-4">
      <div className="w-full max-w-3xl h-full flex flex-col border border-gray-700 rounded-2xl overflow-hidden shadow-xl">
        
        {/* Header */}
        <div className="text-center p-4 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-emerald-400 mb-2">🪞 Mirror Bot</h1>
          <p className="text-gray-400 text-sm">AI companion that learns and speaks</p>
          <div className="flex justify-center gap-4 mt-3">
            <div className="bg-gray-800 px-3 py-1 rounded-lg border border-gray-700 text-xs">
              <span className="text-emerald-400 font-semibold">Level {growthStats.wordsLearned < 10 ? 1 : growthStats.wordsLearned < 25 ? 2 : growthStats.wordsLearned < 50 ? 3 : 4}</span>
              <span className="text-gray-400 ml-2">• {growthStats.stage}</span>
            </div>
            <div className="bg-gray-800 px-3 py-1 rounded-lg border border-gray-700 text-xs">
              <span className="text-blue-400 font-semibold">{growthStats.wordsLearned}</span>
              <span className="text-gray-400 ml-1">words learned</span>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-grow overflow-y-auto p-4 bg-gray-950/80 backdrop-blur">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Welcome to Mirror Bot!</h3>
              <p className="text-gray-500 text-sm">Start a conversation and watch me learn from you.</p>
              <p className="text-gray-500 text-xs mt-2">I'll speak my responses and adapt to your style.</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-3 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}
              >
                <span className={`inline-block px-4 py-2 rounded-xl max-w-xs ${msg.sender === 'user' ? 'bg-emerald-600' : 'bg-gray-700 border border-gray-600'}`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <p className="text-xs opacity-70 mt-1">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </span>
              </div>
            ))
          )}
          {isLoading && (
            <div className="text-left mb-3">
              <div className="bg-gray-700 border border-gray-600 px-4 py-2 rounded-xl inline-block">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div className="p-3 border-t border-gray-700 bg-gray-900">
          <div className="flex gap-2">
            <input
              className="flex-grow bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type or speak your thoughts..."
              disabled={isLoading}
            />
            <button className="min-w-[3rem] bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm" onClick={sendMessage} disabled={isLoading}>
              📨
            </button>
            <button className={`min-w-[3rem] bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm ${isListening ? 'animate-pulse bg-red-600' : ''}`} onClick={handleVoiceInput}>
              🎤
            </button>
            <button className="min-w-[3rem] bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg text-sm" onClick={toggleGrowthPanel}>
              📊
            </button>
            <button className="min-w-[3rem] bg-pink-600 hover:bg-pink-700 text-white px-3 py-2 rounded-lg text-sm" onClick={() => setShowPrompt(true)}>
              🧠
            </button>
            <button className="min-w-[3rem] bg-purple-700 hover:bg-purple-800 text-white px-3 py-2 rounded-lg text-sm" onClick={toggleSummaryPanel}>
              📅
            </button>
          </div>
          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
            <div>
              {isListening && <span className="text-red-400">🎤 Listening...</span>}
              {isSpeaking && <span className="text-emerald-400">🔊 Speaking...</span>}
            </div>
            <span>Press Enter to send</span>
          </div>
        </div>
      </div>

      {showGrowth && (
        <div className="w-full max-w-3xl mt-4 p-4 bg-gray-800 rounded-xl shadow text-left">
          <h2 className="text-lg font-bold text-emerald-400 mb-2">Mirror Bot Growth Dashboard</h2>
          <ul className="list-disc pl-6 space-y-1 text-sm text-gray-300">
            <li><strong>Words Learned:</strong> {growthStats.wordsLearned}</li>
            <li><strong>Facts Remembered:</strong> {growthStats.factsRemembered}</li>
            <li><strong>Current Stage:</strong> {growthStats.stage}</li>
            <li><strong>Next Milestone:</strong> {(growthStats.wordsLearned < 50) ? '50 words for Adult stage unlock' : 'You\'re at maximum development'}</li>
          </ul>
        </div>
      )}

      {showPrompt && (
        <div className="w-full max-w-3xl mt-4 p-4 bg-gray-900 border border-gray-700 rounded-xl shadow">
          <h3 className="text-lg text-white mb-2">Reflect with me...</h3>
          <p className="text-sm text-gray-300 mb-4">Ready for a journaling question?</p>
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg" onClick={sendPrompt}>
            Give me a prompt
          </button>
        </div>
      )}

      {showSummary && (
        <div className="w-full max-w-3xl mt-4 p-4 bg-gray-900 border border-gray-700 rounded-xl shadow text-left">
          <h3 className="text-lg text-emerald-400 mb-2">Your Weekly Reflection</h3>
          <p className="text-sm text-gray-300 whitespace-pre-line">
            {summaryLoading ? 'Generating your weekly summary...' : weeklySummary || 'No summary available yet.'}
          </p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">Mirror Bot v1.0 — Built for mobile. Powered by memory.</div>
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}

export default function App() {
  return <MirrorBotInterface />;
}