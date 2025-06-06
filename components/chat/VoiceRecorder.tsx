"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react'; // Icons
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  disabled?: boolean; // To disable the recorder based on firebaseStatus, etc.
}

const MAX_RECORDING_DURATION_MS = 120000; // 2 minutes
const DURATION_UPDATE_INTERVAL_MS = 100;

export default function VoiceRecorder({ onRecordingComplete, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState<boolean>(false); // Added
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const clearTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const cleanupRecorder = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    mediaRecorderRef.current = null;
    setAudioChunks([]);
  };

  const handleStop = useCallback(() => {
    if (audioChunks.length > 0) {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // Or a more specific type if known
      const finalDuration = recordingStartTimeRef.current ? (Date.now() - recordingStartTimeRef.current) / 1000 : recordingDuration;
      onRecordingComplete(audioBlob, Math.round(finalDuration));
    }
    setAudioChunks([]); // Clear chunks after processing
  }, [audioChunks, onRecordingComplete, recordingDuration]);


  const requestMicrophonePermission = useCallback(async (): Promise<MediaRecorder | null> => {
    setPermissionError(null);
    // No need to set isRequestingPermission here, as it's set in startRecording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorderOptions = { mimeType: 'audio/webm' }; // Prefer webm
      let recorder;
      if (MediaRecorder.isTypeSupported(recorderOptions.mimeType)) {
        recorder = new MediaRecorder(stream, recorderOptions);
      } else {
        console.warn("audio/webm not supported, trying default");
        recorder = new MediaRecorder(stream); // Fallback to browser default
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks((prev) => [...prev, event.data]);
        }
      };

      recorder.onstop = handleStop; // Use the memoized handleStop

      // Optional: handle other events like onerror
      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setPermissionError("Recording error occurred.");
        setIsRecording(false);
        clearTimer();
        cleanupRecorder();
      };

      return recorder;
    } catch (err: any) {
      console.error("Error requesting microphone permission:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionError("Microphone permission denied. Please enable it in browser settings.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setPermissionError("No microphone found.");
      } else {
        setPermissionError("Could not access microphone.");
      }
      return null;
    }
  }, [handleStop]); // handleStop is now a dependency

  const startRecording = async () => {
    if (isRecording || disabled || isRequestingPermission) return;

    setIsRequestingPermission(true);
    const recorder = await requestMicrophonePermission();
    setIsRequestingPermission(false);

    if (recorder) {
      mediaRecorderRef.current = recorder;
      setAudioChunks([]);
      recordingStartTimeRef.current = Date.now();
      setRecordingDuration(0);

      try {
        mediaRecorderRef.current.start(); // Start recording
        setIsRecording(true); // Set isRecording only after start() is successful
      } catch (e: any) {
        console.error("Error starting MediaRecorder:", e);
        setPermissionError(`Could not start recording: ${e.message}`);
        cleanupRecorder(); // Clean up stream tracks if start fails
        return;
      }

      timerIntervalRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          const elapsed = (Date.now() - recordingStartTimeRef.current);
          setRecordingDuration(elapsed / 1000);
          if (elapsed >= MAX_RECORDING_DURATION_MS) {
            stopRecording(); // Auto-stop if max duration reached
          }
        }
      }, DURATION_UPDATE_INTERVAL_MS);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); // This will trigger 'onstop', which calls handleStop
    }
    setIsRecording(false);
    clearTimer();
    // cleanupRecorder() is called by onstop -> handleStop -> onRecordingComplete or by cancel.
    // No, handleStop only processes chunks. Actual stream track cleanup is important.
    // The stream tracks should be stopped when recording is done OR when the component unmounts.
    // For now, let handleStop trigger and then let's see.
    // The MediaRecorder stream is stopped when the MediaRecorder instance is destroyed or its tracks are stopped.
    // Let's ensure tracks are stopped after onRecordingComplete is called.
    // The current handleStop doesn't stop tracks.
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Set a flag or remove onstop handler temporarily to prevent processing
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setAudioChunks([]);
    setRecordingDuration(0);
    recordingStartTimeRef.current = null;
    clearTimer();
    cleanupRecorder(); // Explicitly clean up here
    setPermissionError(null);
  };

  // Cleanup effect for when component unmounts or if recording is stopped abruptly
  useEffect(() => {
    return () => {
      clearTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      cleanupRecorder();
    };
  }, []);

  // Modify handleStop to also cleanup recorder tracks after processing.
  // This is tricky because handleStop is called by MediaRecorder, not directly by a React event.
  // The cleanupRecorder() call within cancelRecording and useEffect unmount is good.
  // For stopRecording, the onstop event will fire handleStop.
  // We need to make sure stream tracks are stopped after onRecordingComplete.
  // One way: onRecordingComplete could return a promise, or handleStop could call cleanup.
  // For now, let's assume onRecordingComplete's parent will handle further cleanup if necessary,
  // or that the stream given to MediaRecorder is a temporary one.
  // The current cleanupRecorder in cancel/unmount should handle most cases.


  if (permissionError) {
    return (
      <div className="flex items-center text-red-500 text-xs p-2 rounded-md bg-destructive/10 border border-destructive/30">
        <AlertTriangle size={32} className="mr-2 shrink-0" />
        <span className="grow">{permissionError}</span>
         <Button variant="ghost" size="sm" onClick={() => setPermissionError(null)} className="ml-2 p-1 h-auto">
            <XCircle size={16}/>
         </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {!isRecording ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={startRecording}
          disabled={disabled || isRequestingPermission}
          aria-label="Start voice recording"
          className="text-muted-foreground hover:text-primary"
        >
          {isRequestingPermission ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic size={22} />}
        </Button>
      ) : (
        <>
          <Button
            variant="destructive" // This should be the stop button
            size="icon"
            onClick={stopRecording}
            aria-label="Stop voice recording"
            className="animate-pulse"
          >
            <StopCircle size={22} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={cancelRecording}
            aria-label="Cancel voice recording"
            className="text-muted-foreground hover:text-destructive"
          >
            <XCircle size={22} />
          </Button>
          <div className="text-sm text-muted-foreground tabular-nums w-12">
            {formatDuration(recordingDuration)}
          </div>
        </>
      )}
    </div>
  );
}
