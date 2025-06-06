"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSwitchBotRequest = handleSwitchBotRequest;
const storage_1 = require("../storage");
async function handleSwitchBotRequest(req, res) {
    try {
        const { userId = 1, botName } = req.body;
        if (!botName) {
            res.status(400).json({ error: 'Bot name is required' });
            return;
        }
        const newBot = await storage_1.storage.createBot({ userId, name: botName });
        res.json({ message: `Switched to bot: ${botName}`, botId: newBot.id });
    }
    catch (error) {
        console.error('Switch bot error:', error);
        res.status(500).json({ error: 'Bot switch failed' });
    }
}
