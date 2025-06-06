import ChatWindow from './components/ChatWindow';

function App() {
  return (
    <div className="h-screen w-screen bg-black text-white">
      <ChatWindow />
    </div>
  );
}

export { App as MainApp };


import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Brain, BookOpen, Mic, User, MicOff, Square } from 'lucide-react';

const AppLayout: React.FC = () => {
  const [activeSection, setActiveSection] = useState('chat');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Array<{id: string, text: string, sender: 'user' | 'ai'}>>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [input, setInput] = useState('');

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

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        await sendAudioToWhisper(audioBlob);
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

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const sendAudioToWhisper = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    try {
      // Try local server first, fallback to mock response
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setTranscript(data.text || 'Transcription completed');
        addMessage(data.text || 'Voice message received', 'user');
      } else {
        throw new Error('Server not available');
      }
    } catch (error) {
      console.log('Local server not available, using mock response');
      // Mock response for demo purposes
      const mockTranscript = "This is a demo transcription since the Whisper server isn't running locally.";
      setTranscript(mockTranscript);
      addMessage(mockTranscript, 'user');
    }
  };

  const addMessage = (text: string, sender: 'user' | 'ai') => {
    const newMessage = {
      id: Date.now().toString(),
      text,
      sender
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const renderContent = () => {
    switch (activeSection) {
          case 'chat':
      return (
        <div className="flex flex-col h-full relative p-4">
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-3 max-w-[75%] rounded-2xl shadow ${
                  msg.sender === 'user'
                    ? 'ml-auto bg-blue-600 text-white'
                    : 'mr-auto bg-gray-200 text-black'
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          {/* Voice status or recording animation */}
          {isRecording && (
            <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 text-sm text-pink-600 animate-pulse">
              Listening...
            </div>
          )}

          {/* Button grid */}
          <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
            <button className="bg-purple-200 hover:bg-purple-300 p-2 rounded-xl shadow">📈 Stats</button>
            <button className="bg-green-200 hover:bg-green-300 p-2 rounded-xl shadow">🌱 Growth</button>
            <button className="bg-yellow-200 hover:bg-yellow-300 p-2 rounded-xl shadow">🧠 Reflect</button>
            <button className="bg-red-200 hover:bg-red-300 p-2 rounded-xl shadow">📚 Facts</button>
            <button className="bg-blue-200 hover:bg-blue-300 p-2 rounded-xl shadow">🔤 Words</button>
            <button className="bg-gray-200 hover:bg-gray-300 p-2 rounded-xl shadow">🔄 Switch</button>
          </div>

          {/* Input + Mic */}
          <div className="mt-4 flex items-center gap-2">
            <input
              type="text"
              className="flex-1 p-3 rounded-2xl border border-gray-300 shadow focus:outline-none"
              placeholder="Type your message..."
              value={input}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input.trim()) {
                  addMessage(input, 'user');
                  setInput('');
                }
              }}
            />
            <button
              onClick={toggleRecording}
              className={`p-3 rounded-full shadow ${
                isRecording ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
              }`}
            >
              🎤
            </button>
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
                  {isRecording ? (
                    <MicOff className="w-16 h-16 text-red-600" />
                  ) : (
                    <Mic className="w-16 h-16 text-zinc-400" />
                  )}
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
                  <h3 className="text-lg font-semibold text-white mb-2">Latest Transcription:</h3>
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
                <p className="text-zinc-400">Your conversations show interest in AI and technology topics.</p>
              </div>
              <div className="bg-zinc-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Learning Progress</h3>
                <p className="text-zinc-400">You're making great progress with voice-to-text interactions.</p>
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
                </ul>
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
                  <h3 className="text-xl font-semibold text-white">User</h3>
                  <p className="text-zinc-400">Active learner</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-400">Total Conversations</p>
                  <p className="text-white font-semibold">{messages.length}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Voice Recordings</p>
                  <p className="text-white font-semibold">{transcript ? '1' : '0'}</p>
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
        {sections.map((section) => {
          const Icon = section.icon;
          return (
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
          );
        })}
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
            <span className="text-sm text-zinc-400">Connected</span>
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

export default AppLayout;
export { App };