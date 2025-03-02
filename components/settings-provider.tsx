"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { MessageSettings } from "@/lib/types"

interface SettingsContextType {
  settings: MessageSettings
  updateSettings: (settings: Partial<MessageSettings>) => void
}

const SettingsContext = createContext<SettingsContextType>({
  settings: {
    vanishTimer: null,
    soundEnabled: true,
    notificationsEnabled: true,
    notificationSound: "default",
  },
  updateSettings: () => {},
})

export function useSettings() {
  return useContext(SettingsContext)
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<MessageSettings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("messageSettings")
      if (saved) {
        return JSON.parse(saved)
      }
    }
    return {
      vanishTimer: null,
      soundEnabled: true,
      notificationsEnabled: true,
      notificationSound: "default",
    }
  })

  useEffect(() => {
    localStorage.setItem("messageSettings", JSON.stringify(settings))
  }, [settings])

  const updateSettings = (newSettings: Partial<MessageSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }

  return <SettingsContext.Provider value={{ settings, updateSettings }}>{children}</SettingsContext.Provider>
}

