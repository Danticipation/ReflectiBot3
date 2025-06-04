import { UserStyleProfile } from '../utils/styleProfileUtils';

export async function updateUserStyleAndGetPrompt(userId: string, message: string): Promise<string> {
  const profile = new UserStyleProfile(userId);
  await profile.loadProfile();
  await profile.analyzeMessages([message]);
  return profile.generateStylePrompt();
}
