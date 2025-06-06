import React, { useState, useRef } from 'react';
// Import removed for now - we'll define the functions inline to avoid path issues

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

  // Define TTS functions inline to avoid import issues
  const speakWithElevenLabs = async (text: string): Promise<void> => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`TTS API failed with status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Audio playback failed'));
        };
        
        audio.play().catch(reject);
      });
    } catch (error) {
      console.error('Text-to-speech error:', error);
      throw error;
    }
  };

  const speakWithBrowserTTS = (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Browser speech synthesis not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(`Speech synthesis failed: ${event.error}`));
      
      speechSynthesis.speak(utterance);
    });
  };

  // Test TTS function for debugging
  const testBrowserTTS = () => {
    console.log('Testing browser TTS...');
    const utterance = new SpeechSynthesisUtterance("Hello! This is a test of the text to speech system.");
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    utterance.onstart = () => console.log('TTS started');
    utterance.onend = () => console.log('TTS ended');
    utterance.onerror = (e) => console.error('TTS error:', e);
    
    speechSynthesis.speak(utterance);
  };

  const startRecording = async () => {
    try {
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
    } catch (error) {
      console.error('Failed to start recording:', error);
      setRecording(false);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const sendToBot = async () => {
    if (!transcription) return;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: transcription, botId: 2 })
      });
      
      if (!res.ok) {
        throw new Error(`Chat API failed with status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (onResponse) {
        onResponse(data.response);
      }

      // Try to speak the response using multiple methods
      console.log('Attempting to speak response:', data.response);
      
      try {
        // Method 1: Try ElevenLabs TTS first
        console.log('Trying ElevenLabs TTS...');
        await speakWithElevenLabs(data.response);
        console.log('ElevenLabs TTS successful');
      } catch (elevenLabsError) {
        console.log('ElevenLabs TTS failed, trying browser TTS:', elevenLabsError);
        
        try {
          // Method 2: Fallback to browser TTS
          await speakWithBrowserTTS(data.response);
          console.log('Browser TTS successful');
        } catch (browserTTSError) {
          console.log('Browser TTS failed, trying direct API call:', browserTTSError);
          
          try {
            // Method 3: Direct API call (keeping original as final fallback)
            const ttsRes = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: data.response })
            });

            if (ttsRes.ok) {
              const audioBlob = await ttsRes.blob();
              const audioUrl = URL.createObjectURL(audioBlob);
              const audio = new Audio(audioUrl);
              
              audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                console.log('Direct API TTS playback completed');
              };
              
              audio.onerror = (e) => {
                console.error('Audio playback error:', e);
                URL.revokeObjectURL(audioUrl);
              };
              
              await audio.play();
              console.log('Direct API TTS successful');
            } else {
              throw new Error(`TTS API failed with status: ${ttsRes.status}`);
            }
          } catch (directAPIError) {
            console.error('All TTS methods failed:', directAPIError);
          }
        }
      }

      setTranscription('');
      setAudioUrl('');
      
    } catch (error) {
      console.error('sendToBot failed:', error);
    }
  };

  return (
    <div className="p-4 bg-gray-900 rounded-xl border border-gray-700 text-white">
      <div className="flex items-center gap-4 flex-wrap">
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
        
        {/* Test TTS Button */}
        <button
          onClick={testBrowserTTS}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
          title="Test if TTS is working"
        >
          🔊 Test TTS
        </button>
        
        {audioUrl && (
          <audio controls src={audioUrl} className="max-w-xs" />
        )}
      </div>

      {transcription && (
        <div className="mt-4">
          <p className="text-sm text-gray-300 mb-2">📝 Transcription:</p>
          <div className="bg-gray-800 p-3 rounded-lg border border-gray-600 mb-3">{transcription}</div>
          <button
            onClick={sendToBot}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
          >
            Send Message
          </button>
        </div>
      )}
    </div>
  );
}