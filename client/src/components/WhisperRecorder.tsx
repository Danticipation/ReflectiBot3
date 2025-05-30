import React, { useState, useRef } from 'react';

interface WhisperRecorderProps {
  onTranscription: (text: string) => void;
  onResponse?: (response: string) => void;
}

export default function WhisperRecorder({ onTranscription, onResponse }: WhisperRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunks: BlobPart[] = [];

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    setRecording(true);
    chunks.length = 0;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(blob);
      setAudioUrl(audioUrl);
      setProcessing(true);

      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      try {
        const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.text) {
          setTranscription(data.text);
          onTranscription?.(data.text); // Pass raw transcript to parent
        }
      } catch (err) {
        console.error('Transcription failed:', err);
      } finally {
        setProcessing(false);
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      }
    };

    mediaRecorder.start();
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const sendToBot = async () => {
    if (!transcription) return;

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: transcription, botId: 2 })
    });
    const data = await res.json();
    
    if (onResponse) {
      onResponse(data.response);
    }

    // Play TTS response
    const ttsRes = await fetch('/api/text-to-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: data.response })
    });

    if (ttsRes.ok) {
      const audioBlob = await ttsRes.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      audio.play();
    }

    setTranscription('');
    setAudioUrl('');
  };

  return (
    <div className="p-4 bg-gray-900 rounded-xl border border-gray-700 text-white">
      <div className="flex items-center gap-4">
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={processing}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            processing
              ? 'bg-gray-600 cursor-not-allowed'
              : recording
              ? 'bg-red-600 hover:bg-red-700 animate-pulse'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {processing ? '🔄 Processing...' : recording ? '⏹️ Stop Recording' : '🎤 Start Whisper Recording'}
        </button>
        {audioUrl && (
          <audio controls src={audioUrl} className="ml-4 max-w-xs" />
        )}
      </div>

      {transcription && (
        <div className="mt-4">
          <p className="text-sm text-gray-300 mb-2">📝 Transcription:</p>
          <div className="bg-gray-800 p-3 rounded-lg border border-gray-600 mb-3">{transcription}</div>
          <button
            onClick={sendToBot}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Send Message
          </button>
        </div>
      )}
    </div>
  );
}