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
  createdAt: Date
  updatedAt: Date
  readBy: string[]
  replyTo?: string
  vanishAt?: Date
  isEdited?: boolean
}

