"use client"

import React, { useEffect, useState } from 'react'
import { useHaptics } from '@/lib/haptics'

interface SplashScreenProps {
    onComplete: () => void
    duration?: number
}

export function SplashScreen({ onComplete, duration = 2500 }: SplashScreenProps) {
    const [isVisible, setIsVisible] = useState(true)
    const [logoScale, setLogoScale] = useState(0.8)
    const [textOpacity, setTextOpacity] = useState(0)
    const { success } = useHaptics()

    useEffect(() => {
        // Animate logo entrance
        const logoTimer = setTimeout(() => {
            setLogoScale(1)
            setTextOpacity(1)
        }, 300)

        // Trigger haptic feedback
        const hapticTimer = setTimeout(() => {
            success()
        }, 800)

        // Complete splash screen
        const completeTimer = setTimeout(() => {
            setIsVisible(false)
            setTimeout(onComplete, 300) // Wait for fade out animation
        }, duration)

        return () => {
            clearTimeout(logoTimer)
            clearTimeout(hapticTimer)
            clearTimeout(completeTimer)
        }
    }, [duration, onComplete, success])

    if (!isVisible) {
        return (
            <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center transition-opacity duration-300 opacity-0 pointer-events-none" />
        )
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center transition-opacity duration-300">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)]" />
                <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,rgba(34,197,94,0.05)_60deg,transparent_120deg)]" />
            </div>

            {/* Main Content */}
            <div className="relative flex flex-col items-center justify-center text-center px-8">
                {/* Logo Container */}
                <div
                    className="relative mb-8 transition-transform duration-700 ease-out"
                    style={{ transform: `scale(${logoScale})` }}
                >
                    {/* Outer Glow Ring */}
                    <div className="absolute inset-0 w-32 h-32 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 opacity-20 blur-xl animate-pulse" />

                    {/* Main Logo Circle */}
                    <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-green-400 via-emerald-500 to-green-600 shadow-2xl flex items-center justify-center">
                        {/* Inner Shadow */}
                        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/20 to-transparent" />

                        {/* Logo Icon */}
                        <div className="relative z-10 text-white">
                            {/* Chat Bubble Icon */}
                            <svg
                                className="w-16 h-16"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                            </svg>
                        </div>

                        {/* Rotating Border */}
                        <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-spin" style={{ animationDuration: '3s' }}>
                            <div className="absolute top-0 left-1/2 w-1 h-1 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2" />
                        </div>
                    </div>
                </div>

                {/* App Name */}
                <div
                    className="transition-opacity duration-1000 ease-out"
                    style={{ opacity: textOpacity }}
                >
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                        <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                            SpeakEasy
                        </span>
                    </h1>
                    <p className="text-lg text-slate-300 font-medium mb-8">
                        Connect • Chat • Share
                    </p>
                </div>

                {/* Loading Animation */}
                <div
                    className="transition-opacity duration-1000 ease-out"
                    style={{ opacity: textOpacity }}
                >
                    <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>

                {/* Version Info */}
                <div
                    className="absolute bottom-8 left-1/2 transform -translate-x-1/2 transition-opacity duration-1000 ease-out"
                    style={{ opacity: textOpacity * 0.7 }}
                >
                    <p className="text-xs text-slate-400">
                        Version 2.0 • Built with ❤️
                    </p>
                </div>
            </div>

            {/* Particle Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-green-400/30 rounded-full animate-pulse"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${2 + Math.random() * 2}s`
                        }}
                    />
                ))}
            </div>
        </div>
    )
} 