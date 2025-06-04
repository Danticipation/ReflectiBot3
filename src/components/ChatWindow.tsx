import React, { useState, useRef, useEffect } from 'react';
import WhisperRecorder from './WhisperRecorder';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  loading: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onSendMessage, loading }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <h2 className="text-xl font-semibold text-zinc-200 mb-2">Welcome to Reflectibot!</h2>
            <p className="text-zinc-400 mb-1">Start a conversation and watch me learn from you.</p>
            <p className="text-zinc-500 text-sm">I'll speak my responses and adapt to your style over time.</p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-lg px-4 py-3 rounded-2xl shadow-lg ${
                  msg.sender === 'user' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-zinc-700 border border-zinc-600'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <p className="text-xs opacity-60 mt-1">{msg.time}</p>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-700 border border-zinc-600 rounded-2xl px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-800 bg-zinc-900/50 p-4">
        {/* Voice Input */}
        <div className="mb-4">
          <WhisperRecorder 
            onTranscription={(text) => setInput(text)} 
            onResponse={() => {}} 
          />
        </div>

        {/* Text Input */}
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Share your thoughts..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 resize-none"
            rows={1}
            disabled={loading}
            style={{
              minHeight: '44px',
              maxHeight: '120px'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-6 py-3 rounded-xl font-medium transition-all"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              'Send'
            )}
          </button>
        </div>

        <div className="text-xs text-zinc-500 text-center mt-2">
          Press Enter to send • Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};