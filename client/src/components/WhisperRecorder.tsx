import { useState } from 'react';

interface WhisperRecorderProps {
  onTranscription: (text: string) => void;
  onResponse?: (response: string) => void;
}

export default function WhisperRecorder({ onTranscription, onResponse }: WhisperRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Force WebM format and let server handle conversion
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setProcessing(true);
        try {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          setAudioUrl(URL.createObjectURL(audioBlob));
          
          // Send to Whisper API for transcription
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('userId', '1');

          const transcribeRes = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData
          });

          if (transcribeRes.ok) {
            const transcribeData = await transcribeRes.json();
            onTranscription(transcribeData.text);

            // Send transcribed text to chat endpoint
            const chatRes = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                message: transcribeData.text, 
                botId: 2 
              })
            });

            if (chatRes.ok) {
              const chatData = await chatRes.json();
              if (onResponse) {
                onResponse(chatData.response);
              }
              


              // Play TTS response
              const ttsRes = await fetch('/api/text-to-speech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: chatData.response })
              });

              if (ttsRes.ok) {
                const audioBlob = await ttsRes.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                audio.onended = () => URL.revokeObjectURL(audioUrl);
                audio.play();
              }
            }
          }
        } catch (error) {
          console.error('Processing error:', error);
        } finally {
          setProcessing(false);
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => track.stop());
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  return (
    <div className="p-4 bg-gray-800 text-white rounded-xl border border-gray-700">
      <div className="flex items-center gap-4">
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={processing}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            recording 
              ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
              : processing
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {processing ? (
            '🔄 Processing...'
          ) : recording ? (
            '🔴 Stop Recording'
          ) : (
            '🎤 Start Whisper Recording'
          )}
        </button>
        
        {recording && (
          <div className="flex items-center gap-2 text-red-400">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm">Recording...</span>
          </div>
        )}
      </div>
      
      {audioUrl && (
        <div className="mt-4">
          <label className="text-sm text-gray-400 block mb-2">Your Recording:</label>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-400">
        Uses OpenAI Whisper for high-accuracy transcription
      </div>
    </div>
  );
}