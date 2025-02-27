// app/layout.tsx
import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/components/AuthProvider'
import { Toaster } from 'sonner' // Changed from '@/components/ui/toaster' to 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
    title: 'Neon Chat App',
    description: 'A modern chat application with voice and video calls',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={`${inter.className} dark bg-gradient-to-br from-gray-900 to-black min-h-screen`}>
                <AuthProvider>
                    {children}
                    <Toaster position="top-right" /> {/* Added position prop */}
                </AuthProvider>
            </body>
        </html>
    )
}