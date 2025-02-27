// app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { LoginForm } from '@/components/LoginForm'
import { ChatApp } from '@/components/ChatApp'
import { requestNotificationPermission, registerServiceWorker } from '@/lib/notifications'

export default function Home() {
    const { user, loading } = useAuth()
    const [notificationsInitialized, setNotificationsInitialized] = useState(false)

    useEffect(() => {
        // Initialize notifications and service worker
        if (user && !notificationsInitialized) {
            const initNotifications = async () => {
                await requestNotificationPermission()
                await registerServiceWorker()
                setNotificationsInitialized(true)
            }

            initNotifications()
        }
    }, [user, notificationsInitialized])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-neon-blue text-2xl font-bold animate-pulse">
                    Loading...
                </div>
            </div>
        )
    }

    return (
        <main className="min-h-screen">
            {user ? <ChatApp /> : <LoginForm />}
        </main>
    )
}