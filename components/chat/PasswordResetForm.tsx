"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { auth } from "@/lib/firebase"
import { sendPasswordResetEmail, type Auth } from "firebase/auth"
import { toast } from "sonner"
import Link from "next/link"

export function PasswordResetForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Check if Firebase is initialized
  const isFirebaseReady = typeof window !== 'undefined' && !!auth;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !isFirebaseReady || !auth) {
      toast.error("Please enter your email address")
      return
    }

    try {
      setIsLoading(true)
      // Use type assertion to tell TypeScript that auth is definitely an Auth instance
      const authInstance = auth as Auth;

      await sendPasswordResetEmail(authInstance, email)
      toast.success("Password reset email sent! Check your inbox.")
      setEmail("")
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to send password reset email")
    } finally {
      setIsLoading(false)
    }
  }

  // Early return if not in browser
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>Enter your email to receive a password reset link</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || !isFirebaseReady}>
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link href="/login" className="text-sm text-primary hover:underline">
          Back to Login
        </Link>
      </CardFooter>
    </Card>
  )
}