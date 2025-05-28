import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Mic, Menu } from 'lucide-react';
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
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest(`/api/bot/${bot.id}/message`, {
        method: 'POST',
        body: JSON.stringify({ content, isUser: true })
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bot/${bot.id}/messages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bot/${bot.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bot/${bot.id}/words`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bot/${bot.id}/milestones`] });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    setIsTyping(true);
    try {
      await sendMessageMutation.mutateAsync(inputValue);
      setInputValue('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceInput = () => {
    alert("🎤 Voice input feature coming soon — powered by Whisper or browser speech API!");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      <div className="flex-grow p-4 overflow-y-auto bg-gray-950/80 backdrop-blur">
        {messages.map((msg, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`mb-3 ${msg.isUser ? 'text-right' : 'text-left'}`}
          >
            <span className={`inline-block px-4 py-2 rounded-xl max-w-xs ${
              msg.isUser ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'
            }`}>
              {msg.content}
            </span>
          </motion.div>
        ))}
        {messages.length === 0 && (
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
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
            placeholder="Type something reflective..."
            disabled={isTyping || !isConnected}
          />
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white" 
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isTyping || !isConnected}
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