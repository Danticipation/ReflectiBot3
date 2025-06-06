"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleChatRequest = handleChatRequest;
const responseService_1 = require("../services/responseService");
async function handleChatRequest(req, res) {
    const { message, userId, botId, stylePrompt } = req.body;
    try {
        const reply = await (0, responseService_1.generateResponseWithStyle)(userId, botId, message);
        res.json({ success: true, message: reply });
    }
    catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Chat request failed' });
    }
}
