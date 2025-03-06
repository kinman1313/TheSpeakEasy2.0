import { analytics } from "./firebase"
import { logEvent as firebaseLogEvent } from "firebase/analytics"

export async function logEvent(eventName: string, eventParams?: Record<string, any>) {
  try {
    // Check if analytics is available
    if (analytics) {
      await firebaseLogEvent(analytics, eventName, eventParams)
      console.log(`Event logged: ${eventName}`, eventParams)
    } else {
      // Analytics not available, log to console in development
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Analytics Mock] Event: ${eventName}`, eventParams)
      }
    }
  } catch (error) {
    console.error(`Error logging event ${eventName}:`, error)
  }
}

export function initializeAnalytics(): boolean {
  // This function can be called from _app.tsx or similar to ensure analytics is initialized
  // It doesn't need to do anything as initialization happens in firebase.ts
  return analytics !== null
}
