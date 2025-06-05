// controllers/ttsController.ts
import { Request, Response } from 'express';
import fetch from 'node-fetch';

export async function handleTTSRequest(req: Request, res: Response): Promise<void> {
  try {
    const { text, voiceId = 'iCrDUkL56s3C8sCRl7wb' } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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

    if (!response.ok) throw new Error(`ElevenLabs API error: ${response.status}`);

    const audioBuffer = await response.arrayBuffer();
    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': audioBuffer.byteLength.toString() });
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'Text-to-speech failed' });
  }
}
