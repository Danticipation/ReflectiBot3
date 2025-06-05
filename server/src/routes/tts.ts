// routes/tts.ts
import { Router } from 'express';
import { handleTTSRequest } from '../controllers/ttsController';

const router = Router();

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
router.post('/tts', handleTTSRequest);

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
router.post('/text-to-speech', handleTTSRequest);

export default router;
