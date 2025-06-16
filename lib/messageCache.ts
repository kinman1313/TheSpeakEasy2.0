import { type Message } from './types'

const CACHE_PREFIX = 'chat_messages_'

export function cacheMessages(roomId: string, messages: Message[]): void {
    try {
        localStorage.setItem(CACHE_PREFIX + roomId, JSON.stringify(messages))
    } catch {
        // Ignore quota errors
    }
}

export function getCachedMessages(roomId: string): Message[] {
    try {
        const data = localStorage.getItem(CACHE_PREFIX + roomId)
        if (!data) return []
        return JSON.parse(data)
    } catch {
        return []
    }
}

export function clearCachedMessages(roomId: string): void {
    try {
        localStorage.removeItem(CACHE_PREFIX + roomId)
    } catch {
        // Ignore
    }
}

export function clearAllMessageCache(): void {
    try {
        // Clear all cached messages by iterating through localStorage
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                localStorage.removeItem(key)
            }
        })
    } catch {
        // Silently fail if localStorage is not available
    }
} 