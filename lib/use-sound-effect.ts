"use client"

import { useSettings } from "@/components/providers/settings-provider"
import { useCallback, useRef } from "react"

export function useSoundEffect(soundUrl: string) {
  const { settings } = useSettings()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const play = useCallback(() => {
    if (!settings.soundEnabled) return

    if (!audioRef.current) {
      audioRef.current = new Audio(soundUrl)
    }

    audioRef.current.currentTime = 0
    audioRef.current.play().catch((error) => {
      console.error("Error playing sound:", error)
    })
  }, [soundUrl, settings.soundEnabled])

  return play
}

