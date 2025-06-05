// routes/stats.ts
import { Router } from 'express';
import { handleStatsRequest } from '../controllers/statsController';

const router = Router();

/**
 * @openapi
 * /stats:
 *   get:
 *     summary: Get user stats including stage, words, and message count
 *     tags:
 *       - Stats
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         required: false
 *         description: ID of the user to fetch stats for
 *     responses:
 *       200:
 *         description: User stats returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stage:
 *                   type: string
 *                 wordCount:
 *                   type: integer
 *                 messageCount:
 *                   type: integer
 */
router.get('/stats', handleStatsRequest);

export default router;
