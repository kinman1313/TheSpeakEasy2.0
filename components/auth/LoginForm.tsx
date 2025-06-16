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
import { toast } from "react-hot-toast"
import { Github, Mail, Chrome as Google, Facebook } from "lucide-react"
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
      console.log("Starting provider sign in...")

      // Try popup first, fallback to redirect if popup fails
      let result;
      try {
        result = await signInWithPopup(auth, provider)
      } catch (popupError: any) {
        // If popup fails due to COOP policy or popup blocked, try redirect
        if (popupError.code === 'auth/popup-blocked' ||
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.message.includes('Cross-Origin-Opener-Policy') ||
          popupError.message.includes('window.close')) {
          toast.error("Popup authentication failed. This may be due to browser security settings. Please try refreshing the page or contact support.")
          return;
        }
        throw popupError; // Re-throw if it's a different error
      }

      console.log("Sign in successful:", result.user)
      toast.success("Welcome back!")
      router.push("/")
    } catch (error: any) {
      console.error("Provider sign in error:", error)

      if (error.code === 'auth/popup-closed-by-user') {
        // Don't show error for user-cancelled popup
        return;
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        toast.error("An account already exists with the same email address but different sign-in credentials.")
      } else if (error.code === 'auth/popup-blocked') {
        toast.error("Popup was blocked by your browser. Please allow popups for this site.")
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error("This domain is not authorized for authentication. Please check Firebase configuration.")
      } else {
        toast.error(error.message || "Failed to sign in. Please try again.")
      }
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

    // Add validation for registration
    if (isRegistering) {
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters long")
        return
      }
      if (!/\S+@\S+\.\S+/.test(email)) {
        toast.error("Please enter a valid email address")
        return
      }
    }

    try {
      setIsLoading(true)
      console.log("Starting email auth...", isRegistering ? "registering" : "signing in")

      if (isRegistering) {
        const result = await createUserWithEmailAndPassword(auth, email, password)
        console.log("Registration successful:", result.user)
        toast.success("Account created successfully!")
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password)
        console.log("Sign in successful:", result.user)
        toast.success("Welcome back!")
      }
      router.push("/")
    } catch (error: any) {
      console.error("Email auth error:", error)

      // Registration-specific errors
      if (isRegistering) {
        if (error.code === 'auth/email-already-in-use') {
          toast.error("An account with this email already exists. Try signing in instead.")
          setIsRegistering(false) // Switch to sign in mode
        } else if (error.code === 'auth/weak-password') {
          toast.error("Password is too weak. Use at least 6 characters with numbers and letters.")
        } else if (error.code === 'auth/invalid-email') {
          toast.error("Please enter a valid email address.")
        } else if (error.code === 'auth/operation-not-allowed') {
          toast.error("Email/password accounts are not enabled. Please contact support.")
        } else {
          toast.error(`Account creation failed: ${error.message || "Please try again."}`)
        }
      } else {
        // Sign in specific errors
        if (error.code === 'auth/user-not-found') {
          toast.error("No account found with this email. Try creating an account.")
          setIsRegistering(true) // Switch to registration mode
        } else if (error.code === 'auth/wrong-password') {
          toast.error("Incorrect password.")
        } else if (error.code === 'auth/invalid-email') {
          toast.error("Invalid email address.")
        } else if (error.code === 'auth/user-disabled') {
          toast.error("This account has been disabled. Contact support.")
        } else {
          toast.error(error.message || "Sign in failed. Please try again.")
        }
      }
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
            className="glass border-slate-600/50 text-white placeholder:text-slate-400 focus:border-indigo-500/50 focus:bg-slate-800/60"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-white">
            Password {isRegistering && <span className="text-xs text-zinc-400">(min. 6 characters)</span>}
          </Label>
          <Input
            id="password"
            type="password"
            placeholder={isRegistering ? "At least 6 characters" : "••••••••"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass border-slate-600/50 text-white placeholder:text-slate-400 focus:border-indigo-500/50 focus:bg-slate-800/60"
          />
          {isRegistering && password.length > 0 && password.length < 6 && (
            <p className="text-xs text-red-400">Password must be at least 6 characters</p>
          )}
        </div>
        <Button
          type="submit"
          disabled={isLoading || (isRegistering && password.length < 6)}
          className="w-full glass hover:glass-darker neon-glow text-white"
        >
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

