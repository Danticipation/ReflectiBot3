"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/user.ts
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const router = (0, express_1.Router)();
/**
 * @openapi
 * /user/switch:
 *   post:
 *     summary: Switch to a different bot persona for the user
 *     tags:
 *       - User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *               botName:
 *                 type: string
 *                 example: Luna
 *     responses:
 *       200:
 *         description: Bot switched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 botId:
 *                   type: integer
 */
router.post('/user/switch', userController_1.handleSwitchBotRequest);
exports.default = router;
