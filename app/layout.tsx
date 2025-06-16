import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Inter } from "next/font/google"
import { Providers } from "@/components/providers/providers"
import { Toaster } from "@/components/ui/toaster"
import { cn } from "@/lib/utils"
import "@/lib/react19-compat"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "The SpeakEasy 2.0",
  description: "A modern chat application with voice and video calls",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SpeakEasy 2.0",
  },
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" />

        {/* Theme color support for various browsers */}
        <meta name="theme-color" content="#22223b" />
        <meta name="theme-color" content="#22223b" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f8fafc" media="(prefers-color-scheme: light)" />

        {/* Apple-specific meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SpeakEasy" />
        <meta name="apple-touch-fullscreen" content="yes" />

        {/* Android/Chrome meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="SpeakEasy" />

        {/* Windows/IE meta tags */}
        <meta name="msapplication-TileColor" content="#22223b" />
        <meta name="msapplication-navbutton-color" content="#22223b" />

        {/* General meta tags */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="display-mode" content="standalone" />
        {process.env.NODE_ENV === 'development' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Suppress React 19 ref warnings in development
                if (typeof console !== 'undefined') {
                  const originalError = console.error;
                  const originalWarn = console.warn;
                  
                  console.error = (...args) => {
                    if (
                      typeof args[0] === 'string' && 
                      args[0].includes('Accessing element.ref was removed in React 19')
                    ) {
                      return; // Suppress this specific warning
                    }
                    originalError.apply(console, args);
                  };
                  
                  console.warn = (...args) => {
                    if (
                      typeof args[0] === 'string' && 
                      args[0].includes('Accessing element.ref was removed in React 19')
                    ) {
                      return; // Suppress this specific warning
                    }
                    originalWarn.apply(console, args);
                  };
                }
              `,
            }}
          />
        )}
      </head>
      <body className={cn(inter.className, "min-h-screen bg-background font-sans antialiased")}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  )
}

