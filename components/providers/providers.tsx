'use client'

import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/toaster"
import type { ReactNode } from "react"

import { AuthProvider } from "@/components/auth/AuthProvider"
// TODO: SettingsProvider and WebRTCProvider need the same SSR fix as AuthProvider
// They likely have Firebase imports that are undefined during SSR

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
        <Toaster />
      </ThemeProvider>
    </AuthProvider>
  )
}