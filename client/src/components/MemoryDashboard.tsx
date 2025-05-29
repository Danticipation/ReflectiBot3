import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface MemoryStats {
  wordCount: number;
  factCount: number;
  memoryCount: number;
  stage: string;
  nextStageAt: number;
}

interface Memory {
  id: number;
  memory: string;
  type: 'fact' | 'memory';
  createdAt: string;
}

export default function MemoryDashboard({ userId = 1 }: { userId?: number }) {
  const { data: stats, isLoading: statsLoading } = useQuery<MemoryStats>({
    queryKey: ['/api/stats', userId],
    queryFn: async () => {
      const response = await fetch(`/api/stats?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  const { data: facts = [], isLoading: factsLoading } = useQuery<Memory[]>({
    queryKey: ['/api/memory/list', userId, 'fact'],
    queryFn: async () => {
      const response = await fetch(`/api/memory/list?userId=${userId}&type=fact`);
      if (!response.ok) throw new Error('Failed to fetch facts');
      return response.json();
    },
    refetchInterval: 5000
  });

  if (statsLoading) {
    return (
      <div className="p-6 bg-gray-800 rounded-xl shadow-lg text-white">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 bg-gray-800 rounded-xl shadow-lg text-white">
        <p className="text-gray-400">Unable to load memory stats</p>
      </div>
    );
  }

  const progressToNext = stats.nextStageAt > 0 ? (stats.wordCount / stats.nextStageAt) * 100 : 100;
  const stageEmojis = {
    'Infant': '👶',
    'Toddler': '🧒',
    'Child': '👦',
    'Adolescent': '👨‍🎓',
    'Adult': '🧠'
  };

  const stageColors = {
    'Infant': 'from-red-500 to-pink-500',
    'Toddler': 'from-orange-500 to-yellow-500',
    'Child': 'from-yellow-500 to-green-500',
    'Adolescent': 'from-blue-500 to-purple-500',
    'Adult': 'from-purple-500 to-emerald-500'
  };

  return (
    <div className="space-y-6">
      {/* Main Stats Card */}
      <div className="p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg text-white border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-emerald-400">Memory Growth Dashboard</h2>
          <div className="text-right">
            <div className="text-sm text-gray-400">Current Stage</div>
            <div className="text-xl font-bold">
              {stageEmojis[stats.stage as keyof typeof stageEmojis]} {stats.stage}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>Progress to Next Stage</span>
            <span>{stats.wordCount} / {stats.nextStageAt} words</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className={`h-3 rounded-full bg-gradient-to-r ${stageColors[stats.stage as keyof typeof stageColors]} transition-all duration-500`}
              style={{ width: `${Math.min(progressToNext, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-700/50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.wordCount}</div>
            <div className="text-sm text-gray-400">Words Learned</div>
          </div>
          <div className="bg-gray-700/50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.factCount}</div>
            <div className="text-sm text-gray-400">Facts Remembered</div>
          </div>
          <div className="bg-gray-700/50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.memoryCount}</div>
            <div className="text-sm text-gray-400">Conversations</div>
          </div>
        </div>
      </div>

      {/* Facts Panel */}
      <div className="p-6 bg-gray-800 rounded-xl shadow-lg text-white border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-emerald-400 flex items-center">
          <span className="mr-2">📌</span>
          Facts About You
        </h3>
        
        {factsLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
        ) : facts.length === 0 ? (
          <p className="text-gray-400 italic">
            No facts learned yet. Tell me about yourself to help me remember!
          </p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {facts.slice(-10).reverse().map((fact) => (
              <div 
                key={fact.id} 
                className="p-3 bg-gray-700/50 rounded-lg border-l-4 border-emerald-500"
              >
                <div className="text-gray-300">{fact.memory}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(fact.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Learning Milestones */}
      <div className="p-6 bg-gray-800 rounded-xl shadow-lg text-white border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-blue-400 flex items-center">
          <span className="mr-2">🎯</span>
          Learning Milestones
        </h3>
        
        <div className="space-y-3">
          {[
            { stage: 'Infant', threshold: 10, emoji: '👶' },
            { stage: 'Toddler', threshold: 25, emoji: '🧒' },
            { stage: 'Child', threshold: 50, emoji: '👦' },
            { stage: 'Adolescent', threshold: 100, emoji: '👨‍🎓' },
            { stage: 'Adult', threshold: 1000, emoji: '🧠' }
          ].map((milestone) => {
            const isCompleted = stats.wordCount >= milestone.threshold;
            const isCurrent = stats.stage === milestone.stage;
            
            return (
              <div 
                key={milestone.stage}
                className={`flex items-center p-3 rounded-lg ${
                  isCurrent ? 'bg-emerald-600/20 border border-emerald-500' :
                  isCompleted ? 'bg-gray-700/50' : 'bg-gray-700/30'
                }`}
              >
                <span className="text-2xl mr-3">{milestone.emoji}</span>
                <div className="flex-1">
                  <div className={`font-medium ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                    {milestone.stage}
                  </div>
                  <div className="text-sm text-gray-400">
                    {milestone.threshold} words required
                  </div>
                </div>
                <div className={`text-sm px-2 py-1 rounded ${
                  isCompleted ? 'bg-green-600 text-white' :
                  isCurrent ? 'bg-emerald-600 text-white' : 'bg-gray-600 text-gray-300'
                }`}>
                  {isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Locked'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}