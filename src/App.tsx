import React, { useState, useRef } from 'react';
import { MessageCircle, Brain, BookOpen, Mic, User, Square } from 'lucide-react';

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
    { id: 'profile', icon: User, label: 'Profile', emoji: '👤' }
  ];

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Mock transcription for demo
        const mockTranscript = `Voice recording completed at ${new Date().toLocaleTimeString()}`;
        setTranscript(mockTranscript);
        addMessage(mockTranscript, 'user');
        
        // Auto-respond as AI
        setTimeout(() => {
          addMessage("I heard your voice message! This is a demo response since we don't have a server running yet.", 'ai');
        }, 1000);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const addMessage = (text: string, sender: 'user' | 'ai') => {
    const newMessage = {
      id: Date.now().toString() + Math.random(),
      text,
      sender
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = (text: string) => {
    if (text.trim()) {
      addMessage(text, 'user');
      
      // Mock AI response
      setTimeout(() => {
        const responses = [
          "That's interesting! Tell me more about that.",
          "I understand. How does that make you feel?",
          "Thanks for sharing that with me.",
          "That's a great point. What else would you like to discuss?",
          "I'm here to listen and help you reflect on your thoughts."
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addMessage(randomResponse, 'ai');
      }, 1000);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'chat':
        return (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-zinc-400 mt-20">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                  <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
                  <p>Ask me anything or use voice recording to get started!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-sm px-4 py-2 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-700 text-zinc-100'
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-zinc-700 p-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.target as HTMLInputElement;
                      sendMessage(input.value);
                      input.value = '';
                    }
                  }}
                />
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        );

      case 'voice':
        return (
          <div className="p-6">
            <div className="text-center">
              <div className="mb-8">
                <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6 transition-all ${
                  isRecording ? 'bg-red-100 animate-pulse' : 'bg-zinc-800'
                }`}>
                  <Mic className={`w-16 h-16 ${isRecording ? 'text-red-600' : 'text-zinc-400'}`} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isRecording ? 'Recording...' : 'Voice Recording'}
                </h2>
                <p className="text-zinc-400 mb-6">
                  {isRecording ? 'Speak now, click stop when finished' : 'Click to start recording your voice'}
                </p>
              </div>

              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>

              {transcript && (
                <div className="mt-8 p-4 bg-zinc-800 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Latest Recording:</h3>
                  <p className="text-zinc-300">{transcript}</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'insights':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">AI Insights</h2>
            <div className="grid gap-4">
              <div className="bg-zinc-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Conversation Patterns</h3>
                <p className="text-zinc-400">You've sent {messages.filter(m => m.sender === 'user').length} messages so far.</p>
              </div>
              <div className="bg-zinc-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Voice Activity</h3>
                <p className="text-zinc-400">{transcript ? 'Voice recording detected!' : 'No voice recordings yet.'}</p>
              </div>
              <div className="bg-zinc-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Engagement Level</h3>
                <p className="text-zinc-400">Active conversation in progress.</p>
              </div>
            </div>
          </div>
        );

      case 'knowledge':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Knowledge Base</h2>
            <div className="space-y-4">
              <div className="bg-zinc-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Recent Topics</h3>
                <ul className="text-zinc-400 space-y-1">
                  <li>• Voice recognition and transcription</li>
                  <li>• AI conversation patterns</li>
                  <li>• React development</li>
                  <li>• Personal reflection techniques</li>
                </ul>
              </div>
              <div className="bg-zinc-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Saved Insights</h3>
                <p className="text-zinc-400">Your conversations are helping build a personalized knowledge base.</p>
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Profile</h2>
            <div className="bg-zinc-800 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-zinc-700 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-zinc-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-semibold text-white">Reflective User</h3>
                  <p className="text-zinc-400">Active learner & thinker</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-400">Total Messages</p>
                  <p className="text-white font-semibold">{messages.length}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Voice Recordings</p>
                  <p className="text-white font-semibold">{transcript ? '1+' : '0'}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Sessions</p>
                  <p className="text-white font-semibold">1</p>
                </div>
                <div>
                  <p className="text-zinc-400">Status</p>
                  <p className="text-green-400 font-semibold">Active</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div className="p-6 text-white">Section not found</div>;
    }
  };

  return (
    <div className="flex h-screen bg-zinc-900 text-white">
      {/* Sidebar */}
      <div className="w-20 bg-zinc-800 border-r border-zinc-700 flex flex-col items-center py-6 space-y-4">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-110 ${
              activeSection === section.id
                ? 'bg-blue-600 shadow-lg shadow-blue-600/20'
                : 'bg-zinc-700 hover:bg-zinc-600'
            }`}
            title={section.label}
          >
            <span className="text-2xl">{section.emoji}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-16 bg-zinc-800 border-b border-zinc-700 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">Reflectibot</h1>
            <div className="text-sm text-zinc-400 capitalize">
              {sections.find(s => s.id === activeSection)?.label}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-zinc-400">Demo Mode</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default App;