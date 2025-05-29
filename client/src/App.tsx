import React, { useState, useRef, useEffect } from 'react';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [botStats, setBotStats] = useState({
    level: 1,
    wordsLearned: 0,
    stage: 'Infant'
  });
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new (window as any).webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event: any) => {
        setInput(event.results[0][0].transcript);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
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
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        await audio.play();
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, botId: 1 })
      });

      if (response.ok) {
        const data = await response.json();
        
        const botMessage: Message = {
          text: data.response,
          sender: 'bot',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, botMessage]);
        
        setBotStats({
          level: data.level,
          wordsLearned: data.wordsLearned,
          stage: data.level === 1 ? 'Infant' : data.level === 2 ? 'Child' : data.level === 3 ? 'Adolescent' : 'Adult'
        });

        await speakText(data.response);
      } else {
        const errorMessage: Message = {
          text: 'Sorry, I had trouble processing that. Please try again.',
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        text: 'Sorry, I had trouble processing that. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center p-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-emerald-400 mb-2">🪞 Mirror Bot</h1>
        <p className="text-gray-400 text-sm">AI companion that learns and speaks</p>
        <div className="flex justify-center gap-4 mt-3">
          <div className="bg-gray-800 px-3 py-1 rounded-lg text-xs border border-gray-700">
            <span className="text-emerald-400">Level {botStats.level}</span>
            <span className="text-gray-400 ml-2">• {botStats.stage}</span>
          </div>
          <div className="bg-gray-800 px-3 py-1 rounded-lg text-xs border border-gray-700">
            <span className="text-blue-400">{botStats.wordsLearned}</span>
            <span className="text-gray-400 ml-1">words learned</span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🤖</div>
            <h3 className="text-lg text-gray-300 mb-2">Welcome to Mirror Bot!</h3>
            <p className="text-gray-500">Start a conversation and watch me learn from you.</p>
            <p className="text-gray-500 text-xs mt-2">I'll speak my responses and adapt to your style.</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div key={index} className={`mb-3 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block px-4 py-2 rounded-xl max-w-xs ${
                  message.sender === 'user' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-gray-700 text-gray-100 border border-gray-600'
                }`}>
                  <div className="text-sm leading-relaxed">{message.text}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="text-left mb-3">
                <div className="bg-gray-700 border border-gray-600 px-4 py-2 rounded-xl inline-block">
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
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <button 
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Send
          </button>
          <button 
            onClick={startListening}
            disabled={isListening || isLoading}
            className={`px-3 py-2 rounded-lg text-white ${
              isListening 
                ? 'bg-red-600 animate-pulse' 
                : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600'
            }`}
          >
            🎤
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 flex justify-between">
          <div>
            {isListening && <span className="text-red-400">🎤 Listening...</span>}
            {isSpeaking && <span className="text-emerald-400">🔊 Speaking...</span>}
          </div>
          <span>Press Enter to send</span>
        </div>
      </div>
    </div>
  );
}

export default App;