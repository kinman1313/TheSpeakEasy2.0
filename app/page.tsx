"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"

// Dynamically import ChatApp with no SSR to prevent Firebase initialization issues
const ChatApp = dynamic(() => import("@/components/ChatApp"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="text-lg">Loading chat...</div>
    </div>
  ),
})

export default function Page() {
  return (
    <div>
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <ChatApp />
      </Suspense>
    </div>
  )
}

