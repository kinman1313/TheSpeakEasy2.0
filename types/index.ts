// Common types used throughout the application

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  timestamp: any; // Firebase Timestamp
  reactions?: Record<string, string[]>; // emoji -> array of user IDs
  voiceMessageUrl?: string;
  voiceMessageDuration?: number;
  gifUrl?: string;
}

export interface Settings {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  notificationSound: string;
  theme: "light" | "dark" | "system";
  messageVanishTimer: number | null;
}

export interface NotificationPreferences {
  notificationsEnabled: boolean;
  fcmTokens: string[];
  updatedAt: any; // Firebase Timestamp
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: any; // Firebase Timestamp
  members: string[];
  isPrivate: boolean;
}

export interface UserPresence {
  status: "online" | "offline" | "away";
  lastSeen: any; // Firebase Timestamp
}

// WebRTC related types
export type CallStatus =
  | 'idle'
  | 'requestingMedia'
  | 'creatingOffer'
  | 'waitingForAnswer'
  | 'receivingCall'
  | 'processingOffer'
  | 'creatingAnswer'
  | 'processingAnswer'
  | 'active'
  | 'error'
  | 'callEnded'
  | 'callDeclined';

export interface SignalingPayload {
  type: 'offer' | 'answer';
  sdp: string | undefined;
  senderId: string;
  senderName?: string;
  receiverId: string;
  timestamp: any; // Firebase ServerValue.TIMESTAMP
}

export interface CallDeclinedPayload {
  declinedByUserId: string;
  declinedByUserName?: string;
  timestamp: any; // Firebase ServerValue.TIMESTAMP
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PresenceResponse {
  presence: UserPresence;
}

// Error types
export interface AppError extends Error {
  code?: string;
  details?: any;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignUpFormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

export interface PasswordResetFormData {
  email: string;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
}

// Toast types to extend the base toast functionality
export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

// File upload types
export interface FileUploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  quality?: number; // for image compression
}

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  type: string;
}

// Real-time database types
export interface RTDBListener {
  path: string;
  listener: any; // Firebase listener function
}

// Permission states
export type PermissionState = 'prompt' | 'granted' | 'denied';

// Media constraints
export interface MediaConstraints {
  video: boolean | MediaTrackConstraints;
  audio: boolean | MediaTrackConstraints;
}

// Export all types from sub-files
export * from './settings';
export * from './types.d';