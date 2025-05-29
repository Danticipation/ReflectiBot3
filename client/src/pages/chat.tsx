import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChatInterface } from '@/components/ChatInterface';
import { Sidebar } from '@/components/Sidebar';
import { CelebrationModal } from '@/components/CelebrationModal';
import type { Bot, Message, Milestone, LearnedWord, LearningUpdate } from '@shared/schema';
import { Loader2 } from 'lucide-react';

export default function ChatPage() {
  const [botId] = useState(1); // For demo, using bot ID 1
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [celebrationModal, setCelebrationModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
  }>({
    isOpen: false,
    title: '',
    description: ''
  });

  // Fetch bot data
  const { data: bot, isLoading: botLoading, refetch: refetchBot } = useQuery<Bot>({
    queryKey: [`/api/bot/${botId}`],
  });

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: [`/api/bot/${botId}/messages`],
    enabled: !!bot,
  });

  // Fetch milestones
  const { data: milestones = [], refetch: refetchMilestones } = useQuery<Milestone[]>({
    queryKey: [`/api/bot/${botId}/milestones`],
    enabled: !!bot,
  });

  // Fetch learned words
  const { data: learnedWords = [], refetch: refetchWords } = useQuery<LearnedWord[]>({
    queryKey: [`/api/bot/${botId}/words`],
    enabled: !!bot,
  });

  // Weekly summary query
  const { data: weeklySummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['weekly-summary'],
    queryFn: async () => {
      const response = await fetch('/api/weekly-summary?userId=1');
      const data = await response.json();
      return data.summary;
    },
    enabled: showSummary
  });

  // Create bot if it doesn't exist
  useEffect(() => {
    if (!botLoading && !bot) {
      // Create a new bot
      fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1, // Demo user ID
          name: 'Mirror',
          level: 1,
          wordsLearned: 0,
          personalityTraits: {
            enthusiasm: 1,
            humor: 1,
            curiosity: 2
          }
        })
      }).then(() => {
        refetchBot();
      });
    }
  }, [bot, botLoading, refetchBot]);

  const handleLearningUpdate = (update: LearningUpdate) => {
    // Refetch bot data to get updated stats
    refetchBot();
    refetchWords();
    
    if (update.levelUp) {
      refetchMilestones();
    }
  };

  const handleMilestoneAchieved = () => {
    refetchMilestones().then((result) => {
      const latestMilestone = result.data?.[result.data.length - 1];
      if (latestMilestone) {
        setCelebrationModal({
          isOpen: true,
          title: latestMilestone.title,
          description: latestMilestone.description || 'You\'ve reached a new milestone!'
        });
      }
    });
  };

  if (botLoading || messagesLoading || !bot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Setting up your Mirror Bot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-gray-900 to-black text-white px-2 py-4">
      <div className="w-full max-w-3xl mx-auto h-full flex flex-col border border-gray-700 rounded-2xl overflow-hidden shadow-xl">
        <ChatInterface
          bot={bot}
          messages={messages}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onLearningUpdate={handleLearningUpdate}
          onMilestoneAchieved={handleMilestoneAchieved}
          onToggleSummary={() => setShowSummary(!showSummary)}
        />
      </div>

      {isSidebarOpen && (
        <div className="w-full max-w-3xl mx-auto mt-4 p-4 bg-gray-800 rounded-xl shadow text-left">
          <h2 className="text-lg font-bold text-emerald-400 mb-2">Growth Dashboard</h2>
          <ul className="list-disc pl-6 space-y-1 text-sm text-gray-300">
            <li><strong>Words Learned:</strong> {learnedWords.length}</li>
            <li><strong>Facts Remembered:</strong> {milestones.length} personal entries</li>
            <li><strong>Current Stage:</strong> {bot.level === 1 ? 'Toddler 🍼' : bot.level === 2 ? 'Child 👶' : bot.level === 3 ? 'Adolescent 🧒' : 'Adult 🧑'}</li>
            <li><strong>Next Milestone:</strong> Keep chatting to unlock new abilities</li>
          </ul>
        </div>
      )}

      {showSummary && (
        <div className="w-full max-w-3xl mx-auto mt-4 p-4 bg-gray-900 border border-gray-700 rounded-xl shadow text-left">
          <h3 className="text-lg text-emerald-400 mb-2">🧾 Your Weekly Reflection</h3>
          <p className="text-sm text-gray-300 whitespace-pre-line">
            {summaryLoading ? 'Generating your weekly summary...' : weeklySummary || 'No summary available yet.'}
          </p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 text-center">Reflectibot™ v1.0 — Built for mobile. Powered by memory.</div>

      <CelebrationModal
        isOpen={celebrationModal.isOpen}
        onClose={() => setCelebrationModal(prev => ({ ...prev, isOpen: false }))}
        title={celebrationModal.title}
        description={celebrationModal.description}
      />
    </div>
  );
}
