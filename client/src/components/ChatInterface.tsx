import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import type { Bot, Message, LearningUpdate } from '@shared/schema';

const journalingPrompts = [
  "What made you smile recently?",
  "Is there anything weighing on your mind?",
  "What's one thing you're proud of this week?",
  "What's something you wish others understood about you?",
  "What are you avoiding right now that you probably shouldn't be?"
];

interface ChatInterfaceProps {
  bot: Bot;
  messages: Message[];
  onToggleSidebar: () => void;
  onLearningUpdate: (update: LearningUpdate) => void;
  onMilestoneAchieved: () => void;
}

export function ChatInterface({ 
  bot, 
  messages, 
  onToggleSidebar, 
  onLearningUpdate, 
  onMilestoneAchieved 
}: ChatInterfaceProps) {
  const [localMessages, setLocalMessages] = useState(messages);
  const [input, setInput] = useState('');
  const [showGrowth, setShowGrowth] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [growthStats, setGrowthStats] = useState({
    wordsLearned: 0,
    factsRemembered: 0,
    stage: 'Infant 🍼',
  });
  const [isListening, setIsListening] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
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

  const mutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1, // replace with dynamic user id
          text,
        })
      });
      return response;
    },
    onSuccess: (data) => {
      setGrowthStats({
        wordsLearned: data.totalWordCount,
        factsRemembered: data.factsCount || 0,
        stage: data.stage,
      });

      const response = {
        text: `Reflectibot: I heard you say "${data.echoedText || input}"`,
        sender: 'bot'
      };
      setLocalMessages(prev => [...prev, { text: input, sender: 'user' }, response]);
      setInput('');
      
      // Trigger learning update callback
      onLearningUpdate({
        newWords: data.newWords || [],
        levelUp: false,
        personalityUpdate: {}
      });
    }
  });

  const sendMessage = () => {
    if (!input.trim()) return;
    mutation.mutate(input);
  };

  const handleVoiceInput = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    } else {
      alert('Voice recognition is not supported in this browser.');
    }
  };

  const sendPrompt = () => {
    const prompt = journalingPrompts[Math.floor(Math.random() * journalingPrompts.length)];
    setLocalMessages(prev => [...prev, { text: prompt, sender: 'bot' }]);
    setShowPrompt(false);
  };

  const toggleGrowthPanel = () => {
    setShowGrowth(!showGrowth);
  };

  const toggleSummaryPanel = () => {
    setShowSummary(!showSummary);
  };

  const summaryQuery = useQuery({
    queryKey: ['weekly-summary'],
    queryFn: async () => {
      const response = await apiRequest('/api/weekly-summary?userId=1');
      return response.summary;
    },
    enabled: showSummary
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  return (
    <>
      <div className="flex-grow p-4 overflow-y-auto bg-gray-950/80 backdrop-blur">
        {localMessages.map((msg, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`mb-3 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}
          >
            <span className={`inline-block px-4 py-2 rounded-xl max-w-xs ${
              msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'
            }`}>
              {msg.text}
            </span>
          </motion.div>
        ))}
        {localMessages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-gray-400 mt-8"
          >
            <p>Hello! I'm {bot.name}, your evolving AI reflection. Start chatting to teach me about yourself! 🌱</p>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-gray-700 bg-gray-900">
        <div className="flex gap-2">
          <Input
            className="flex-grow bg-gray-800 border border-gray-600 text-white placeholder-gray-400"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type or speak your thoughts..."
          />
          <Button 
            className="min-w-[3rem] bg-emerald-600 hover:bg-emerald-700 text-white" 
            onClick={sendMessage}
          >
            📨
          </Button>
          <Button 
            className={`min-w-[3rem] bg-indigo-600 hover:bg-indigo-700 text-white ${isListening ? 'animate-pulse' : ''}`}
            onClick={handleVoiceInput}
          >
            🎤
          </Button>
          <Button 
            className="min-w-[3rem] bg-yellow-600 hover:bg-yellow-700 text-white" 
            onClick={toggleGrowthPanel}
          >
            📊
          </Button>
          <Button 
            className="min-w-[3rem] bg-pink-600 hover:bg-pink-700 text-white" 
            onClick={() => setShowPrompt(true)}
          >
            🧠
          </Button>
          <Button 
            className="min-w-[3rem] bg-purple-700 hover:bg-purple-800 text-white" 
            onClick={toggleSummaryPanel}
          >
            📅
          </Button>
        </div>
      </div>

      {showGrowth && (
        <div className="w-full max-w-3xl mt-6 p-4 bg-gray-800 rounded-xl shadow-lg text-left">
          <h2 className="text-lg font-bold text-emerald-400 mb-2">Reflectibot Growth Dashboard</h2>
          <ul className="list-disc pl-6 space-y-1 text-sm text-gray-300">
            <li><strong>Words Learned:</strong> {growthStats.wordsLearned}</li>
            <li><strong>Facts Remembered:</strong> {growthStats.factsRemembered}</li>
            <li><strong>Current Stage:</strong> {growthStats.stage}</li>
            <li><strong>Next Milestone:</strong> {(growthStats.wordsLearned < 200) ? '200 words for Adolescent unlock 🚀' : 'You\'re already an advanced being 🧠'}</li>
          </ul>
        </div>
      )}

      {showPrompt && (
        <div className="w-full max-w-3xl mt-4 p-4 bg-gray-900 border border-gray-700 rounded-xl shadow">
          <h3 className="text-lg text-white mb-2">Reflect with me...</h3>
          <p className="text-sm text-gray-300 mb-4">Ready for a journaling question?</p>
          <Button className="bg-purple-600 hover:bg-purple-700" onClick={sendPrompt}>Give me a prompt</Button>
        </div>
      )}

      {showSummary && (
        <div className="w-full max-w-3xl mt-4 p-4 bg-gray-900 border border-gray-700 rounded-xl shadow text-left">
          <h3 className="text-lg text-emerald-400 mb-2">🧾 Your Weekly Reflection</h3>
          <p className="text-sm text-gray-300 whitespace-pre-line">
            {summaryQuery.isLoading ? 'Generating your weekly summary...' : summaryQuery.data || 'No summary available yet.'}
          </p>
        </div>
      )}
    </>
  );
}