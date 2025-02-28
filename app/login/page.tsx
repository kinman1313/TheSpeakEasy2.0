import { LoginForm } from "@/components/LoginForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4 frost-bg">
      <div className="absolute inset-0 bg-gradient-to-b from-[#00C3FF]/10 to-transparent pointer-events-none" />
      <Card className="w-full max-w-md border-none glass-card neon-glow">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center font-bold tracking-tight text-white">
            Welcome to NeonChat
          </CardTitle>
          <CardDescription className="text-center text-zinc-400">
            Sign in to continue to your conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}

