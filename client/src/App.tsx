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
      id: Date.now(),
      content: input,
      isUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          botId: 1
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        const botMessage: Message = {
          id: Date.now() + 1,
          content: data.response,
          isUser: false
        };

        setMessages(prev => [...prev, botMessage]);
        
        // Speak the bot's response
        await speakText(data.response);
      } else {
        console.error('Chat request failed');
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1f2937, #000)', 
      color: 'white', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            color: '#10b981', 
            marginBottom: '10px',
            margin: '0 0 10px 0'
          }}>
            🪞 Mirror Bot
          </h1>
          <p style={{ color: '#9ca3af', margin: '0' }}>
            Your AI companion that learns and speaks
          </p>
        </div>

        <div style={{ 
          background: '#374151', 
          border: '1px solid #4b5563', 
          borderRadius: '12px', 
          padding: '20px', 
          marginBottom: '20px', 
          height: '400px', 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {messages.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#6b7280', 
              marginTop: '150px',
              fontSize: '16px'
            }}>
              <p style={{ margin: '0 0 10px 0' }}>Start a conversation with your Mirror Bot!</p>
              <p style={{ fontSize: '14px', margin: '0', opacity: '0.8' }}>
                It will learn from you and speak its responses.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{ 
                    display: 'flex', 
                    justifyContent: message.isUser ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '75%',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      background: message.isUser ? '#10b981' : '#4b5563',
                      color: 'white',
                      fontSize: '15px',
                      lineHeight: '1.4'
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ 
                    background: '#4b5563', 
                    color: '#9ca3af', 
                    padding: '12px 16px', 
                    borderRadius: '16px',
                    fontSize: '15px'
                  }}>
                    Thinking...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            style={{
              flex: 1,
              padding: '14px 16px',
              background: '#374151',
              border: '1px solid #4b5563',
              borderRadius: '12px',
              color: 'white',
              fontSize: '16px',
              outline: 'none',
              resize: 'none'
            }}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            style={{
              padding: '14px 20px',
              background: input.trim() && !isLoading ? '#10b981' : '#4b5563',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>

        {isSpeaking && (
          <div style={{ 
            textAlign: 'center', 
            marginTop: '20px',
            padding: '10px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <p style={{ color: '#10b981', margin: '0', fontSize: '14px' }}>
              🎤 Speaking...
            </p>
          </div>
        )}

        <audio ref={audioRef} style={{ display: 'none' }} />
        
        <div style={{ 
          textAlign: 'center', 
          marginTop: '30px', 
          fontSize: '12px', 
          color: '#6b7280',
          opacity: '0.7'
        }}>
          Mirror Bot v1.0 • Voice-enabled AI companion
        </div>
      </div>
    </div>
  );
}