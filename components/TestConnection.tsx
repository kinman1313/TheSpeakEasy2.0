"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle } from "lucide-react"

export function TestConnection() {
  // Remove signIn from destructuring since it doesn't exist in your AuthContextType
  const { user } = useAuth()
  const [testStatus, setTestStatus] = useState({
    auth: false,
    database: false,
    storage: false,
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check if user is authenticated
    if (user) {
      setTestStatus((prev) => ({ ...prev, auth: true }))
    }
  }, [user])

  const testDatabase = async () => {
    setIsLoading(true)
    try {
      // Try to fetch a collection
      const querySnapshot = await getDocs(collection(db, "test-collection"))
      setTestStatus((prev) => ({ ...prev, database: true }))
    } catch (error) {
      console.error("Database test failed:", error)
      setTestStatus((prev) => ({ ...prev, database: false }))
    } finally {
      setIsLoading(false)
    }
  }

  const testAll = async () => {
    setIsLoading(true)
    try {
      // Check auth status without trying to sign in
      setTestStatus((prev) => ({ ...prev, auth: !!user }))

      // Test database
      await testDatabase()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Firebase Connection Test</CardTitle>
        <CardDescription>Test your Firebase connections</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Authentication</span>
          {testStatus.auth ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
        </div>
        <div className="flex items-center justify-between">
          <span>Database</span>
          {testStatus.database ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
        </div>
        <Button onClick={testAll} disabled={isLoading} className="w-full">
          {isLoading ? "Testing..." : "Test All Connections"}
        </Button>
      </CardContent>
    </Card>
  )
}

