export interface Settings {
  soundEnabled: boolean
  notificationsEnabled: boolean
  notificationSound: string
  theme: "light" | "dark" | "system"
  messageVanishTimer: number | null
}

