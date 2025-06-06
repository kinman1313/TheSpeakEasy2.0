'use client'

import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/toaster"
import type { ReactNode } from "react"

import { AuthProvider } from "@/components/auth/AuthProvider"
import { SettingsProvider } from "@/components/settings-provider"
import { WebRTCProvider } from "@/components/providers/WebRTCProvider"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <WebRTCProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </WebRTCProvider>
      </SettingsProvider>
    </AuthProvider>
  )
}