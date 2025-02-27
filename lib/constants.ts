export const NEON_COLORS = {
  blue: "#00f3ff",
  green: "#39ff14",
  pink: "#ff0099",
  purple: "#9400d3",
  yellow: "#ffff00",
  orange: "#ffa500",
  red: "#ff0000",
  white: "#ffffff",
} as const

export const MESSAGE_TYPES = {
  text: "text",
  image: "image",
  gif: "gif",
  audio: "audio",
} as const

export const CALL_TYPES = {
  audio: "audio",
  video: "video",
} as const

export const USER_STATUS = {
  online: "online",
  offline: "offline",
  away: "away",
} as const

export const DEFAULT_USER_SETTINGS = {
  theme: "dark",
  enterToSend: true,
  showTypingIndicators: true,
  showReadReceipts: true,
  notificationsEnabled: true,
  chatColor: NEON_COLORS.blue,
  soundEnabled: true,
} as const

export const MEDIA_QUERIES = {
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
  "2xl": "(min-width: 1536px)",
  dark: "(prefers-color-scheme: dark)",
} as const

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
export const MAX_MESSAGE_LENGTH = 2000
export const TYPING_INDICATOR_TIMEOUT = 3000
export const MESSAGE_BATCH_SIZE = 50

