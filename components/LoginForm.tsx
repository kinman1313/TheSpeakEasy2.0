"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  signInWithPopup,
  GithubAuthProvider,
  GoogleAuthProvider,
  FacebookAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth"
import { Github, Mail, Facebook } from "lucide-react"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import Link from "next/link"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()

  async function onGithubLogin() {
    try {
      setIsLoading(true)
      const provider = new GithubAuthProvider()
      await signInWithPopup(auth, provider)
      toast.success("Welcome back!")
      router.push("/")
    } catch (error: any) {
      console.error("Auth error:", error)
      if (error.code === "auth/unauthorized-domain") {
        toast.error("This domain is not authorized. Please contact support.")
      } else if (error.code === "auth/popup-closed-by-user") {
        toast.error("Sign in was cancelled. Please try again.")
      } else {
        toast.error("Failed to sign in. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function onGoogleLogin() {
    try {
      setIsLoading(true)
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      toast.success("Welcome back!")
      router.push("/")
    } catch (error: any) {
      console.error("Auth error:", error)
      if (error.code === "auth/popup-closed-by-user") {
        toast.error("Sign in was cancelled. Please try again.")
      } else {
        toast.error("Failed to sign in with Google. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function onFacebookLogin() {
    try {
      setIsLoading(true)
      const provider = new FacebookAuthProvider()
      await signInWithPopup(auth, provider)
      toast.success("Welcome back!")
      router.push("/")
    } catch (error: any) {
      console.error("Auth error:", error)
      if (error.code === "auth/popup-closed-by-user") {
        toast.error("Sign in was cancelled. Please try again.")
      } else {
        toast.error("Failed to sign in with Facebook. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function onEmailRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return

    try {
      setIsLoading(true)
      await createUserWithEmailAndPassword(auth, email, password)
      toast.success("Account created successfully!")
      router.push("/")
    } catch (error: any) {
      console.error("Registration error:", error)
      // More specific error messages
      if (error.code === "auth/network-request-failed") {
        toast.error("Network error. Please check your connection and make sure the Firebase emulator is running.")
      } else if (error.code === "auth/email-already-in-use") {
        toast.error("This email is already registered. Please sign in instead.")
      } else if (error.code === "auth/invalid-email") {
        toast.error("Please enter a valid email address.")
      } else if (error.code === "auth/weak-password") {
        toast.error("Password should be at least 6 characters long.")
      } else {
        toast.error("Failed to create account. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function onEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return

    try {
      setIsLoading(true)
      await signInWithEmailAndPassword(auth, email, password)
      toast.success("Welcome back!")
      router.push("/")
    } catch (error: any) {
      console.error("Login error:", error)
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        toast.error("Invalid email or password")
      } else {
        toast.error("Failed to sign in. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <Tabs defaultValue="login" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <form onSubmit={onEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/5 border-white/10"
              />
            </div>

            <Button type="submit" className="w-full bg-white/10 hover:bg-white/20" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in with Email"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="register">
          <form onSubmit={onEmailRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <Input
                id="register-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password">Password</Label>
              <Input
                id="register-password"
                type="password"
                placeholder="Choose a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-white/5 border-white/10"
              />
            </div>

            <Button type="submit" className="w-full bg-white/10 hover:bg-white/20" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <div className="grid gap-2">
        <Button
          variant="outline"
          onClick={onGoogleLogin}
          disabled={isLoading}
          className="bg-white/5 hover:bg-white/10 w-full"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-200" />
              Signing in...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Continue with Google
            </span>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={onFacebookLogin}
          disabled={isLoading}
          className="bg-white/5 hover:bg-white/10 w-full"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-200" />
              Signing in...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Facebook className="h-5 w-5" />
              Continue with Facebook
            </span>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={onGithubLogin}
          disabled={isLoading}
          className="bg-white/5 hover:bg-white/10 w-full"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-200" />
              Signing in...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              Continue with GitHub
            </span>
          )}
        </Button>
      </div>

      <div className="text-center">
        <Link href="/reset-password" className="text-sm text-zinc-400 hover:text-white transition-colors">
          Forgot your password?
        </Link>
      </div>
    </div>
  )
}

