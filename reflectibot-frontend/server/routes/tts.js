"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/tts.ts
const express_1 = require("express");
const ttsController_1 = require("../controllers/ttsController");
const router = (0, express_1.Router)();
/**
 * @openapi
 * /tts:
 *   post:
 *     summary: Convert text to speech using ElevenLabs API
 *     tags:
 *       - TTS
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Hello, how are you?"
 *               voiceId:
 *                 type: string
 *                 example: iCrDUkL56s3C8sCRl7wb
 *     responses:
 *       200:
 *         description: MP3 audio buffer returned
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 */
router.post('/tts', ttsController_1.handleTTSRequest);
/**
 * @openapi
 * /text-to-speech:
 *   post:
 *     summary: Alias for /tts route
 *     tags:
 *       - TTS
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               voiceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: MP3 audio buffer returned
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 */
router.post('/text-to-speech', ttsController_1.handleTTSRequest);
exports.default = router;
