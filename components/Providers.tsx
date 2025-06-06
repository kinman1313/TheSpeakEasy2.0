"use client"

import { ReactNode } from "react"
import { ThemeProvider } from "./ThemeProvider"
import { AuthProvider } from "./AuthProvider"
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

