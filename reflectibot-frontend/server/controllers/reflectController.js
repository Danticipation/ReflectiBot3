"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleOpenAITest = handleOpenAITest;
require("../types/express"); // Ensure the extended type is loaded for custom Request properties
// The extended Request type now includes the 'user' property
// The extended Request type now includes the 'user' property
// The extended Request type now includes the 'user' property
const openai_1 = require("openai");
const userStyleService_1 = require("../services/userStyleService");
const openai = new openai_1.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
async function handleOpenAITest(req, res) {
    try {
        const { message } = req.query;
        const userId = typeof req.user?.id === 'number' ? req.user.id : 0; // Replace 0 with an appropriate numeric fallback if needed
        const stylePrompt = await (0, userStyleService_1.updateUserStyleAndGetPrompt)(userId, [message]);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Say hello' }],
            max_tokens: 10
        });
        res.json({ success: true, message: 'OpenAI connection working', response: response.choices[0].message?.content });
    }
    catch (error) {
        console.error('OpenAI test error:', error);
        res.status(500).json({ error: 'OpenAI test failed' });
    }
}
