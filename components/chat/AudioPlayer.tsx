"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Loader2, AlertTriangle, Volume2, VolumeX } from 'lucide-react'; // Icons
import { Slider } from "@/components/ui/slider" // Assuming shadcn/ui Slider
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  audioUrl: string;
  initialDuration?: number; // Total duration in seconds, if known beforehand
}

const formatTime = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds) || timeInSeconds === Infinity) {
    return '00:00';
  }
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function AudioPlayer({ audioUrl, initialDuration }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(initialDuration || 0);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start true until metadata loads
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false); // For mute button
  const [volume, setVolume] = useState<number>(1); // Volume 0 to 1

  const togglePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.error("Error playing audio:", err);
          setError("Could not play audio. " + err.message);
          setIsLoading(false);
        });
      }
    }
  }, [isPlaying]);

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (audioRef.current) {
      const newVolume = value[0];
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const currentlyMuted = audioRef.current.muted;
      audioRef.current.muted = !currentlyMuted;
      setIsMuted(!currentlyMuted);
      if (!currentlyMuted) setVolume(0); // If unmuting and volume was 0, set to a default or previous
      else if(volume === 0 && currentlyMuted) setVolume(0.5); // If unmuting and volume was 0, set to 0.5
    }
  };


  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Reset states when audioUrl changes
    setIsLoading(true);
    setError(null);
    setCurrentTime(0);
    setDuration(initialDuration || 0);
    setIsPlaying(false);
    // Don't reset volume/mute by default on src change, user preference.

    audio.src = audioUrl;
    // audio.load(); // Some browsers might need this, but usually src assignment is enough

    const onLoadedMetadata = () => {
      setDuration(audio.duration === Infinity ? 0 : audio.duration); // Handle live streams or unknown duration
      setIsLoading(false);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onPlaying = () => { setIsPlaying(true); setIsLoading(false); };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(audio.duration); /* Or 0 */ };
    const onError = (e: Event) => {
      console.error("Audio Error:", (e.target as HTMLAudioElement).error);
      setError(`Error: ${ (e.target as HTMLAudioElement).error?.message || 'Could not load audio.'}`);
      setIsLoading(false);
    };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onVolumeChangeEv = () => {
        if(audio) {
            setVolume(audio.volume);
            setIsMuted(audio.muted);
        }
    }

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('volumechange', onVolumeChangeEv);


    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('volumechange', onVolumeChangeEv);
      // No need to audio.pause() here as it might be playing due to user interaction on another page
    };
  }, [audioUrl, initialDuration]);

  return (
    <div className="flex flex-col p-3 bg-muted/50 rounded-lg w-full max-w-xs my-1">
      <audio ref={audioRef} className="hidden" />

      <div className="flex items-center gap-3">
        <Button onClick={togglePlayPause} variant="ghost" size="icon" className="rounded-full" disabled={isLoading && !isPlaying}>
          {isLoading && !isPlaying ? <Loader2 className="w-6 h-6 animate-spin" /> : (isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />)}
        </Button>

        <div className="flex-1 flex items-center gap-2 text-sm">
          <span className="tabular-nums text-muted-foreground">{formatTime(currentTime)}</span>
          <Slider
            value={[currentTime]}
            max={duration || 100} // Use 100 as a fallback if duration is 0
            step={1}
            onValueChange={handleSeek}
            disabled={isLoading || !duration}
            className="flex-1 h-2"
          />
          <span className="tabular-nums text-muted-foreground">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Optional Volume Control */}
      <div className="flex items-center gap-2 mt-2 px-1">
        <Button onClick={toggleMute} variant="ghost" size="icon" className="rounded-full w-7 h-7">
            {isMuted ? <VolumeX size={16}/> : <Volume2 size={16}/>}
        </Button>
        <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.05}
            onValueChange={handleVolumeChange}
            className="w-20 h-2"
            aria-label="Volume control"
        />
      </div>

      {error && (
        <div className="mt-2 flex items-center text-red-500 text-xs p-2 rounded-md bg-destructive/10 border border-destructive/30">
          <AlertTriangle size={16} className="mr-1.5 shrink-0" />
          <span className="grow">{error}</span>
        </div>
      )}
    </div>
  );
}
