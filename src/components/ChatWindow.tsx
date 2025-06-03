import type { Express, Request, Response } from "express";
import multer from 'multer';
import { storage } from "./storage.js";
import { OpenAI } from "openai";
import { getReflectibotPrompt } from './utils/promptUtils.js';
import { analyzeUserMessage } from './utils/personalityUtils.js';
import { UserStyleProfile } from './utils/styleProfileUtils.js';

import fetch, { Blob } from 'node-fetch';
import FormData from 'form-data';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const upload = multer({ storage: multer.memoryStorage() });

function getStageFromWordCount(wordCount: number): string {
  if (wordCount < 10) return "Infant";
  if (wordCount < 25) return "Toddler";
  if (wordCount < 50) return "Child";
  if (wordCount < 100) return "Adolescent";
  return "Adult";
}

function extractKeywords(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 10);
}

async function generateResponse(userMessage: string, botId: number, userId: number, stylePrompt?: string): Promise<string> {
  try {
    const memories = await storage.getUserMemories(userId);
    const facts = await storage.getUserFacts(userId);
    const learnedWords = await storage.getLearnedWords(botId);
    const personality = analyzeUserMessage(userMessage);
    const stage = getStageFromWordCount(learnedWords.length);

    const systemPrompt = getReflectibotPrompt({
      factContext: facts.map(f => f.fact).join('\n'),
      memoryContext: memories.map(m => m.memory).join('\n'),
      stage,
      learnedWordCount: learnedWords.length,
      personality: personality?.tone ? { tone: personality.tone } : { tone: "neutral" }
    });

    const promptWithStyle = `${stylePrompt || ''}\n\n${systemPrompt}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: promptWithStyle },
        { role: "user", content: userMessage }
      ],
      max_tokens: 150,
    });

    return response.choices[0].message?.content || "Sorry, I'm not sure how to respond.";
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "I'm having trouble generating a response right now.";
  }
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
        const formatted = memories.map((m: any) => ({ sender: 'user', text: m.memory }));
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
        body: JSON.stringify({ message: userMessage.text, userId })
      });
      const data = await res.json();
      const botMessage: Message = { sender: 'bot', text: data.response };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'bot', text: 'Something went wrong.' }]);
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
