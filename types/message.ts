export interface Message {
    id: string;
    content: string;
    senderId: string;
    timestamp: Date;
    roomId: string;
    reactions?: {
        [emoji: string]: string[]; // user IDs who reacted with this emoji
    };
} 