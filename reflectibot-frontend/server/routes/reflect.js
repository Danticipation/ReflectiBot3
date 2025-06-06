"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerReflectRoutes = registerReflectRoutes;
const userStyleService_1 = require("../services/userStyleService");
const promptUtils_1 = require("../utils/promptUtils");
const storage_1 = require("../storage");
function registerReflectRoutes(app) {
    /**
     * @openapi
     * /api/reflect:
     *   get:
     *     summary: Get Reflectibot prompt and user tone
     *     tags:
     *       - Reflect
     *     responses:
     *       200:
     *         description: Reflectibot prompt and user tone returned successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 prompt:
     *                   type: string
     *                 tone:
     *                   type: string
     *                 stage:
     *                   type: string
     *                 learnedWordCount:
     *                   type: integer
     */
    app.get('/api/reflect', async (req, res) => {
        const userId = 1; // 🔐 Replace with auth logic later
        const botId = 1;
        const memories = await storage_1.storage.getUserMemories(userId); // string[]
        const facts = await storage_1.storage.getUserFacts(userId); // string[]
        const stage = 'Adolescent'; // 🔧 can be dynamic
        const learnedWordCount = 128; // 🔧 example
        const previousStyle = 'neutral'; // or from DB
        // ✨ Detect user tone
        const message = "default message"; // 🔧 Replace with actual message logic
        const tone = await (0, userStyleService_1.updateUserStyleAndGetPrompt)(userId, memories);
        const personality = { tone }; // Ensure 'tone' is properly initialized above
        const systemPrompt = (0, promptUtils_1.getReflectibotPrompt)({
            factContext: facts.join('\n'),
            memoryContext: memories.join('\n'),
            stage,
            learnedWordCount,
            personality: { tone },
        });
        res.json({
            prompt: systemPrompt,
            tone,
            stage,
            learnedWordCount,
        });
    });
}
