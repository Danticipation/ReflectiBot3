// routes/user.ts
import { Router } from 'express';
import { handleSwitchBotRequest } from '../controllers/userController';

const router = Router();

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
router.post('/user/switch', handleSwitchBotRequest);

export default router;
