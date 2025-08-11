"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ErrorBoundary } from "@/components/providers/ErrorBoundary"
import { useAuth } from "@/components/auth/AuthProvider"
import ChatAppWrapper from "@/components/ChatAppWrapper"

export function AuthenticatedApp() {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        // If not loading and no user, redirect to login
        if (!loading && !user) {
            router.push("/login")
        }
    }, [user, loading, router])

    // Show loading state while checking authentication
    if (loading) {
        console.log("AuthenticatedApp: Still loading auth state...")
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <p className="text-white">Loading authentication...</p>
                    <p className="text-slate-400 text-sm">If this takes too long, check console for errors</p>
                </div>
            </div>
        )
    }

    // If no user after loading, show nothing (will redirect)
    if (!user) {
        return null
    }

    // User is authenticated, show the chat app
    return (
        <ErrorBoundary>
            <ChatAppWrapper />
            <div id="chat-app-root" />
        </ErrorBoundary>
    )
}