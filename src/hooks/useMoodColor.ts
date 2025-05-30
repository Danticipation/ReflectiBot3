import { useEffect, useState } from 'react';

export type MoodColor = {
  mood: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  stage: string;
};

export const useMoodColor = (userId: number) => {
  const [moodColor, setMoodColor] = useState<MoodColor>({
    mood: 'neutral',
    primaryColor: '#1f2937',
    accentColor: '#10b981',
    textColor: '#ffffff',
    stage: 'Infant'
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMoodAndStage = async () => {
      try {
        setIsLoading(true);
        
        // Get mood analysis
        const moodRes = await fetch(`/api/mood-analysis?userId=${userId}`);
        const moodData = await moodRes.json();
        
        // Get current stage
        const statsRes = await fetch(`/api/stats?userId=${userId}`);
        const statsData = await statsRes.json();
        
        setMoodColor({
          mood: moodData.mood || 'neutral',
          primaryColor: moodData.primaryColor || '#1f2937',
          accentColor: moodData.accentColor || '#10b981',
          textColor: moodData.textColor || '#ffffff',
          stage: statsData.stage || 'Infant'
        });
      } catch (error) {
        console.error('Failed to fetch mood/stage data:', error);
        // Keep default values on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchMoodAndStage();
    
    // Refresh mood every 30 seconds
    const interval = setInterval(fetchMoodAndStage, 30000);
    
    return () => clearInterval(interval);
  }, [userId]);

  return { moodColor, isLoading };
};