import React from 'react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onTestTTS: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange, onTestTTS }) => {
  const navItems = [
    { id: 'chat', icon: '💬', label: 'Chat', color: 'text-blue-400' },
    { id: 'memory', icon: '🧠', label: 'Memory', color: 'text-purple-400' },
    { id: 'reflection', icon: '📘', label: 'Reflections', color: 'text-indigo-400' },
    { id: 'voice', icon: '🎤', label: 'Voice', color: 'text-emerald-400' },
    { id: 'user', icon: '👤', label: 'User', color: 'text-amber-400' },
  ];

  return (
    <aside className="w-20 bg-zinc-950 p-4 flex flex-col items-center space-y-6 border-r border-zinc-800">
      {navItems.map(({ id, icon, label, color }) => (
        <button
          key={id}
          onClick={() => onSectionChange(id)}
          className={`p-3 rounded-xl transition-all duration-200 group relative ${
            activeSection === id 
              ? `${color} bg-zinc-800 shadow-lg` 
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
          }`}
          title={label}
        >
          <span className="text-xl">{icon}</span>
          
          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            {label}
          </div>
          
          {/* Active indicator */}
          {activeSection === id && (
            <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-r"></div>
          )}
        </button>
      ))}
      
      {/* Test TTS Button */}
      <div className="flex-1"></div>
      <button
        onClick={onTestTTS}
        className="p-3 rounded-xl text-orange-400 hover:text-orange-300 hover:bg-zinc-800/50 transition-all group relative"
        title="Test TTS"
      >
        <span className="text-xl">🔊</span>
        <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
          Test TTS
        </div>
      </button>
    </aside>
  );
};