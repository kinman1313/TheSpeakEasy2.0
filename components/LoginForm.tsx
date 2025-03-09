"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GithubIcon } from 'lucide-react'
import { auth } from "@/lib/firebase"
import { signInWithPopup, GithubAuthProvider, signInWithEmailAndPassword, type Auth } from "firebase/auth"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Check if Firebase is initialized
  const isFirebaseReady = typeof window !== 'undefined' && !!auth;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password || !isFirebaseReady || !auth) {
      toast.error("Please enter your email and password")
      return
    }

    try {
      setIsLoading(true)
      // Use type assertion to tell TypeScript that auth is definitely an Auth instance
      const authInstance = auth as Auth;

      await signInWithEmailAndPassword(authInstance, email, password)
      toast.success("Welcome back!")
      router.push("/")
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to sign in")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGithubLogin = async () => {
    if (!isFirebaseReady || !auth) {
      toast.error("Authentication service is not available")
      return
    }

    try {
      setIsLoading(true)
      const provider = new GithubAuthProvider()
      // Use type assertion to tell TypeScript that auth is definitely an Auth instance
      const authInstance = auth as Auth;

      await signInWithPopup(authInstance, provider)
      toast.success("Welcome back!")
      router.push("/")
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to sign in with GitHub")
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
        <CardTitle>Login</CardTitle>
        <CardDescription>Enter your credentials to access your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailLogin} className="space-y-4">
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
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || !isFirebaseReady}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGithubLogin}
          disabled={isLoading || !isFirebaseReady}
        >
          <GithubIcon className="mr-2 h-4 w-4" />
          Sign in with GitHub
        </Button>
      </CardFooter>
    </Card>
  )
}