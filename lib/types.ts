import type { User as FirebaseUser } from "firebase/auth"

// Define a UserStatus type
export type UserStatus = "online" | "away" | "offline" | "busy"

// Define the settings interface
export interface UserSettings {
  notificationsEnabled: boolean
  soundEnabled: boolean
  theme: string
  notificationSound: string
  messageVanishTimer: number | null
}

// Extend the User type to include status and settings
export interface ExtendedUser extends FirebaseUser {
  status?: UserStatus
  lastSeen?: Date
  settings: UserSettings // Add the settings property
}

// Redefine User to match our extended Firebase User type
export type User = ExtendedUser | null

// Simplified user type for components
export interface SimpleUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  status?: UserStatus
  lastSeen?: Date
  settings?: UserSettings // Add settings here too
}

// Let's check the actual Settings interface definition
export interface Settings {
  theme: string
  soundEnabled: boolean
  notificationsEnabled: boolean
  notificationSound: string
  messageVanishTimer: number | null // Note: it's messageVanishTimer, not vanishTimer
}

export interface MessageSettings {
  vanishTimer: number | null // null means never vanish
  soundEnabled: boolean
  notificationsEnabled: boolean
  notificationSound: string
}

export interface Message {
  id: string
  text: string
  imageUrl?: string
  gifUrl?: string
  audioUrl?: string
  uid: string
  displayName: string
  photoURL: string
  createdAt: Date
  updatedAt: Date
  readBy: string[]
  replyTo?: string
  vanishAt?: Date
  isEdited?: boolean
}

// Add the GiphyImage interface to match the Giphy API response
export interface GiphyImage {
  id: string
  title: string
  images: {
    original: {
      url: string
      width: string
      height: string
    }
    fixed_height: {
      url: string
    }
    fixed_width: {
      url: string
    }
    downsized: {
      url: string
    }
  }
  user?: {
    display_name: string
    avatar_url: string
  }
}

