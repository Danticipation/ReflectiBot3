// AppLayout.tsx
import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import ChatWindow from './ChatWindow';

export const AppLayout = () => {
  return (
    <div className="flex h-screen bg-zinc-900 text-zinc-100">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4">
          <ChatWindow />
        </main>
      </div>
    </div>
  );
};

// Topbar.tsx
import React from 'react';
import logo from '/mnt/data/Reflectibot-transformed.jpeg';

export const Topbar = () => {
  return (
    <header className="flex items-center justify-between p-4 border-b border-zinc-800 shadow-lg">
      <div className="flex items-center space-x-3">
        <img src={logo} alt="Reflectibot" className="w-8 h-8 rounded-full" />
        <h1 className="text-lg font-semibold tracking-wide">Reflectibot</h1>
        <HeartbeatPulse />
      </div>
      <LevelBar level={3} xp={320} maxXp={1000} />
    </header>
  );
};

const HeartbeatPulse = () => (
  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
);

const LevelBar = ({ level, xp, maxXp }: { level: number; xp: number; maxXp: number }) => {
  const percent = Math.min((xp / maxXp) * 100, 100);
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm">Lv. {level}</span>
      <div className="w-40 h-2 bg-zinc-800 rounded-full">
        <div className="h-2 bg-green-500 rounded-full" style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
};

// Sidebar.tsx
import React from 'react';
import { LucideMic, LucideMessageSquare, LucideBarChart, LucideBookOpen } from 'lucide-react';

export const Sidebar = () => {
  const navItems = [
    { icon: <LucideBookOpen size={20} />, label: 'Memory' },
    { icon: <LucideMessageSquare size={20} />, label: 'Reflections' },
    { icon: <LucideMic size={20} />, label: 'Voice' },
    { icon: <LucideBarChart size={20} />, label: 'Analytics' },
  ];

  return (
    <aside className="w-20 bg-zinc-950 p-4 flex flex-col items-center space-y-6 border-r border-zinc-800">
      {navItems.map(({ icon, label }) => (
        <button
          key={label}
          className="text-zinc-400 hover:text-zinc-100 transition-colors"
          title={label}
        >
          {icon}
        </button>
      ))}
    </aside>
  );
};

// ChatWindow.tsx
import React, { useState } from 'react';

export const ChatWindow = () => {
  const [messages, setMessages] = useState([
    { from: 'user', text: 'Hey, Reflectibot!' },
    { from: 'bot', text: 'Hey! Ready to explore your thoughts today?' },
  ]);

  return (
    <div className="flex flex-col space-y-4">
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`max-w-xl px-4 py-2 rounded-2xl shadow-lg ${
            msg.from === 'user' ? 'self-end bg-zinc-800' : 'self-start bg-zinc-700'
          }`}
        >
          <p>{msg.text}</p>
        </div>
      ))}
      <VoiceControls />
    </div>
  );
};

const VoiceControls = () => (
  <div className="mt-4 flex items-center space-x-4">
    <button className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 transition shadow-lg">
      🎤 Start Talking
    </button>
    <div className="loader ease-linear rounded-full border-2 border-t-2 border-green-500 h-6 w-6 animate-spin"></div>
  </div>
);
