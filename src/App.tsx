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
        const mockTranscript = `Voice recording completed at ${new Date().toLocaleTimeString()}`;
        setTranscript(mockTranscript);
        addMessage(mockTranscript, 'user');
        
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
            <div className="flex-1 overflow-y-auto p-12">
              <div className="max-w-4xl mx-auto space-y-8">
                {messages.length === 0 ? (
                  <div className="text-center text-zinc-400 mt-40">
                    <MessageCircle className="w-32 h-32 mx-auto mb-8 text-zinc-600" />
                    <h3 className="text-5xl font-bold mb-6 text-white">Start a conversation</h3>
                    <p className="text-2xl">Ask me anything or use voice recording to get started!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-3xl px-8 py-6 rounded-3xl text-xl ${
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
            </div>
            <div className="border-t border-zinc-700 p-8 bg-zinc-800">
              <div className="max-w-4xl mx-auto flex space-x-6">
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 bg-zinc-900 border border-zinc-600 rounded-3xl px-8 py-6 text-white text-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
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
                  className={`px-8 py-6 rounded-3xl font-medium transition-all text-xl ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </button>
              </div>
            </div>
          </div>
        );

      case 'voice':
        return (
          <div className="h-full flex items-center justify-center p-12">
            <div className="text-center max-w-4xl">
              <div className="mb-16">
                <div className={`w-80 h-80 mx-auto rounded-full flex items-center justify-center mb-12 transition-all ${
                  isRecording ? 'bg-red-200 animate-pulse' : 'bg-zinc-800'
                }`}>
                  <Mic className={`w-40 h-40 ${isRecording ? 'text-red-600' : 'text-zinc-400'}`} />
                </div>
                <h2 className="text-6xl font-bold text-white mb-8">
                  {isRecording ? 'Recording...' : 'Voice Recording'}
                </h2>
                <p className="text-zinc-400 mb-12 text-3xl">
                  {isRecording ? 'Speak now, click stop when finished' : 'Click to start recording your voice'}
                </p>
              </div>

              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`px-16 py-8 rounded-3xl font-bold text-3xl transition-all ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>

              {transcript && (
                <div className="mt-16 p-8 bg-zinc-800 rounded-3xl">
                  <h3 className="text-3xl font-bold text-white mb-6">Latest Recording:</h3>
                  <p className="text-zinc-300 text-xl">{transcript}</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'insights':
        return (
          <div className="p-12 h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-6xl font-bold text-white mb-12">AI Insights</h2>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                <div className="bg-zinc-800 p-8 rounded-3xl">
                  <h3 className="text-3xl font-bold text-white mb-6">Conversation Patterns</h3>
                  <p className="text-zinc-400 text-xl">You've sent {messages.filter(m => m.sender === 'user').length} messages so far.</p>
                </div>
                <div className="bg-zinc-800 p-8 rounded-3xl">
                  <h3 className="text-3xl font-bold text-white mb-6">Voice Activity</h3>
                  <p className="text-zinc-400 text-xl">{transcript ? 'Voice recording detected!' : 'No voice recordings yet.'}</p>
                </div>
                <div className="bg-zinc-800 p-8 rounded-3xl">
                  <h3 className="text-3xl font-bold text-white mb-6">Engagement Level</h3>
                  <p className="text-zinc-400 text-xl">Active conversation in progress.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'knowledge':
        return (
          <div className="p-12 h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-6xl font-bold text-white mb-12">Knowledge Base</h2>
              <div className="space-y-8">
                <div className="bg-zinc-800 p-8 rounded-3xl">
                  <h3 className="text-3xl font-bold text-white mb-6">Recent Topics</h3>
                  <ul className="text-zinc-400 space-y-3 text-xl">
                    <li>• Voice recognition and transcription</li>
                    <li>• AI conversation patterns</li>
                    <li>• React development</li>
                    <li>• Personal reflection techniques</li>
                  </ul>
                </div>
                <div className="bg-zinc-800 p-8 rounded-3xl">
                  <h3 className="text-3xl font-bold text-white mb-6">Saved Insights</h3>
                  <p className="text-zinc-400 text-xl">Your conversations are helping build a personalized knowledge base.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="p-12 h-full overflow-y-auto">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-6xl font-bold text-white mb-12">Profile</h2>
              <div className="bg-zinc-800 p-12 rounded-3xl">
                <div className="flex items-center mb-12">
                  <div className="w-40 h-40 bg-zinc-700 rounded-full flex items-center justify-center">
                    <User className="w-20 h-20 text-zinc-400" />
                  </div>
                  <div className="ml-12">
                    <h3 className="text-5xl font-bold text-white">Reflective User</h3>
                    <p className="text-zinc-400 text-2xl mt-4">Active learner & thinker</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-12 text-2xl">
                  <div>
                    <p className="text-zinc-400 mb-2">Total Messages</p>
                    <p className="text-white font-bold text-4xl">{messages.length}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 mb-2">Voice Recordings</p>
                    <p className="text-white font-bold text-4xl">{transcript ? '1+' : '0'}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 mb-2">Sessions</p>
                    <p className="text-white font-bold text-4xl">1</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 mb-2">Status</p>
                    <p className="text-green-400 font-bold text-4xl">Active</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div className="p-12 text-white text-2xl">Section not found</div>;
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-900 text-white">
      {/* Top Navigation Bar */}
      <div className="w-full h-20 bg-zinc-800 border-b border-zinc-700 flex items-center justify-center px-8">
        <div className="w-full max-w-7xl flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-4xl font-bold">Reflectibot</h1>
            <div className="text-2xl text-zinc-400 capitalize">
              {sections.find(s => s.id === activeSection)?.label}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-xl text-zinc-400">Demo Mode</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="w-full bg-zinc-800 border-b border-zinc-700 flex justify-center py-6">
        <div className="flex space-x-6">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center space-x-4 px-8 py-4 rounded-2xl transition-all text-xl font-semibold ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }`}
            >
              <span className="text-3xl">{section.emoji}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area - PROPERLY CENTERED */}
      <div className="w-full flex justify-center">
        <div className="w-full max-w-7xl">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default App;