"use client"

import { useAuth } from "@/components/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import ChatApp from "@/components/ChatApp"

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-400 border-t-zinc-200" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <ChatApp />
}

