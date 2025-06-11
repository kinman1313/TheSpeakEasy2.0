import { db } from '@/lib/firebase'
import { doc, setDoc, deleteDoc, onSnapshot, collection, query, where, orderBy, getDoc } from 'firebase/firestore'
import { type Message } from '@/lib/types'

export class ThreadNotificationService {
    private static listeners: Map<string, () => void> = new Map()

    /**
     * Subscribe to thread notifications
     */
    static async subscribeToThread(threadId: string, userId: string): Promise<void> {
        try {
            const subscriptionRef = doc(db, 'threadSubscriptions', `${threadId}_${userId}`)
            await setDoc(subscriptionRef, {
                threadId,
                userId,
                subscribedAt: new Date()
            })
        } catch (error) {
            console.error('Error subscribing to thread:', error)
        }
    }

    /**
     * Unsubscribe from thread notifications
     */
    static async unsubscribeFromThread(threadId: string, userId: string): Promise<void> {
        try {
            const subscriptionRef = doc(db, 'threadSubscriptions', `${threadId}_${userId}`)
            await deleteDoc(subscriptionRef)
        } catch (error) {
            console.error('Error unsubscribing from thread:', error)
        }
    }

    /**
     * Listen for new messages in a thread
     */
    static listenToThreadMessages(
        threadId: string,
        onNewMessage: (message: Message) => void
    ): () => void {
        const messagesRef = collection(db, `threads/${threadId}/messages`)
        const q = query(
            messagesRef,
            orderBy('createdAt', 'desc'),
            where('threadId', '==', threadId)
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const message = {
                        id: change.doc.id,
                        ...change.doc.data()
                    } as Message
                    onNewMessage(message)
                }
            })
        })

        this.listeners.set(threadId, unsubscribe)
        return () => this.stopListeningToThread(threadId)
    }

    /**
     * Stop listening to thread messages
     */
    static stopListeningToThread(threadId: string): void {
        const unsubscribe = this.listeners.get(threadId)
        if (unsubscribe) {
            unsubscribe()
            this.listeners.delete(threadId)
        }
    }

    /**
     * Get thread subscription status
     */
    static async getThreadSubscriptionStatus(
        threadId: string,
        userId: string
    ): Promise<boolean> {
        try {
            const subscriptionRef = doc(db, 'threadSubscriptions', `${threadId}_${userId}`)
            const subscription = await getDoc(subscriptionRef)
            return subscription.exists()
        } catch (error) {
            console.error('Error getting thread subscription status:', error)
            return false
        }
    }

    /**
     * Clean up all thread listeners
     */
    static cleanup(): void {
        this.listeners.forEach((unsubscribe) => unsubscribe())
        this.listeners.clear()
    }
} 