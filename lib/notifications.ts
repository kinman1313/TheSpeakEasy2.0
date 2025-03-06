import { db } from "./firebase"
import { doc, getDoc } from "firebase/firestore"
import type { User } from "./types"

// Define a NotificationAction interface for the actions
interface NotificationAction {
  action: string
  title: string
  icon?: string
}

// Define an extended NotificationOptions interface to include vibrate and actions
interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number[]
  actions?: NotificationAction[]
  data?: any
  requireInteraction?: boolean
}

async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications")
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    return permission === "granted"
  } catch (error) {
    console.error("Error requesting notification permission:", error)
    return false
  }
}

async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js")
      return registration
    } catch (error) {
      console.error("Service worker registration failed:", error)
      throw error
    }
  }
  throw new Error("Service workers not supported")
}

export async function setupNotifications() {
  const hasPermission = await requestNotificationPermission()
  if (!hasPermission) return false

  try {
    const registration = await registerServiceWorker()
    return registration
  } catch (error) {
    console.error("Failed to setup notifications:", error)
    return false
  }
}

export async function sendNotification(userId: string, title: string, options: ExtendedNotificationOptions) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId))

    if (!userDoc.exists()) {
      return
    }

    const userData = userDoc.data() as User

    // Add null checks here
    if (!userData || !userData.settings || !userData.settings.notificationsEnabled) {
      return
    }

    const registration = await navigator.serviceWorker.ready

    // Merge the options with our default options
    const notificationOptions = {
      ...options,
      icon: options.icon || "/icons/icon-192x192.png",
      badge: options.badge || "/icons/icon-72x72.png",
      vibrate: options.vibrate || [100, 50, 100],
    }

    await registration.showNotification(title, notificationOptions as NotificationOptions)
  } catch (error) {
    console.error("Error sending notification:", error)
  }
}

export function playNotificationSound(type: "message" | "call") {
  const audio = new Audio(`/sounds/${type}.mp3`)
  audio.play().catch(console.error)
}

export async function sendCallNotification(userId: string, callerName: string, roomId: string, isVideo: boolean) {
  const title = `Incoming ${isVideo ? "Video" : "Voice"} Call`
  const options: ExtendedNotificationOptions = {
    body: `${callerName} is calling...`,
    data: {
      roomId,
      type: "call",
    },
    requireInteraction: true,
    actions: [
      {
        action: "answer",
        title: "Answer",
      },
      {
        action: "decline",
        title: "Decline",
      },
    ],
  }

  await sendNotification(userId, title, options)
  playNotificationSound("call")
}

export async function sendMessageNotification(userId: string, senderName: string, message: string, roomId: string) {
  const title = senderName
  const options: ExtendedNotificationOptions = {
    body: message,
    data: {
      roomId,
      type: "message",
    },
  }

  await sendNotification(userId, title, options)
  playNotificationSound("message")
}

