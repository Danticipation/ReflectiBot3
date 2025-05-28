import { Bot, Milestone, LearnedWord } from '@shared/schema';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Brain, Target, Heart } from 'lucide-react';

interface SidebarProps {
  bot: Bot;
  milestones: Milestone[];
  learnedWords: LearnedWord[];
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ bot, milestones, learnedWords, isOpen, onClose }: SidebarProps) {
  const getPersonalityLevel = (trait: string): number => {
    const traits = bot.personalityTraits as Record<string, number>;
    return Math.round(traits[trait] || 1);
  };

  const getProgressPercentage = (current: number, max: number): number => {
    return Math.min((current / max) * 100, 100);
  };

  const levelProgress = getProgressPercentage(bot.wordsLearned, 200);
  const wordsProgress = getProgressPercentage(bot.wordsLearned, 200);

  const recentMilestones = milestones.slice(-3).reverse();
  const todaysLearning = learnedWords
    .filter(word => {
      const today = new Date();
      const wordDate = new Date(word.firstLearnedAt);
      return wordDate.toDateString() === today.toDateString();
    })
    .slice(0, 5);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed lg:relative inset-y-0 left-0 z-40 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="h-full flex flex-col">
          {/* Bot Profile Header */}
          <div className="p-6 bg-gradient-to-r from-primary to-secondary text-white">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                  🤖
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold">{bot.name}</h2>
                <p className="text-white/80 text-sm">Learning from you...</p>
              </div>
            </div>
          </div>

          {/* Growth Progress */}
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Growth Progress</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Intelligence Level</span>
                  <span>Level {bot.level}</span>
                </div>
                <Progress value={levelProgress} className="h-3" />
              </div>

              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Words Learned</span>
                  <span>{bot.wordsLearned}/200</span>
                </div>
                <Progress value={wordsProgress} className="h-3" />
              </div>
            </div>

            {/* Milestones */}
            {recentMilestones.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Milestones</h4>
                <div className="space-y-2">
                  {recentMilestones.map((milestone) => (
                    <Card key={milestone.id} className="p-3 bg-green-50 border-green-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <Star className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{milestone.title}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(milestone.achievedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bot Personality Traits */}
          <div className="p-6 flex-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Personality Traits</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Enthusiasm
                </span>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`w-3 h-3 rounded-full ${
                        level <= getPersonalityLevel('enthusiasm') 
                          ? 'bg-yellow-500' 
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Humor
                </span>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`w-3 h-3 rounded-full ${
                        level <= getPersonalityLevel('humor') 
                          ? 'bg-purple-500' 
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Curiosity
                </span>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`w-3 h-3 rounded-full ${
                        level <= getPersonalityLevel('curiosity') 
                          ? 'bg-blue-500' 
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Today's Learning */}
            {todaysLearning.length > 0 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Today I Learned</h4>
                <div className="flex flex-wrap gap-1">
                  {todaysLearning.map((word) => (
                    <Badge key={word.id} variant="secondary" className="text-xs">
                      {word.word}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
