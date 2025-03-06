"use client"

import type React from "react"

import { AuthProvider as AuthProviderComponent } from "@/components/auth/AuthProvider"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthProviderComponent>{children}</AuthProviderComponent>
}

