"use client"

import type React from "react"

import { ThemeProvider } from "./theme-provider"
import { AuthProvider } from "./auth-provider"
import { WebRTCProvider } from "./WebRTCProvider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <WebRTCProvider>{children}</WebRTCProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

