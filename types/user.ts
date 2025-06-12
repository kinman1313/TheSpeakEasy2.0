export type UserStatus = 'online' | 'idle' | 'offline' | 'do-not-disturb';

export interface User {
    id: string;
    uid: string;
    name: string;
    email: string;
    avatar?: string;
    status: UserStatus;
    // ... existing fields ...
} 