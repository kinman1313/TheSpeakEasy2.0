"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { auth } from "@/lib/firebase"
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
} from "firebase/auth"
import { toast } from "sonner"

export function LoginForm() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isSignUp, setIsSignUp] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email || !password) {
            toast.error("Please enter both email and password")
            return
        }

        setIsLoading(true)

        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password)
                toast.success("Account created successfully")
            } else {
                await signInWithEmailAndPassword(auth, email, password)
                toast.success("Signed in successfully")
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to authenticate")
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleAuth = async () => {
        setIsLoading(true)

        try {
            const provider = new GoogleAuthProvider()
            await signInWithPopup(auth, provider)
            toast.success("Signed in with Google successfully")
        } catch (error: any) {
            toast.error(error.message || "Failed to authenticate with Google")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md glass shadow-glow">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-center text-neon-blue glow-blue">Neon Chat</CardTitle>
                    <CardDescription className="text-center">
                        {isSignUp ? "Create a new account" : "Sign in to your account"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-opacity-30 border-neon-blue"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-opacity-30 border-neon-blue"
                            />
                        </div>
                        <Button type="submit" className="w-full bg-neon-blue text-black hover:bg-opacity-80" disabled={isLoading}>
                            {isLoading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
                        </Button>
                    </form>

                    <div className="mt-4 text-center">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-600"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-black text-gray-400">Or continue with</span>
                            </div>
                        </div>

                        <Button
                            onClick={handleGoogleAuth}
                            variant="outline"
                            className="mt-4 w-full border-neon-green text-neon-green hover:bg-neon-green/10"
                            disabled={isLoading}
                        >
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                        </Button>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        variant="link"
                        className="w-full text-neon-purple hover:text-neon-purple/80"
                        onClick={() => setIsSignUp(!isSignUp)}
                        disabled={isLoading}
                    >
                        {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

