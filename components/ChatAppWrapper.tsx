"use client"

import { useEffect } from "react"
import ChatApp from "@/components/ChatApp"

// Wraps the imperative ChatApp({ enhanced }) function so it can be used in JSX.
const ChatAppWrapper = () => {
    useEffect(() => {
        // Initialize ChatApp (expects { enhanced } per its signature)
        ChatApp({ enhanced: true })
        // If ChatApp returns a cleanup function in future, return it here.
    }, [])

    // Provide a mounting container if ChatApp manipulates the DOM.
    return <div id="chat-app-root" />
}

export default ChatAppWrapper
