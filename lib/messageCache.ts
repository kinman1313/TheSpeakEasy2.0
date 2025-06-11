import { type Message } from './types'

const CACHE_PREFIX = 'chat_messages_'

export function saveMessages(roomId: string, messages: Message[]): void {
    try {
        localStorage.setItem(CACHE_PREFIX + roomId, JSON.stringify(messages))
    } catch (e) {
        // Ignore quota errors
    }
}

export function getMessages(roomId: string): Message[] {
    try {
        const data = localStorage.getItem(CACHE_PREFIX + roomId)
        if (!data) return []
        return JSON.parse(data)
    } catch (e) {
        return []
    }
}

export function clearMessages(roomId: string): void {
    try {
        localStorage.removeItem(CACHE_PREFIX + roomId)
    } catch (e) {
        // Ignore
    }
} 