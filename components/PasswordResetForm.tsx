"use client"

import type React from "react"

import { useState } from "react"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export function PasswordResetForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setIsLoading(true)
      await sendPasswordResetEmail(auth, email)
      toast.success("Password reset email sent! Check your inbox.")
      setEmail("")
    } catch (error: any) {
      console.error("Password reset error:", error)
      // More specific error messages
      if (error.code === "auth/network-request-failed") {
        toast.error("Network error. Please check your connection and make sure the Firebase emulator is running.")
      } else if (error.code === "auth/user-not-found") {
        toast.error("No account found with this email address.")
      } else if (error.code === "auth/invalid-email") {
        toast.error("Please enter a valid email address.")
      } else {
        toast.error(error.message || "Failed to send reset email. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-none bg-black/50 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-xl text-white">Reset Password</CardTitle>
        <CardDescription className="text-zinc-400">
          Enter your email address and we'll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent>
          <div className="grid gap-4">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-400"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" disabled={isLoading} className="w-full bg-white/10 hover:bg-white/20 text-white">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-200" />
                Sending...
              </span>
            ) : (
              "Send Reset Link"
            )}
          </Button>
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}

