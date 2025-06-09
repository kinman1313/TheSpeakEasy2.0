"use client"

import { type ReactElement, useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Volume2, VolumeX, AlertCircle } from "lucide-react"

interface AudioPlayerProps {
  src: string
  onError?: () => void
}

export function AudioPlayer({ src, onError }: AudioPlayerProps): ReactElement {
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [canPlay, setCanPlay] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const setAudioData = () => {
      setDuration(audio.duration)
      setCurrentTime(audio.currentTime)
      setIsLoading(false)
      setCanPlay(true)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handleCanPlay = () => {
      setCanPlay(true)
      setIsLoading(false)
    }

    const handleLoadStart = () => {
      setIsLoading(true)
      setHasError(false)
    }

    const handleError = (e: Event) => {
      console.error('Audio playback error:', e)
      setHasError(true)
      setIsLoading(false)
      setIsPlaying(false)
      if (onError) onError()
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0)
    }

    // Add mobile-specific event listeners
    audio.addEventListener("loadstart", handleLoadStart)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("loadeddata", setAudioData)
    audio.addEventListener("canplay", handleCanPlay)
    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("error", handleError)

    return () => {
      audio.removeEventListener("loadstart", handleLoadStart)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("loadeddata", setAudioData)
      audio.removeEventListener("canplay", handleCanPlay)
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("error", handleError)
    }
  }, [onError])

  const togglePlay = async () => {
    if (!audioRef.current || !canPlay) return

    try {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        // For mobile browsers, ensure we handle the play promise
        const playPromise = audioRef.current.play()
        if (playPromise !== undefined) {
          await playPromise
          setIsPlaying(true)
        }
      }
    } catch (error) {
      console.error('Error playing audio:', error)
      setHasError(true)
      setIsPlaying(false)

      // Mobile browsers often require user interaction
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        console.log('Audio playback blocked by browser policy')
      }
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    if (audioRef.current) {
      audioRef.current.volume = newVolume
      setVolume(newVolume)
      setIsMuted(newVolume === 0)
    }
  }

  const handleTimeChange = (value: number[]) => {
    const newTime = value[0]
    if (audioRef.current && canPlay) {
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  if (hasError) {
    return (
      <div className="flex items-center gap-2 p-2 bg-red-900/20 border border-red-600/50 rounded-lg">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <span className="text-sm text-red-300">Audio playback failed</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-md">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        crossOrigin="anonymous"
        playsInline
      />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlay}
          className="h-8 w-8 touch-manipulation"
          disabled={isLoading || !canPlay}
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleTimeChange}
            disabled={!canPlay}
          />
        </div>

        <span className="text-xs tabular-nums min-w-[60px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="h-8 w-8 touch-manipulation"
          disabled={!canPlay}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>

        <Slider
          value={[isMuted ? 0 : volume]}
          max={1}
          step={0.01}
          onValueChange={handleVolumeChange}
          className="w-24"
          disabled={!canPlay}
        />
      </div>
    </div>
  )
}
