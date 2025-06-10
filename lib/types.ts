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
  voiceMessageUrl?: string
  // File sharing
  fileUrl?: string
  fileName?: string
  fileSize?: number
  fileType?: string
  // Threading
  replyToId?: string
  replyToMessage?: {
    id: string
    text: string
    userName: string
    timestamp: Date
  }
  threadId?: string
  // Core message data
  uid: string
  userName: string
  displayName: string
  photoURL: string
  createdAt: Date
  updatedAt: Date
  // Message status
  readBy: string[]
  isEdited?: boolean
  reactions?: Record<string, string[]> // emoji -> array of userIds
  // Expiration
  expiresAt?: Date | null
  expirationTimer?: 'immediate' | '5m' | '1h' | '1d' | 'never'
}

// Typing indicator interface
export interface TypingIndicator {
  userId: string
  userName: string
  roomId: string
  timestamp: Date
}

// File upload interface
export interface FileUpload {
  file: File
  preview?: string
  uploadProgress?: number
  error?: string
}

// Message expiration options
export const MESSAGE_EXPIRATION_OPTIONS = {
  immediate: { label: 'Immediate', duration: 0 },
  '5m': { label: '5 minutes', duration: 5 * 60 * 1000 },
  '1h': { label: '1 hour', duration: 60 * 60 * 1000 },
  '1d': { label: '1 day', duration: 24 * 60 * 60 * 1000 },
  never: { label: 'Never', duration: null }
} as const

export type ExpirationTimer = keyof typeof MESSAGE_EXPIRATION_OPTIONS

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

