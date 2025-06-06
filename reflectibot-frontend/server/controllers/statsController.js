"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStatsRequest = handleStatsRequest;
const storage_1 = require("../storage");
const promptUtils_1 = require("../utils/promptUtils");
async function handleStatsRequest(req, res) {
    try {
        const { userId = 1 } = req.query;
        const bot = await storage_1.storage.getBotByUserId(Number(userId));
        if (!bot) {
            res.status(404).json({ error: 'Bot not found' });
            return;
        }
        const words = await storage_1.storage.getLearnedWords(bot.id);
        const messages = await storage_1.storage.getUserMemories(Number(userId));
        const stage = (0, promptUtils_1.getStageFromWordCountV2)(words.length);
        res.json({ stage, wordCount: words.length, messageCount: messages.length });
    }
    catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Stats failed' });
    }
}
