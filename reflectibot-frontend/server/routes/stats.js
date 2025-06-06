"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/stats.ts
const express_1 = require("express");
const statsController_1 = require("../controllers/statsController");
const router = (0, express_1.Router)();
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
router.get('/stats', statsController_1.handleStatsRequest);
exports.default = router;
