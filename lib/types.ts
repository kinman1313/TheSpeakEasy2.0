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

// Message status types
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

// Message expiration options with minimum times
export const MESSAGE_EXPIRATION_OPTIONS = {
  '5m': { label: '5 minutes', duration: 5 * 60 * 1000, minDuration: 5 * 60 * 1000 },
  '1h': { label: '1 hour', duration: 60 * 60 * 1000, minDuration: 60 * 60 * 1000 },
  '1d': { label: '1 day', duration: 24 * 60 * 60 * 1000, minDuration: 24 * 60 * 60 * 1000 },
  never: { label: 'Never', duration: null, minDuration: null }
} as const

export type ExpirationTimer = keyof typeof MESSAGE_EXPIRATION_OPTIONS

// Update Message interface to include status
export interface Message {
  id: string
  text: string
  imageUrl?: string
  gifUrl?: string
  audioUrl?: string
  voiceMessageUrl?: string
  mp3Url?: string
  transcodedAt?: Date
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
  // Room/DM support
  roomId?: string
  dmId?: string
  // Core message data
  uid: string // This is the user ID
  userId: string // Alias for uid for backward compatibility
  userName: string
  displayName: string
  photoURL: string
  createdAt: Date
  updatedAt: Date
  // Message status
  status: MessageStatus
  readBy: string[]
  isEdited?: boolean
  reactions?: Record<string, string[]> // emoji -> array of userIds
  // Expiration
  expiresAt?: Date | null
  expirationTimer?: ExpirationTimer
  chatColor?: string
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

// Add CSS property type declarations
declare module 'csstype' {
  interface Properties {
    webkitTouchCallout?: 'none' | 'auto'
  }
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  members: string[];
  admins: string[];
  createdAt: Date;
  updatedAt: Date;
  pattern?: string;
}

