"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "./firebase"
import type { UserStatus } from "./types"

// Hook for real-time user status
export function useUserStatus(userId: string) {
  const [status, setStatus] = useState<UserStatus>("offline")
  const [lastSeen, setLastSeen] = useState<Date | null>(null)

  useEffect(() => {
    if (!userId) return

    const unsubscribe = onSnapshot(doc(db, "users", userId), (doc) => {
      if (doc.exists()) {
        setStatus(doc.data().status)
        setLastSeen(doc.data().lastSeen?.toDate() || null)
      }
    })

    return () => unsubscribe()
  }, [userId])

  return { status, lastSeen }
}

// Hook for handling infinite scroll
export function useInfiniteScroll(callback: () => void) {
  const observer = useRef<IntersectionObserver | null>(null)

  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          callback()
        }
      })

      if (node) observer.current.observe(node)
    },
    [callback],
  )

  return lastElementRef
}

// Hook for handling typing indicator debounce
export function useTypingIndicator(roomId: string, userId: string) {
  const [isTyping, setIsTyping] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const handleTyping = useCallback(() => {
    setIsTyping(true)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 3000)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { isTyping, handleTyping }
}

// Hook for handling media queries
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [query])

  return matches
}

// Hook for handling local storage with type safety
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error("Error reading from localStorage:", error)
      return initialValue
    }
  })

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error("Error writing to localStorage:", error)
    }
  }

  return [storedValue, setValue] as const
}

