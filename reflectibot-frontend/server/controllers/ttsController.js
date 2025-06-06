"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTTSRequest = handleTTSRequest;
const node_fetch_1 = __importDefault(require("node-fetch"));
async function handleTTSRequest(req, res) {
    try {
        const { text, voiceId = 'iCrDUkL56s3C8sCRl7wb' } = req.body;
        if (!text)
            res.status(400).json({ error: 'Text is required' });
        const response = await (0, node_fetch_1.default)(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });
        if (!response.ok)
            throw new Error(`ElevenLabs API error: ${response.status}`);
        const audioBuffer = await response.arrayBuffer();
        res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': audioBuffer.byteLength.toString() });
        res.send(Buffer.from(audioBuffer));
    }
    catch (error) {
        console.error('TTS error:', error);
        res.status(500).json({ error: 'Text-to-speech failed' });
    }
}
