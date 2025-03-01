import { analytics } from "./firebase"
import { logEvent as firebaseLogEvent } from "firebase/analytics"

export async function logEvent(eventName: string, eventParams?: Record<string, any>) {
  try {
    const analyticsInstance = await analytics
    if (analyticsInstance) {
      firebaseLogEvent(analyticsInstance, eventName, eventParams)
    }
  } catch (error) {
    // Silently handle analytics errors in development
    if (process.env.NODE_ENV !== "production") {
      console.debug("Analytics event not logged:", error)
    }
  }
}

export async function logPageView(page_path: string) {
  await logEvent("page_view", {
    page_path,
    page_location: window.location.href,
    page_title: document.title,
  })
}

