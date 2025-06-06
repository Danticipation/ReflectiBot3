import React, { useState, useRef } from 'react';
import {
  MessageCircle, Brain, BookOpen, Mic, User, Square
} from 'lucide-react';

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState('chat');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Array<{id: string, text: string, sender: 'user' | 'ai'}>>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const sections = [
    { id: 'chat', icon: MessageCircle, label: 'Chat', emoji: '💬' },
    { id: 'insights', icon: Brain, label: 'Insights', emoji: '🧠' },
    { id: 'knowledge', icon: BookOpen, label: 'Knowledge', emoji: '📘' },
    { id: 'voice', icon: Mic, label: 'Voice', emoji: '🎤' },
    { id: 'profile', icon: User, label: 'Profile', emoji: '👤' },
  ];

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const mockTranscript = `Voice recorded at ${new Date().toLocaleTimeString()}`;
        setTranscript(mockTranscript);
        addMessage(mockTranscript, 'user');
        setTimeout(() => {
          addMessage("Reflectibot heard your voice.", 'ai');
        }, 1000);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
      alert('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const addMessage = (text: string, sender: 'user' | 'ai') => {
    const newMessage = { id: `${Date.now()}-${Math.random()}`, text, sender };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    addMessage(text, 'user');
    setTimeout(() => {
      const replies = [
        "That's interesting. Go on.",
        "How does that make you feel?",
        "I'm listening.",
        "Want to explore that further?",
        "That's a good insight."
      ];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      addMessage(reply, 'ai');
    }, 1000);
  };

  const renderChat = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 md:py-12">
        <div className="max-w-3xl mx-auto space-y-6">
        {messages.length === 0 ? (
          <div className="text-center text-zinc-400 mt-40">
            <MessageCircle className="w-24 h-24 mx-auto mb-6 text-zinc-600 animate-pulse" />
            <h3 className="text-4xl font-bold text-white mb-4">Start a conversation</h3>
            <p className="text-xl">Ask me anything or use voice.</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl px-6 py-4 rounded-3xl text-lg md:text-xl shadow-xl transition-all duration-300 ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-white/10 text-zinc-100 backdrop-blur-md'}`}>
                {msg.text}
              </div>
            </div>
          ))
        )}
        </div>
      </div>
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center space-y-4 border-4 border-red-500 bg-yellow-300 p-8 text-black">
        <div className="bg-white px-6 py-3 rounded-xl shadow">🔥 I should be centered 🔥</div>
      </div>
      <div className="w-full max-w-3xl mx-auto flex items-center space-x-4 px-4 py-6">
        <input
          type="text"
          placeholder="Type your message..."
          className="flex-1 bg-zinc-900 border border-zinc-600 rounded-3xl px-6 md:px-8 py-4 md:py-6 text-white text-lg md:text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const input = e.target as HTMLInputElement;
              sendMessage(input.value);
              input.value = '';
            }
          }}
        />
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-6 md:px-8 py-4 md:py-6 rounded-3xl text-xl font-medium transition-all shadow-lg ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
        >
          {isRecording ? <Square className="w-6 h-6 md:w-8 md:h-8" /> : <Mic className="w-6 h-6 md:w-8 md:h-8" />}
        </button>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'chat':
        return renderChat();
      default:
        return <div className="p-12 text-white text-2xl">Section coming soon...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <header className="w-full h-20 bg-zinc-800 border-b border-zinc-700 flex items-center justify-center px-8">
        <div className="w-full max-w-7xl flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-4xl font-bold">Reflectibot</h1>
            <span className="text-2xl text-zinc-400">{sections.find(s => s.id === activeSection)?.label}</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xl text-zinc-400">Demo Mode</span>
          </div>
        </div>
      </header>

      <nav className="w-full bg-zinc-800 border-b border-zinc-700 flex justify-center py-6">
        <div className="flex space-x-4 md:space-x-6">
          {sections.map(({ id, label, emoji }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center space-x-3 md:space-x-4 px-6 py-3 md:px-8 md:py-4 rounded-2xl text-lg md:text-xl font-semibold transition-all ${activeSection === id ? 'bg-blue-600 text-white shadow-lg' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
            >
              <span className="text-2xl md:text-3xl">{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="w-full flex justify-center px-4 md:px-8">
        <div className="w-full max-w-7xl">          
          {renderSection()}
        </div>
      </main>
    </div>
  );
};

export default App;