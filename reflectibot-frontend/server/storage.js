"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = void 0;
exports.storage = {
    async getUserMemories(userId) {
        return [];
    },
    async getUserFacts(userId) {
        return [];
    },
    async getLearnedWords(botId) {
        return [];
    },
    async getBotByUserId(userId) {
        return null;
    },
    async createBot(bot) {
        return { id: 1, ...bot };
    },
    async createMessage(msg) { },
    async createOrUpdateWord(word) { },
    async updateBot(botId, data) { },
    async createUser(user) {
        return { id: 1, ...user };
    },
    async setupTables() { },
    async setUserStylePrompt(userId, style) {
        // Implement your preferred storage — this is a stub.
        console.log(`Set style prompt for user ${userId} to: ${style}`);
        return Promise.resolve();
    },
};
