import React from 'react'
import { db } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { useAuth } from '@/components/auth/AuthProvider'

interface Message {
    id: string
    reactions: { [key: string]: string[] }
}

interface MessageReactionsProps {
    message: Message
}

const MessageReactions: React.FC<MessageReactionsProps> = ({ message }) => {
    const { user } = useAuth()

    const handleReaction = async (emoji: string) => {
        if (!user) return

        try {
            const messageRef = doc(db, "messages", message.id)
            const reactions = { ...message.reactions }

            // Check if user already reacted with this emoji
            const userReactions = Object.entries(reactions).find(([key, users]) => key === emoji && users.includes(user.uid))

            if (userReactions) {
                // Remove user's reaction
                reactions[emoji] = reactions[emoji].filter(uid => uid !== user.uid)
                if (reactions[emoji].length === 0) {
                    delete reactions[emoji]
                }
            } else {
                // Add user's reaction
                if (!reactions[emoji]) {
                    reactions[emoji] = []
                }
                reactions[emoji].push(user.uid)
            }

            await updateDoc(messageRef, { reactions })
        } catch (error) {
            console.error('Error updating reactions:', error)
        }
    }

    return (
        <div>
            {/* Render reactions */}
            {Object.entries(message.reactions).map(([emoji, users]) => (
                <span key={emoji} onClick={() => handleReaction(emoji)}>
                    {emoji} {users.length}
                </span>
            ))}
        </div>
    )
}

export default MessageReactions
