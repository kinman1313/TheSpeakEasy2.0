"use client";

import { createContext, useState, useEffect, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase"; // Now guaranteed to never be undefined

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isFirebaseReady: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isFirebaseReady: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if we're in a browser environment
  const isBrowser = typeof window !== "undefined";
  const isFirebaseReady = isBrowser && !!auth; // Now auth is never undefined

  useEffect(() => {
    // Ensure Firebase auth is ready before using it
    if (!isFirebaseReady) {
      setIsLoading(false);
      return;
    }

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isFirebaseReady]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isFirebaseReady }}>
      {children}
    </AuthContext.Provider>
  );
}
