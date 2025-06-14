"use client"

import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-slate-800/50 backdrop-blur-md rounded-xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Welcome Back
          </h1>
          <p className="text-sm text-slate-400">
            Sign in to continue to The SpeakEasy 2.0
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}