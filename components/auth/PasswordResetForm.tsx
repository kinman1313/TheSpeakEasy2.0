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

const formSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
})

type FormSchema = z.infer<typeof formSchema>

export function PasswordResetForm() {
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<FormSchema>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
        },
    })

    async function onSubmit(values: FormSchema) {
        try {
            setIsLoading(true)
            await sendPasswordResetEmail(auth, values.email)
            toast.success("Password reset email sent! Check your inbox.")
            form.reset()
        } catch (error) {
            console.error("Error sending password reset email:", error)
            toast.error("Failed to send password reset email. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Enter your email"
                                    type="email"
                                    disabled={isLoading}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Reset Password"}
                </Button>
            </form>
        </Form>
    )
} 