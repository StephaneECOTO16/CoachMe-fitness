export interface ChatUser {
    id: number;
    name: string | null;
    email: string;
    avatar: string | null;
}

export interface Chat {
    id: number;
    coachId: number;
    clientId: number;
    createdAt: string;
    updatedAt: string;
    lastMessage?: string | null;
    lastMessageAt?: string | null;
    lastMessageSenderId?: string | null;
    lastMessageSenderName?: string | null;
    lastMessageIsMine?: boolean;
    unreadCount?: number;
    isOnline?: boolean;
    coach: {
        id: number;
        discipline: {
            id: number;
            name: string;
            imageUrl?: string;
        };
        user: ChatUser;
    };
    client: {
        id: number;
        user: ChatUser;
    };
    _count?: {
        messages: number;
    };
}
