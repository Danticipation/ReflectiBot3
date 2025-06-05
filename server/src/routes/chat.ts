import { Router } from 'express';
import { handleChatRequest } from '../controllers/chatController';

const router = Router();

/**
 * @openapi
 * /chat:
 *   post:
 *     summary: Generate AI response from user message
 *     tags:
 *       - Chat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Tell me something interesting"
 *     responses:
 *       200:
 *         description: AI response returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reply:
 *                   type: string
 */
router.post('/chat', handleChatRequest);

export default router;
