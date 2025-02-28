"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  FacebookAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Github, Mail, ChromeIcon as Google, Facebook } from "lucide-react"
import Link from "next/link"

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()

  async function signInWithProvider(provider: GoogleAuthProvider | GithubAuthProvider | FacebookAuthProvider) {
    try {
      setIsLoading(true)
      await signInWithPopup(auth, provider)
      toast.success("Welcome back!")
      router.push("/")
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to sign in. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Please fill in all fields")
      return
    }

    try {
      setIsLoading(true)
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password)
        toast.success("Account created successfully!")
      } else {
        await signInWithEmailAndPassword(auth, email, password)
        toast.success("Welcome back!")
      }
      router.push("/")
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Authentication failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleEmailAuth} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-400"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-white">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-400"
          />
        </div>
        <Button type="submit" disabled={isLoading} className="w-full glass hover:glass-darker neon-glow text-white">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-200" />
              {isRegistering ? "Creating account..." : "Signing in..."}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {isRegistering ? "Create Account" : "Sign in with Email"}
            </span>
          )}
        </Button>
      </form>

      <div className="flex items-center gap-2">
        <Separator className="flex-1 bg-white/10" />
        <span className="text-xs text-zinc-400">OR</span>
        <Separator className="flex-1 bg-white/10" />
      </div>

      <div className="grid gap-4">
        {/* Update all provider buttons */}
        <Button
          type="button"
          variant="outline"
          onClick={() => signInWithProvider(new GoogleAuthProvider())}
          disabled={isLoading}
          className="glass hover:glass-darker text-white"
        >
          <Google className="h-5 w-5 mr-2" />
          Continue with Google
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => signInWithProvider(new GithubAuthProvider())}
          disabled={isLoading}
          className="glass hover:glass-darker text-white"
        >
          <Github className="h-5 w-5 mr-2" />
          Continue with GitHub
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => signInWithProvider(new FacebookAuthProvider())}
          disabled={isLoading}
          className="glass hover:glass-darker text-white"
        >
          <Facebook className="h-5 w-5 mr-2" />
          Continue with Facebook
        </Button>
      </div>

      <div className="flex flex-col gap-2 text-center text-sm">
        <button
          type="button"
          onClick={() => setIsRegistering(!isRegistering)}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          {isRegistering ? "Already have an account? Sign in" : "Need an account? Create one"}
        </button>
        <Link href="/reset-password" className="text-zinc-400 hover:text-white transition-colors">
          Forgot your password?
        </Link>
      </div>
    </div>
  )
}

