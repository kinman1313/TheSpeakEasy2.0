import type { Timestamp } from "firebase/firestore"

export interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  status: "online" | "offline" | "away"
  lastSeen: Timestamp
  settings: UserSettings
}

export interface UserSettings {
  theme: "light" | "dark" | "system"
  enterToSend: boolean
  showTypingIndicators: boolean
  showReadReceipts: boolean
  notificationsEnabled: boolean
  chatColor: string
  soundEnabled: boolean
}

export interface Room {
  id: string
  name: string
  description?: string
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  members: string[]
  isPrivate: boolean
  photoURL?: string
  lastMessage?: {
    text: string
    sentBy: string
    sentAt: Timestamp
  }
}

export interface Message {
  id: string
  roomId: string
  text?: string
  imageUrl?: string
  gifUrl?: string
  audioUrl?: string
  uid: string
  displayName: string
  photoURL: string
  createdAt: Timestamp
  updatedAt: Timestamp
  reactions?: {
    [key: string]: string[] // emoji: userIds[]
  }
  readBy: string[]
  replyTo?: {
    id: string
    text: string
    uid: string
  }
}

export interface Call {
  id: string
  roomId: string
  initiatedBy: string
  participants: string[]
  startedAt: Timestamp
  endedAt?: Timestamp
  type: "audio" | "video"
  status: "ringing" | "ongoing" | "ended"
}

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
      width: string
      height: string
    }
    fixed_height_small: {
      url: string
      width: string
      height: string
    }
  }
}

