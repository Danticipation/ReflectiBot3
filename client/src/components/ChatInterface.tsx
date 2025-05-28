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

  const handleVoiceInput = () => {
    // TODO: Implement voice input with Whisper or browser speech API
    alert("🎤 Voice input feature coming soon — powered by Whisper or browser speech API!");
  };

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
                onClick={handleVoiceInput}
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
