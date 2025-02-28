"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/AuthProvider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestAuth() {
  const { user } = useAuth()
  const [adminStatus, setAdminStatus] = useState<string>("Not checked")

  useEffect(() => {
    async function checkAdmin() {
      try {
        const response = await fetch("/api/test-auth")
        const data = await response.json()
        setAdminStatus(data.message)
      } catch (error) {
        setAdminStatus("Error checking admin setup")
      }
    }

    checkAdmin()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-black">
      <Card className="w-full max-w-md border-none bg-black/50 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-xl text-white">Auth Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-400">Client Auth Status:</h3>
            <p className="text-white">{user ? `Logged in as ${user.email}` : "Not logged in"}</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-400">Admin SDK Status:</h3>
            <p className="text-white">{adminStatus}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

