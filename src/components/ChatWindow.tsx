import { useEffect, useRef, useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { motion } from 'framer-motion';
import { ScrollArea } from './ui/scroll-area';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userId = 1;

  useEffect(() => {
    fetch(`/api/memories/${userId}`)
      .then(res => res.json())
      .then(memories => {
        const formatted = memories.map((m: any) => ({
          sender: 'user',
          text: m.memory
        }));
        setMessages(formatted);
      });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, userId })
      });
      const data = await res.json();
      const botMessage: Message = { sender: 'bot', text: data.response };
      setMessages(prev => [...prev, botMessage]);
    } catch {
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: 'Something went wrong.'
      }]);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="max-w-xs p-3 rounded-xl bg-muted text-sm">
              {msg.text}
            </div>
          </motion.div>
        ))}
        <div ref={scrollRef} />
      </ScrollArea>

      <div className="flex p-4 gap-2 border-t">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Say something..."
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={loading}>
          {loading ? '...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
