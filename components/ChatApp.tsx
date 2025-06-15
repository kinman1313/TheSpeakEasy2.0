"use client"

import React from "react"
import { useAuth } from "@/components/auth/AuthProvider"

export default function ChatApp() {
  const { user } = useAuth()

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="p-4">
        <h1>Chat App</h1>
        <p>Welcome, {user.displayName || user.email}</p>
        <p>Minimal version for testing build</p>
      </div>
    </div>
  )
}