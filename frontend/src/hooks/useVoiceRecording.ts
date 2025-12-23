import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceRecordingOptions {
  chunkDuration?: number; // Duration of each chunk in seconds (default 20)
  onChunkReady?: (audioBlob: Blob, duration: number) => void;
  onTranscript?: (text: string) => void;
  minWordsThreshold?: number; // Minimum words for valid chunk
}

interface VoiceRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
  error: string | null;
}

export function useVoiceRecording(options: VoiceRecordingOptions = {}) {
  const {
    chunkDuration = 20,
    onChunkReady,
    onTranscript,
    minWordsThreshold = 5,
  } = options;

  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Update audio level visualization
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalizedLevel = Math.min(average / 128, 1);

    setState(prev => ({ ...prev, audioLevel: normalizedLevel }));

    if (state.isRecording && !state.isPaused) {
      requestAnimationFrame(updateAudioLevel);
    }
  }, [state.isRecording, state.isPaused]);

  // Process audio chunk
  const processChunk = useCallback(async (audioBlob: Blob, duration: number) => {
    if (onChunkReady) {
      onChunkReady(audioBlob, duration);
    }

    // Here you would send to STT API
    // For now, we'll just call the callback
    // In production, this would be:
    // const transcript = await sendToWhisperAPI(audioBlob);
    // if (wordCount(transcript) >= minWordsThreshold && onTranscript) {
    //   onTranscript(transcript);
    // }
  }, [onChunkReady, minWordsThreshold, onTranscript]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Set up audio analysis for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const duration = (Date.now() - startTimeRef.current) / 1000;
          processChunk(audioBlob, duration);
          chunksRef.current = [];
        }
      };

      // Start recording
      mediaRecorder.start();
      startTimeRef.current = Date.now();

      // Set up duration timer
      timerRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
        }));
      }, 1000);

      // Set up chunk timer (every 20 seconds, stop and restart to create chunks)
      chunkTimerRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          chunksRef.current = [];
          mediaRecorderRef.current.start();
          startTimeRef.current = Date.now();
        }
      }, chunkDuration * 1000);

      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioLevel: 0,
        error: null,
      });

      // Start audio level updates
      updateAudioLevel();

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to start recording',
      }));
    }
  }, [chunkDuration, processChunk, updateAudioLevel]);

  // Stop recording
  const stopRecording = useCallback(() => {
    cleanup();
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioLevel: 0,
      error: null,
    });
  }, [cleanup]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setState(prev => ({ ...prev, isPaused: false }));
      updateAudioLevel();
    }
  }, [updateAudioLevel]);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}

// Format duration as MM:SS
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

