"use client"

import { type ReactNode, useEffect, useState } from "react"
import { AuthProvider } from "./AuthProvider"
import { WebRTCProvider } from "./WebRTCProvider"
import { TooltipProvider } from "./ui/tooltip"
import { Toaster } from "sonner"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  // Handle client-side only mounting
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null // Return null on server-side and first render
  }

  return (
    <TooltipProvider delayDuration={0}>
      <AuthProvider>
        <WebRTCProvider>
          {children}
          <Toaster
            position="top-right"
            closeButton
            richColors
            toastOptions={{
              style: {
                background: "rgba(0, 0, 0, 0.8)",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(8px)",
              },
              className: "font-sans",
            }}
          />
        </WebRTCProvider>
      </AuthProvider>
    </TooltipProvider>
  )
}

