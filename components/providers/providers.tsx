'use client'

import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/components/auth/AuthProvider"
import { SettingsProvider } from "@/components/providers/settings-provider"
import { WebRTCProvider } from "@/components/providers/WebRTCProvider"
import { CustomThemeProvider } from "@/components/providers/ThemeProvider"
import type { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CustomThemeProvider>
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
      </CustomThemeProvider>
    </AuthProvider>
  )
}