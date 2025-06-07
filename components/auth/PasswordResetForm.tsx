"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "react-hot-toast"
import { auth } from "@/lib/firebase"
import { sendPasswordResetEmail } from "firebase/auth"
import { ControllerRenderProps } from "react-hook-form"
import Link from "next/link"
import { useRouter } from "next/navigation"

const formSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
})

export function PasswordResetForm() {
    const [isLoading, setIsLoading] = useState(false)
    const [emailSent, setEmailSent] = useState(false)
    const [sentEmail, setSentEmail] = useState("")
    const router = useRouter()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            setIsLoading(true)



            await sendPasswordResetEmail(auth, values.email)
            setSentEmail(values.email)
            setEmailSent(true)
            toast.success("Password reset email sent! Check your inbox.")
        } catch (error) {
            console.error("Error sending password reset email:", error)
            toast.error("Failed to send password reset email. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    if (emailSent) {
        return (
            <div className="text-center space-y-6">
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-green-400">Email Sent!</h2>
                    <p className="text-gray-300">
                        We've sent a password reset link to:
                    </p>
                    <p className="text-white font-semibold">{sentEmail}</p>
                    <p className="text-sm text-gray-400">
                        Check your inbox and follow the link to reset your password.
                    </p>
                </div>

                <div className="space-y-3">
                    <Button
                        onClick={() => router.push("/login")}
                        className="w-full glass hover:glass-darker neon-glow text-white"
                    >
                        Back to Login
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setEmailSent(false)
                            setSentEmail("")
                            form.reset()
                        }}
                        className="w-full glass hover:glass-darker text-white border-slate-600/50"
                    >
                        Send Another Email
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Reset Password</h2>
                <p className="text-gray-400">
                    Enter your email address and we'll send you a reset link.
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }: { field: ControllerRenderProps<z.infer<typeof formSchema>, "email"> }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Enter your email"
                                        type="email"
                                        disabled={isLoading}
                                        {...field}
                                        className="glass border-slate-600/50 text-white placeholder:text-slate-400 focus:border-indigo-500/50 focus:bg-slate-800/60"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button
                        type="submit"
                        className="w-full glass hover:glass-darker neon-glow text-white"
                        disabled={isLoading}
                    >
                        {isLoading ? "Sending..." : "Reset Password"}
                    </Button>
                </form>
            </Form>

            <div className="text-center">
                <Link
                    href="/login"
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                    Back to Login
                </Link>
            </div>
        </div>
    )
} 