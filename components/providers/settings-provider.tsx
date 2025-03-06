"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { Settings } from "@/lib/types"

interface SettingsContextType {
  settings: Settings
  updateSettings: (newSettings: Partial<Settings>) => void
}

const defaultSettings: Settings = {
  theme: "system",
  soundEnabled: true,
  notificationsEnabled: true,
  notificationSound: "default",
  messageVanishTimer: null,
}

// Create the context with a default value that matches the type
const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    // Try to load settings from localStorage on client side
    if (typeof window !== "undefined") {
      const savedSettings = localStorage.getItem("app-settings")
      if (savedSettings) {
        try {
          return { ...defaultSettings, ...JSON.parse(savedSettings) }
        } catch (e) {
          console.error("Failed to parse saved settings:", e)
        }
      }
    }
    return defaultSettings
  })

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings }
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("app-settings", JSON.stringify(updated))
      }
      return updated
    })
  }

  return <SettingsContext.Provider value={{ settings, updateSettings }}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}

