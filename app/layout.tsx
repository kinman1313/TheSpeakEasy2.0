import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/components/AuthProvider"
import { Toaster } from "sonner"
import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Neon Chat App",
  description: "A modern chat application with voice and video calls",
  manifest: "/manifest.json",
  icons: {
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gradient-to-br from-gray-900 to-black min-h-screen antialiased`}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" theme="dark" closeButton richColors />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}

