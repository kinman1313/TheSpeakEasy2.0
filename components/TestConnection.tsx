"use client"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs } from "firebase/firestore"
import { toast } from "sonner"
import { useAuth } from "./AuthProvider"

export function TestConnection() {
  const { user, signIn } = useAuth()
  const [testStatus, setTestStatus] = useState({
    auth: false,
    database: false,
  })

  useEffect(() => {
    // Check if user is authenticated
    if (user) {
      setTestStatus((prev) => ({ ...prev, auth: true }))
    }
  }, [user])

  const testDatabase = async () => {
    try {
      // Try to write and read from Firestore
      const testCollection = collection(db, "test_connection")
      const testDoc = await addDoc(testCollection, {
        timestamp: new Date(),
        userId: user?.uid || "anonymous",
      })

      const querySnapshot = await getDocs(collection(db, "test_connection"))
      const docsExist = !querySnapshot.empty

      setTestStatus((prev) => ({ ...prev, database: true }))
      toast.success("Database connection successful!")
    } catch (error) {
      console.error("Database test failed:", error)
      toast.error("Database connection failed. Check console for details.")
    }
  }

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-neon-blue glow-blue">Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Authentication Status:</span>
            <span className={testStatus.auth ? "text-neon-green" : "text-neon-red"}>
              {testStatus.auth ? "✓ Connected" : "× Not Connected"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Database Status:</span>
            <span className={testStatus.database ? "text-neon-green" : "text-neon-red"}>
              {testStatus.database ? "✓ Connected" : "× Not Tested"}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {!user ? (
            <Button onClick={signIn} className="w-full bg-neon-blue hover:bg-neon-blue/80">
              Sign In with Google
            </Button>
          ) : (
            <Button onClick={testDatabase} className="w-full bg-neon-green hover:bg-neon-green/80">
              Test Database Connection
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

