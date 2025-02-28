"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Github } from "lucide-react"
import Link from "next/link"

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function onSubmit() {
    try {
      setIsLoading(true)
      const provider = new GoogleAuthProvider()
      // Add custom parameters for better UX
      provider.setCustomParameters({
        prompt: "select_account",
      })
      await signInWithPopup(auth, provider)
      toast.success("Welcome back!")
      router.push("/")
    } catch (error: any) {
      console.error("Auth error:", error)
      // Handle specific Firebase auth errors
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

  return (
    <div className="grid gap-6">
      <Button variant="outline" onClick={onSubmit} disabled={isLoading} className="bg-white/5 hover:bg-white/10">
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
      <div className="text-center">
        <Link href="/reset-password" className="text-sm text-zinc-400 hover:text-white transition-colors">
          Forgot your password?
        </Link>
      </div>
    </div>
  )
}

