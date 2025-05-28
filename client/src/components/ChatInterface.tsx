import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import type { Bot, Message, LearningUpdate } from '@shared/schema';

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
  const [growthStats, setGrowthStats] = useState({
    wordsLearned: 0,
    factsRemembered: 0,
    stage: 'Infant 🍼',
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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
    alert("🎤 Voice input feature coming soon — powered by Whisper or browser speech API!");
  };

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

      <div className="p-4 border-t border-gray-700 bg-gray-900">
        <div className="flex gap-2">
          <Input
            className="flex-grow bg-gray-800 border border-gray-600 text-white placeholder-gray-400"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type something reflective..."
          />
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white" 
            onClick={sendMessage}
          >
            Send
          </Button>
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white" 
            onClick={handleVoiceInput}
          >
            🎤
          </Button>
          <Button 
            className="bg-yellow-600 hover:bg-yellow-700 text-white" 
            onClick={onToggleSidebar}
          >
            📊
          </Button>
        </div>
      </div>
    </>
  );
}