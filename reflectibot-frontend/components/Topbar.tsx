import React from 'react';

interface TopbarProps {
  botStats: {
    level: number;
    stage: string;
    wordsLearned: number;
  } | null;
}

export const Topbar: React.FC<TopbarProps> = ({ botStats }) => {
  const logo = '/Reflectibot-transformed.jpeg';

  return (
    <header className="flex items-center justify-between p-4 border-b border-zinc-800 shadow-lg bg-zinc-950">
      <div className="flex items-center space-x-3">
        <img src={logo} alt="Reflectibot" className="w-8 h-8 rounded-full" />
        <h1 className="text-lg font-semibold tracking-wide">Reflectibot</h1>
        <HeartbeatPulse />
      </div>
      {botStats && (
        <LevelBar 
          level={botStats.level} 
          stage={botStats.stage}
          xp={botStats.wordsLearned} 
          maxXp={getMaxXpForStage(botStats.stage)} 
        />
      )}
    </header>
  );
};

const HeartbeatPulse = () => (
  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
);

const LevelBar = ({ level, stage, xp, maxXp }: { level: number; stage: string; xp: number; maxXp: number }) => {
  const percent = Math.min((xp / maxXp) * 100, 100);
  return (
    <div className="flex items-center space-x-3">
      <div className="text-right">
        <div className="text-sm font-medium">Level {level} • {stage}</div>
        <div className="text-xs text-zinc-400">{xp} / {maxXp} words</div>
      </div>
      <div className="w-32 h-2 bg-zinc-800 rounded-full">
        <div 
          className="h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500" 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
};

const getMaxXpForStage = (stage: string): number => {
  const stageXp = {
    'Infant': 10,
    'Toddler': 25,
    'Child': 50,
    'Adolescent': 100,
    'Adult': 1000
  };
  return stageXp[stage as keyof typeof stageXp] || 50;
};