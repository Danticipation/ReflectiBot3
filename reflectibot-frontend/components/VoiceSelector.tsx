import { useState, useEffect } from 'react';

interface Voice {
  name: string;
  id: string;
  description: string;
  accent: string;
  gender: string;
  default?: boolean;
}

interface VoiceSelectorProps {
  userId?: number;
  onVoiceChange?: (voice: Voice) => void;
}

export default function VoiceSelector({ userId = 1, onVoiceChange }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [currentVoice, setCurrentVoice] = useState<Voice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVoices();
    loadCurrentVoice();
  }, [userId]);

  const loadVoices = async () => {
    try {
      const response = await fetch('/api/voices');
      const data = await response.json();
      setVoices(data.voices || []);
    } catch (error) {
      console.error('Failed to load voices:', error);
    }
  };

  const loadCurrentVoice = async () => {
    try {
      const response = await fetch(`/api/voice/current?userId=${userId}`);
      const data = await response.json();
      setCurrentVoice(data.voice);
    } catch (error) {
      console.error('Failed to load current voice:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectVoice = async (voice: Voice) => {
    try {
      const response = await fetch('/api/voice/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId: voice.id, userId })
      });

      if (response.ok) {
        setCurrentVoice(voice);
        onVoiceChange?.(voice);
      }
    } catch (error) {
      console.error('Failed to select voice:', error);
    }
  };

  const getVoiceIcon = (gender: string) => {
    return gender === 'Female' ? '👩' : '👨';
  };

  const getAccentFlag = (accent: string) => {
    return accent === 'British' ? '🇬🇧' : '🇺🇸';
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-8 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 text-white">
      <h3 className="text-lg font-semibold mb-4 text-purple-400">
        🎙️ Choose Lily's Voice
      </h3>
      
      {currentVoice && (
        <div className="mb-4 p-3 bg-gray-700 rounded-lg border border-purple-500">
          <div className="text-sm text-gray-300 mb-1">Currently Selected:</div>
          <div className="flex items-center gap-2">
            <span>{getVoiceIcon(currentVoice.gender)}</span>
            <span className="font-medium">{currentVoice.name}</span>
            <span>{getAccentFlag(currentVoice.accent)}</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">{currentVoice.description}</div>
        </div>
      )}

      <div className="space-y-2">
        {voices.map((voice) => (
          <button
            key={voice.id}
            onClick={() => selectVoice(voice)}
            className={`w-full p-3 rounded-lg border text-left transition-all ${
              currentVoice?.id === voice.id
                ? 'bg-purple-600 border-purple-400'
                : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{getVoiceIcon(voice.gender)}</span>
                <span className="font-medium">{voice.name}</span>
                <span>{getAccentFlag(voice.accent)}</span>
              </div>
              {voice.default && (
                <span className="text-xs bg-emerald-600 px-2 py-1 rounded">Default</span>
              )}
            </div>
            <div className="text-xs text-gray-300 mt-1">{voice.description}</div>
          </button>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-400">
        Voice changes will apply to new messages from Lily
      </div>
    </div>
  );
}