import { analytics } from "./firebase"
import { logEvent as firebaseLogEvent } from "firebase/analytics"

export async function logEvent(eventName: string, eventParams?: Record<string, any>) {
    const analyticsInstance = await analytics
    if (analyticsInstance) {
        firebaseLogEvent(analyticsInstance, eventName, eventParams)
    }
}

export async function logPageView(page_path: string) {
    await logEvent("page_view", {
        page_path,
        page_location: window.location.href,
        page_title: document.title,
    })
}

