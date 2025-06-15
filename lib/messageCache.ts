import { type Message } from './types'

const CACHE_PREFIX = 'chat_messages_'

export function saveMessages(roomId: string, messages: Message[]): void {
    try {
        localStorage.setItem(CACHE_PREFIX + roomId, JSON.stringify(messages))
    } catch (_e) {
        // Ignore quota errors
    }
}

export function getMessages(roomId: string): Message[] {
    try {
        const data = localStorage.getItem(CACHE_PREFIX + roomId)
        if (!data) return []
        return JSON.parse(data)
    } catch (_e) {
        return []
    }
}

export function clearMessages(roomId: string): void {
    try {
        localStorage.removeItem(CACHE_PREFIX + roomId)
    } catch (_e) {
        // Ignore
    }
}

export function getCachedMessages(): Message[] {
    try {
        const cached = localStorage.getItem(CACHE_PREFIX)
        return cached ? JSON.parse(cached) : []
    } catch (_e) {
        return []
    }
}

export function clearMessageCache(): void {
    try {
        localStorage.removeItem(CACHE_PREFIX)
    } catch (_e) {
        // Silently fail if localStorage is not available
    }
} 