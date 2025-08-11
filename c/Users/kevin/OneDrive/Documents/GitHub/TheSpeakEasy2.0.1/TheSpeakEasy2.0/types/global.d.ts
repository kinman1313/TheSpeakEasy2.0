/// <reference types="react" />
/// <reference types="react-dom" />

declare global {
  // Environment variables for Firebase and app configuration
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test'
      PORT?: string
      SOCKET_PORT?: string
      TEST_MODE?: string
      NEXT_PUBLIC_FIREBASE_API_KEY?: string
      NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?: string
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?: string
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?: string
      NEXT_PUBLIC_FIREBASE_APP_ID?: string
      NEXT_PUBLIC_FIREBASE_DATABASE_URL?: string
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?: string
      FIREBASE_ADMIN_PRIVATE_KEY?: string
      FIREBASE_ADMIN_CLIENT_EMAIL?: string
      RENDER_EXTERNAL_URL?: string
    }
  }

  // Window object extensions for WebRTC and audio context browser compatibility
  interface Window {
    webkitAudioContext?: typeof AudioContext
    mozAudioContext?: typeof AudioContext
    msAudioContext?: typeof AudioContext
    webkitRTCPeerConnection?: typeof RTCPeerConnection
    mozRTCPeerConnection?: typeof RTCPeerConnection
    msRTCPeerConnection?: typeof RTCPeerConnection
    webkitGetUserMedia?: typeof navigator.mediaDevices.getUserMedia
    mozGetUserMedia?: typeof navigator.mediaDevices.getUserMedia
    msGetUserMedia?: typeof navigator.mediaDevices.getUserMedia
    // Service Worker registration
    workbox?: any
    __WB_MANIFEST?: any
  }

  // Socket.IO event types for your real-time features
  interface SocketIOEvents {
    // Call events
    'call:initiate': (data: { 
      targetUserId: string
      callType: 'audio' | 'video'
      roomId?: string
      callerName: string
    }) => void
    'call:incoming': (data: { 
      from: string
      fromName: string
      roomId: string
      callType: 'audio' | 'video'
    }) => void
    'call:accepted': (data: { roomId: string; acceptedBy: string }) => void
    'call:rejected': (data: { roomId: string; rejectedBy: string }) => void
    'call:ended': (data: { roomId: string; endedBy: string; reason?: string }) => void
    'call:busy': (data: { roomId: string; busyUser: string }) => void

    // WebRTC signaling events
    'webrtc:offer': (data: { 
      offer: RTCSessionDescriptionInit
      from: string
      fromName: string
      to: string
    }) => void
    'webrtc:answer': (data: { 
      answer: RTCSessionDescriptionInit
      from: string
      to: string
    }) => void
    'webrtc:ice-candidate': (data: { 
      candidate: RTCIceCandidateInit
      from: string
      to: string
    }) => void
    'webrtc:connection-state': (data: {
      state: RTCPeerConnectionState
      from: string
      to: string
    }) => void

    // Chat events
    'message:new': (data: any) => void
    'message:typing': (data: { userId: string; roomId: string; isTyping: boolean }) => void
    'message:reaction': (data: { messageId: string; reaction: string; userId: string }) => void

    // User presence events
    'user:online': (data: { userId: string; status: 'online' | 'away' | 'busy' }) => void
    'user:offline': (data: { userId: string }) => void
    'user:join-room': (data: { userId: string; roomId: string }) => void
    'user:leave-room': (data: { userId: string; roomId: string }) => void

    // Room events
    'room:created': (data: { roomId: string; createdBy: string }) => void
    'room:updated': (data: { roomId: string; updates: any }) => void
    'room:deleted': (data: { roomId: string; deletedBy: string }) => void

    // File sharing events
    'file:upload-progress': (data: { fileId: string; progress: number }) => void
    'file:upload-complete': (data: { fileId: string; url: string }) => void
    'file:upload-error': (data: { fileId: string; error: string }) => void

    // Voice message events
    'voice:recording-start': (data: { userId: string; roomId: string }) => void
    'voice:recording-stop': (data: { userId: string; roomId: string }) => void
    'voice:message-sent': (data: { messageId: string; duration: number }) => void
  }

  // Call status types
  type CallStatus = 
    | 'idle' 
    | 'calling' 
    | 'ringing' 
    | 'connecting' 
    | 'connected' 
    | 'ended' 
    | 'declined' 
    | 'busy' 
    | 'failed' 
    | 'timeout'

  // Permission states
  type PermissionState = 'prompt' | 'granted' | 'denied'

  // Connection quality types
  type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'lost'

  // Message types
  interface BaseMessage {
    id: string
    content: string
    senderId: string
    senderName: string
    timestamp: number
    roomId: string
    type: 'text' | 'image' | 'file' | 'voice' | 'video' | 'system'
    edited?: boolean
    editedAt?: number
    reactions?: Record<string, string[]> // emoji -> userIds
    replyTo?: string
    mentions?: string[]
  }

  interface VoiceMessage extends BaseMessage {
    type: 'voice'
    duration: number
    waveform?: number[]
    transcription?: string
  }

  interface FileMessage extends BaseMessage {
    type: 'file' | 'image' | 'video'
    fileName: string
    fileSize: number
    fileUrl: string
    mimeType: string
    thumbnail?: string
  }

  type Message = BaseMessage | VoiceMessage | FileMessage

  // User types
  interface User {
    uid: string
    email: string
    displayName: string | null
    photoURL: string | null
    isOnline: boolean
    lastSeen: number
    status: 'online' | 'away' | 'busy' | 'offline'
    preferences: {
      notifications: boolean
      soundEnabled: boolean
      theme: 'light' | 'dark' | 'system'
    }
  }

  // Room types
  interface Room {
    id: string
    name: string
    description?: string
    type: 'public' | 'private' | 'direct'
    createdBy: string
    createdAt: number
    updatedAt: number
    members: string[]
    admins: string[]
    settings: {
      allowFileSharing: boolean
      allowVoiceMessages: boolean
      allowCalling: boolean
      maxMembers: number
    }
    lastMessage?: Message
    unreadCount?: number
  }

  // Audio/Video device types
  interface MediaDeviceInfo {
    deviceId: string
    kind: 'audioinput' | 'audiooutput' | 'videoinput'
    label: string
    groupId: string
  }

  // WebRTC stats types
  interface CallStats {
    packetLoss: number
    jitter: number
    roundTripTime: number
    bandwidth: {
      upload: number
      download: number
    }
    quality: ConnectionQuality
  }

  // Notification types
  interface NotificationData {
    title: string
    body: string
    icon?: string
    badge?: string
    tag?: string
    data?: any
    actions?: Array<{
      action: string
      title: string
      icon?: string
    }>
  }

  // Error types
  interface AppError {
    code: string
    message: string
    details?: any
    timestamp: number
  }

  // API Response types
  interface ApiResponse<T = any> {
    success: boolean
    data?: T
    error?: AppError
    message?: string
  }

  // Haptic feedback types (for mobile)
  interface HapticFeedback {
    impact: (style: 'light' | 'medium' | 'heavy') => void
    notification: (type: 'success' | 'warning' | 'error') => void
    selection: () => void
  }

  // Service Worker types
  interface ServiceWorkerGlobalScope {
    skipWaiting(): Promise<void>
  }
}

export {}