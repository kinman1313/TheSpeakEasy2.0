"use client"

import { type ReactElement, useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Volume2, VolumeX, AlertCircle, RefreshCw } from "lucide-react"

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
  const [errorMessage, setErrorMessage] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const [userInteracted, setUserInteracted] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const maxRetries = 3

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const setAudioData = () => {
      setDuration(audio.duration)
      setCurrentTime(audio.currentTime)
      setIsLoading(false)
      setCanPlay(true)
      setHasError(false)
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
      setHasError(false)
    }

    const handleLoadStart = () => {
      setIsLoading(true)
      setHasError(false)
      setErrorMessage("")
    }

    const handleError = (e: Event) => {
      console.error('Audio playback error:', e)
      const audioElement = e.target as HTMLAudioElement
      const error = audioElement.error

      let message = "Audio playback failed"
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            message = "Audio loading was aborted"
            break
          case MediaError.MEDIA_ERR_NETWORK:
            message = "Network error while loading audio"
            break
          case MediaError.MEDIA_ERR_DECODE:
            message = "Audio format not supported"
            break
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            message = "Audio source not supported"
            break
          default:
            message = "Unknown audio error"
        }
      }

      setErrorMessage(message)
      setHasError(true)
      setIsLoading(false)
      setIsPlaying(false)
      if (onError) onError()
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0)
    }

    const handleSuspend = () => {
      console.log('Audio loading suspended')
    }

    const handleStalled = () => {
      console.log('Audio loading stalled')
    }

    const handleWaiting = () => {
      console.log('Audio waiting for data')
    }

    // Add comprehensive event listeners
    audio.addEventListener("loadstart", handleLoadStart)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("loadeddata", setAudioData)
    audio.addEventListener("canplay", handleCanPlay)
    audio.addEventListener("canplaythrough", handleCanPlay)
    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("error", handleError)
    audio.addEventListener("suspend", handleSuspend)
    audio.addEventListener("stalled", handleStalled)
    audio.addEventListener("waiting", handleWaiting)

    return () => {
      audio.removeEventListener("loadstart", handleLoadStart)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("loadeddata", setAudioData)
      audio.removeEventListener("canplay", handleCanPlay)
      audio.removeEventListener("canplaythrough", handleCanPlay)
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("error", handleError)
      audio.removeEventListener("suspend", handleSuspend)
      audio.removeEventListener("stalled", handleStalled)
      audio.removeEventListener("waiting", handleWaiting)
    }
  }, [onError, src])

  const retryLoad = () => {
    if (retryCount >= maxRetries) return

    setRetryCount(prev => prev + 1)
    setHasError(false)
    setIsLoading(true)
    setErrorMessage("")

    if (audioRef.current) {
      audioRef.current.load()
    }
  }

  const togglePlay = async () => {
    if (!audioRef.current || !canPlay) return

    setUserInteracted(true)

    try {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        // Ensure audio is loaded
        if (audioRef.current.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
          setIsLoading(true)
          await new Promise((resolve, reject) => {
            const audio = audioRef.current!
            const handleCanPlay = () => {
              audio.removeEventListener('canplay', handleCanPlay)
              audio.removeEventListener('error', handleError)
              setIsLoading(false)
              resolve(void 0)
            }
            const handleError = (e: Event) => {
              audio.removeEventListener('canplay', handleCanPlay)
              audio.removeEventListener('error', handleError)
              setIsLoading(false)
              reject(e)
            }
            audio.addEventListener('canplay', handleCanPlay, { once: true })
            audio.addEventListener('error', handleError, { once: true })
          })
        }

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

      // Handle specific browser policy errors
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            setErrorMessage('Audio blocked by browser policy. Please interact with the page first.')
            break
          case 'NotSupportedError':
            setErrorMessage('Audio format not supported by this browser')
            break
          case 'AbortError':
            setErrorMessage('Audio playback was interrupted')
            break
          default:
            setErrorMessage(`Playback error: ${error.message}`)
        }
      } else {
        setErrorMessage('Unknown playback error')
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
        <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-red-300 block truncate">{errorMessage}</span>
          {retryCount < maxRetries && (
            <Button
              variant="ghost"
              size="sm"
              onClick={retryLoad}
              className="text-red-300 hover:text-red-200 h-auto p-1 mt-1"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry ({retryCount}/{maxRetries})
            </Button>
          )}
        </div>
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
        controls={false}
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

      {!userInteracted && !canPlay && !isLoading && (
        <p className="text-xs text-muted-foreground">
          Click play to start audio (browser requires user interaction)
        </p>
      )}
    </div>
  )
}
