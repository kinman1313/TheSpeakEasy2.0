import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/components/auth/AuthProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
    title: "Chat App",
    description: "A real-time chat application built with Next.js and Firebase",
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <AuthProvider>
                    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
                        {children}
                        <Toaster />
                    </ThemeProvider>
                </AuthProvider>
            </body>
        </html>
    )
}


