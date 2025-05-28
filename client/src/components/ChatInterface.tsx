import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Mic, Settings, HelpCircle, Menu, Plus } from 'lucide-react';
import type { Message, Bot, LearningUpdate } from '@shared/schema';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInterfaceProps {
  bot: Bot;
  messages: Message[];
  onToggleSidebar: () => void;
  onLearningUpdate: (update: LearningUpdate) => void;
  onMilestoneAchieved: () => void;
}

export function ChatInterface({ 
  bot, 
  messages: initialMessages, 
  onToggleSidebar,
  onLearningUpdate,
  onMilestoneAchieved
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [newWords, setNewWords] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Temporarily use HTTP requests instead of WebSocket
  const [isConnected, setIsConnected] = useState(true);
  
  const sendMessage = async (userMessage: string) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId: bot.id,
          content: userMessage
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Chat response:', result);
        
        // Add bot response
        const botMessage: Message = {
          id: Date.now() + 1,
          botId: bot.id,
          content: result.response,
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        
        // Handle learning updates
        if (result.learningUpdate) {
          setNewWords(result.learningUpdate.newWords);
          onLearningUpdate(result.learningUpdate);
          setTimeout(() => setNewWords([]), 3000);
        }
        
        // Handle milestones
        if (result.milestoneAchieved) {
          onMilestoneAchieved();
        }
      } else {
        console.error('Chat request failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isTyping || !isConnected) return;
    
    // Add user message to local state
    const userMessage: Message = {
      id: Date.now(),
      botId: bot.id,
      content: inputValue,
      isUser: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    const messageContent = inputValue;
    setInputValue('');
    setIsTyping(true);
    
    // Send to server
    await sendMessage(messageContent);
    setIsTyping(false);
  };

  const suggestionChips = [
    "Tell me about your hobbies",
    "I like to read books",
    "My favorite color is blue",
    "I love pizza!",
    "What makes you happy?"
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-800">Chat with {bot.name}</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span>{isConnected ? 'Active Learning Mode' : 'Disconnected'}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm">
              <HelpCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start space-x-3"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center text-white text-sm">
                🤖
              </div>
              <div className="max-w-md">
                <Card className="bg-white shadow-sm border border-gray-100">
                  <CardContent className="p-4">
                    <p className="text-gray-800">
                      Hello! I'm {bot.name}, your personal AI companion. I start with zero knowledge, 
                      but I learn everything from you. Teach me about yourself, and watch me grow! 🌱
                    </p>
                  </CardContent>
                </Card>
                <p className="text-xs text-gray-500 mt-1 ml-3">Just now</p>
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex items-start space-x-3 ${message.isUser ? 'justify-end' : ''}`}
              >
                {message.isUser ? (
                  <>
                    <div className="max-w-md">
                      <Card className="bg-primary text-white shadow-sm">
                        <CardContent className="p-4">
                          <p>{message.content}</p>
                        </CardContent>
                      </Card>
                      <p className="text-xs text-gray-500 mt-1 mr-3 text-right">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-sm">
                      👤
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center text-white text-sm">
                      🤖
                    </div>
                    <div className="max-w-md">
                      <Card className="bg-white shadow-sm border border-gray-100">
                        <CardContent className="p-4">
                          <p className="text-gray-800">{message.content}</p>
                          {/* Show learning indicator for recent messages */}
                          {newWords.length > 0 && messages.indexOf(message) === messages.length - 1 && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="mt-2 flex items-center space-x-2 text-xs"
                            >
                              <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center space-x-1">
                                <Plus className="w-3 h-3" />
                                <span>Learned: {newWords.join(', ')}</span>
                              </div>
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>
                      <p className="text-xs text-gray-500 mt-1 ml-3">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-start space-x-3"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center text-white text-sm">
                  🤖
                </div>
                <Card className="bg-white shadow-sm border border-gray-100">
                  <CardContent className="p-4">
                    <div className="flex space-x-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ 
                            duration: 0.6, 
                            repeat: Infinity, 
                            delay: i * 0.2 
                          }}
                          className="w-2 h-2 bg-gray-400 rounded-full"
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Chat Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Suggestion Chips */}
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestionChips.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs"
              >
                {suggestion}
              </Button>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Teach me something about yourself..."
                className="pr-12 rounded-2xl"
                disabled={isTyping || !isConnected}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <Mic className="w-4 h-4" />
              </Button>
            </div>
            <Button
              type="submit"
              disabled={!inputValue.trim() || isTyping || !isConnected}
              className="rounded-2xl px-6"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>

          {/* Teaching Tips */}
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500">
              💡 Tip: The more you chat, the smarter {bot.name} becomes! Try describing your feelings, preferences, and experiences.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
