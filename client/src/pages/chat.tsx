import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChatInterface } from '@/components/ChatInterface';
import { Sidebar } from '@/components/Sidebar';
import { CelebrationModal } from '@/components/CelebrationModal';
import type { Bot, Message, Milestone, LearnedWord, LearningUpdate } from '@shared/schema';
import { Loader2 } from 'lucide-react';

export default function ChatPage() {
  const [botId] = useState(1); // For demo, using bot ID 1
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar
        bot={bot}
        milestones={milestones}
        learnedWords={learnedWords}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <ChatInterface
        bot={bot}
        messages={messages}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onLearningUpdate={handleLearningUpdate}
        onMilestoneAchieved={handleMilestoneAchieved}
      />

      <CelebrationModal
        isOpen={celebrationModal.isOpen}
        onClose={() => setCelebrationModal(prev => ({ ...prev, isOpen: false }))}
        title={celebrationModal.title}
        description={celebrationModal.description}
      />
    </div>
  );
}
