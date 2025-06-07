"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle } from 'lucide-react'
import { collection, getDocs, type Firestore } from "firebase/firestore"
import { db } from "@/lib/firebase"

export function TestConnection() {
    const { user } = useAuth()
    const [testStatus, setTestStatus] = useState({
        auth: false,
        database: false,
    })
    const [isLoading, setIsLoading] = useState(false)

    // Check if Firebase is initialized
    const isFirebaseReady = typeof window !== 'undefined' && !!db;

    // Move the initial auth check to useEffect to ensure it only runs in the browser
    useEffect(() => {
        if (user) {
            setTestStatus((prev) => ({ ...prev, auth: true }))
        }
    }, [user])

    const testDatabase = async () => {
        setIsLoading(true)
        try {
            // Skip if Firebase is not initialized
            if (!isFirebaseReady || !db) {
                setTestStatus((prev) => ({ ...prev, database: false }))
                throw new Error("Firebase is not initialized");
            }

            // Use type assertion to tell TypeScript that db is definitely a Firestore instance
            const firestore = db as Firestore;

            // Try to fetch a collection
            await getDocs(collection(firestore, "test-collection"))
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
            // Check auth status
            setTestStatus((prev) => ({ ...prev, auth: !!user }))

            // Test database
            await testDatabase()
        } finally {
            setIsLoading(false)
        }
    }

    // Early return if not in browser
    if (typeof window === 'undefined') {
        return null;
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
                <Button onClick={testAll} disabled={isLoading || !isFirebaseReady} className="w-full">
                    {isLoading ? "Testing..." : "Test All Connections"}
                </Button>
            </CardContent>
        </Card>
    )
}