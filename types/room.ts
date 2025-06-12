export interface Room {
    id: string;
    name: string;
    description?: string;
    createdBy: string;
    createdAt: Date;
    members: string[];
    pattern?: string;
} 