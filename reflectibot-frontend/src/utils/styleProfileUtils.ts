import fs from 'fs/promises';
import path from 'path';
import { analyzeUserMessage, extractPersonalityTraits } from './personalityUtils';

// Type definitions
export interface UserStyleProfileData {
  toneScores: Record<string, number>;
  styleTraits: string[];
  catchphrases: string[];
  lastUpdated: string;
}

const PROFILE_DIR = path.resolve(__dirname, '../data/userStyles');

// Ensure directory exists
(async () => {
  try {
    await fs.mkdir(PROFILE_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create userStyles directory:', err);
  }
})();

// Utility functions
function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length || 0;
}

function detectCatchphrases(messages: string[]): string[] {
  const freqMap: Record<string, number> = {};
  messages.forEach(msg => {
    const phrases = msg.toLowerCase().match(/\b(\w{3,})\b/g) || [];
    phrases.forEach(p => {
      freqMap[p] = (freqMap[p] || 0) + 1;
    });
  });
  return Object.entries(freqMap)
    .filter(([_, count]) => count > 2)
    .map(([phrase]) => phrase);
}

// Main class
export class UserStyleProfile {
  userId: string;
  profile: UserStyleProfileData;

  constructor(userId: string) {
    this.userId = userId;
    this.profile = {
      toneScores: {},
      styleTraits: [],
      catchphrases: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  private getProfilePath(): string {
    return path.join(PROFILE_DIR, `${this.userId}.json`);
  }

  async loadProfile(): Promise<void> {
    const filePath = this.getProfilePath();
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      this.profile = JSON.parse(raw);
    } catch {
      await this.saveProfile();
    }
  }

  async saveProfile(): Promise<void> {
    this.profile.lastUpdated = new Date().toISOString();
    const filePath = this.getProfilePath();
    await fs.writeFile(filePath, JSON.stringify(this.profile, null, 2));
  }

  async analyzeMessages(messages: string[]): Promise<void> {
    messages.forEach(msg => {
      const toneData = analyzeUserMessage(msg);
      if (toneData.tone) {
        this.profile.toneScores[toneData.tone] = (this.profile.toneScores[toneData.tone] || 0) + 1;
      }

      const traits = extractPersonalityTraits(msg);
      this.profile.styleTraits.push(...traits.filter(t => !this.profile.styleTraits.includes(t)));
    });

    const newCatchphrases = detectCatchphrases(messages);
    this.profile.catchphrases.push(...newCatchphrases.filter(p => !this.profile.catchphrases.includes(p)));
    await this.saveProfile();
  }

  generateStylePrompt(): string {
    const tones = Object.entries(this.profile.toneScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([tone]) => tone)
      .join(', ');

    const traits = this.profile.styleTraits.slice(0, 3).join(' and ');

    return `Reply in a ${tones || 'neutral'} tone. Use ${traits || 'a standard style'}.`;
  }
}

// Example export for generating prompt directly
export async function generateStylePrompt(userId: string): Promise<string> {
  const profile = new UserStyleProfile(userId);
  await profile.loadProfile();
  return profile.generateStylePrompt();
}
