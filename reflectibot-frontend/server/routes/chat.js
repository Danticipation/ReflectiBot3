"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const router = (0, express_1.Router)();
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
router.post('/chat', chatController_1.handleChatRequest);
exports.default = router;
