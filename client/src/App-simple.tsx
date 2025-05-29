import React, { useState, useRef } from 'react';

interface Message {
  id: number;
  content: string;
  isUser: boolean;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

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
      }
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      content: input,
      isUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          botId: 1
        })
      });

      const data = await response.json();
      
      const botMessage: Message = {
        id: Date.now() + 1,
        content: data.response,
        isUser: false
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Speak the bot's response
      speakText(data.response);
      
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1f2937, #000)', color: 'white', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981', marginBottom: '10px' }}>Mirror Bot</h1>
          <p style={{ color: '#9ca3af' }}>Your AI companion that learns and speaks</p>
        </div>

        <div style={{ 
          background: '#374151', 
          border: '1px solid #4b5563', 
          borderRadius: '12px', 
          padding: '20px', 
          marginBottom: '20px', 
          height: '400px', 
          overflowY: 'auto' 
        }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '150px' }}>
              <p>Start a conversation with your Mirror Bot!</p>
              <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>It will learn from you and speak its responses.</p>
            </div>
          ) : (
            <div>
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{ 
                    display: 'flex', 
                    justifyContent: message.isUser ? 'flex-end' : 'flex-start',
                    marginBottom: '15px'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '70%',
                      padding: '10px 15px',
                      borderRadius: '12px',
                      background: message.isUser ? '#10b981' : '#4b5563',
                      color: 'white'
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ background: '#4b5563', color: 'white', padding: '10px 15px', borderRadius: '12px' }}>
                    Thinking...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            style={{
              flex: 1,
              padding: '12px',
              background: '#374151',
              border: '1px solid #4b5563',
              borderRadius: '8px',
              color: 'white',
              fontSize: '16px'
            }}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            style={{
              padding: '12px 24px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              opacity: (isLoading || !input.trim()) ? 0.5 : 1
            }}
          >
            Send
          </button>
        </div>

        {isSpeaking && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p style={{ color: '#10b981' }}>🎤 Speaking...</p>
          </div>
        )}

        <audio ref={audioRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}