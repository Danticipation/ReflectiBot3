export const storage = {
  async getUserMemories(userId: number) {
    return [];
  },

  async getUserFacts(userId: number) {
    return [];
  },

  async getLearnedWords(botId: number) {
    return [];
  },

  async getBotByUserId(userId: number) {
    return null;
  },

  async createBot(bot: { userId: number; name: string }) {
    return { id: 1, ...bot };
  },

  async createMessage(msg: { botId: number; sender: string; text: string }) {},

  async createOrUpdateWord(word: { botId: number; word: string; context: string }) {},

  async updateBot(botId: number, data: any) {},

  async createUser(user: { username: string; email: string }) {
    return { id: 1, ...user };
  },

  async setupTables() {},
};
