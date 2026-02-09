"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef("");
  const isRecordingRef = useRef(false);
  const isStartingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadFnRef = useRef<((blob: Blob) => Promise<void>) | null>(null);

  // Initialize SpeechRecognition once on mount
  useEffect(() => {
    const W = globalThis as unknown as Record<string, unknown>;
    const SpeechRecognitionCtor = (W.SpeechRecognition ??
      W.webkitSpeechRecognition) as
      | (new () => SpeechRecognitionInstance)
      | undefined;

    if (!SpeechRecognitionCtor) {
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += `${transcript} `;
        } else {
          interim += transcript;
        }
      }
      if (final) {
        finalTranscriptRef.current += final;
        setLiveTranscript(finalTranscriptRef.current);
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        // Non-critical errors — log but don't block recording
      }
    };

    recognition.onend = () => {
      // Auto-restart if still recording (Speech API can stop after silence)
      if (isRecordingRef.current) {
        try {
          recognition.start();
        } catch {
          // already started or unavailable
        }
      }
      setInterimText("");
    };

    recognitionRef.current = recognition;
    setSpeechSupported(true);

    return () => {
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  const stopAudioAnalysis = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {
        // AudioContext close can fail if already closed
      });
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const startRecording = useCallback(
    async (uploadFn: (blob: Blob) => Promise<void>) => {
      // Guard against rapid clicks while getUserMedia is awaiting
      if (isRecordingRef.current || isStartingRef.current) {
        return;
      }
      isStartingRef.current = true;
      setIsStarting(true);
      uploadFnRef.current = uploadFn;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        streamRef.current = stream;

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "audio/webm",
        });
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          // Stop all tracks
          for (const track of stream.getTracks()) {
            track.stop();
          }
          streamRef.current = null;

          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });

          if (uploadFnRef.current) {
            await uploadFnRef.current(audioBlob);
          }
        };

        mediaRecorderRef.current = mediaRecorder;

        // Reset transcript state
        finalTranscriptRef.current = "";
        setLiveTranscript("");
        setInterimText("");
        setElapsedSeconds(0);

        // Set up Web Audio API analyser for volume metering
        const audioContext = new AudioContext();
        await audioContext.resume();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        // Start volume monitoring
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        function updateLevel() {
          if (!isRecordingRef.current) {
            return;
          }
          if (!analyserRef.current) {
            return;
          }
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg =
            dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
          setAudioLevel(avg / 255);
          animFrameRef.current = requestAnimationFrame(updateLevel);
        }
        animFrameRef.current = requestAnimationFrame(updateLevel);

        // Start elapsed timer
        timerRef.current = setInterval(
          () => setElapsedSeconds((s) => s + 1),
          1000
        );

        // Start recording
        mediaRecorder.start();
        isRecordingRef.current = true;
        isStartingRef.current = false;
        setIsRecording(true);
        setIsStarting(false);

        // Start speech recognition if supported
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {
            // already started or unavailable
          }
        }
      } catch {
        isStartingRef.current = false;
        setIsStarting(false);
        throw new Error(
          "Could not access microphone. Please check permissions."
        );
      }
    },
    [stopAudioAnalysis]
  );

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setInterimText("");

    // Stop MediaRecorder
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    // Stop SpeechRecognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop audio analysis
    stopAudioAnalysis();
    setElapsedSeconds(0);
  }, [stopAudioAnalysis]);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = "";
    setLiveTranscript("");
    setInterimText("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {
          // AudioContext close can fail if already closed
        });
      }
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
      }
    };
  }, []);

  return {
    isRecording,
    isStarting,
    isUploading,
    setIsUploading,
    liveTranscript,
    interimText,
    speechSupported,
    elapsedSeconds,
    audioLevel,
    startRecording,
    stopRecording,
    resetTranscript,
  };
}
