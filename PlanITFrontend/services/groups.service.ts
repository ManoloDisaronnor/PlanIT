import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { apiUrl } from '../config/config';

interface LastMessage {
    id: string;
    type: 'text' | 'image' | 'video' | 'audio';
    content: string;
    groups: string;
    user_user: {
        username: string;
    };
    datetime: Date;
}

interface UnreadCountsMap {
    [groupId: string]: BehaviorSubject<number>;
}

@Injectable({
    providedIn: 'root'
})
export class GroupMessagesService {
    private socket: Socket | null = null;
    private apiUrl = apiUrl;
    private userId: string = '';
    private lastMessagesMap = new Map<string, BehaviorSubject<LastMessage | null>>();
    private isConnected = false;

    private unreadCountsMap: UnreadCountsMap = {};

    constructor() { }

    connect(userId: string): void {
        if (this.isConnected || !userId) return;

        this.userId = userId;

        this.socket = io(this.apiUrl, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
            this.socket?.emit('register', userId);
            this.isConnected = true;
            this.loadUnreadCounts();
        });

        this.socket.on('chat_message', (message: any) => {
            if (!message.groups) return;

            const groupId = message.groups;
            this.updateLastMessage(groupId, {
                id: message.id,
                type: message.type,
                content: message.content,
                groups: message.groups,
                user_user: {
                    username: message.user.username,
                },
                datetime: message.datetime,
            });

            if (message.user.uid !== this.userId) {
                this.incrementUnreadCount(groupId);
            }
        });

        this.socket.on('reload_unread_counts', () => {
            this.loadUnreadCounts();
        });

        this.socket.on('delete_messages', (messages: any[]) => {
            messages.forEach(message => {
                if (message.groups) {
                    const groupId = message.groups;
                    const currentLastMessage = this.lastMessagesMap.get(groupId)?.getValue();

                    if (currentLastMessage && currentLastMessage.id === message.id) {
                        this.loadLastMessage(groupId);
                    }
                }
            });
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
    }

    getLastMessage(groupId: string): Observable<LastMessage | null> {
        if (!this.lastMessagesMap.has(groupId)) {
            this.lastMessagesMap.set(groupId, new BehaviorSubject<LastMessage | null>(null));
            this.loadLastMessage(groupId);
        }

        return this.lastMessagesMap.get(groupId)!.asObservable();
    }

    joinGroup(groupId: string): void {
        if (!this.socket || !this.isConnected) {
            setTimeout(() => this.joinGroup(groupId), 1000);
            return;
        }

        this.socket.emit('join_group', groupId);

        if (!this.lastMessagesMap.has(groupId)) {
            this.lastMessagesMap.set(groupId, new BehaviorSubject<LastMessage | null>(null));
        }

        this.loadLastMessage(groupId);

        if (!this.unreadCountsMap[groupId]) {
            this.unreadCountsMap[groupId] = new BehaviorSubject<number>(0);
        }
    }

    async loadLastMessage(groupId: string): Promise<void> {
        if (!this.userId || !groupId) return;

        try {
            const response = await fetch(`${this.apiUrl}api/mensajes/last/${groupId}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                const message = data.datos;

                if (message) {
                    this.updateLastMessage(groupId, {
                        id: message.id,
                        type: message.type,
                        content: message.content,
                        groups: message.groups,
                        user_user: {
                            username: message.user_user.username,
                        },
                        datetime: message.datetime,
                    });
                }
            }
        } catch (error) {
            console.error('Error loading last message:', error);
        }
    }

    private updateLastMessage(groupId: string, message: LastMessage | null): void {
        if (!this.lastMessagesMap.has(groupId)) {
            this.lastMessagesMap.set(groupId, new BehaviorSubject<LastMessage | null>(message));
        } else if (message) {
            this.lastMessagesMap.get(groupId)!.next(message);
        } else {
            this.lastMessagesMap.get(groupId)!.next(null);
        }
    }

    async loadUnreadCounts(): Promise<void> {
        try {
            const response = await fetch(`${this.apiUrl}api/mensajes/unread`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();

                if (data.datos && Array.isArray(data.datos)) {
                    data.datos.forEach((item: any) => {
                        if (item.groups && typeof item.unreadCount === 'number') {
                            this.updateUnreadCount(item.groups, item.unreadCount);
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error loading unread message counts:', error);
        }
    }

    private incrementUnreadCount(groupId: string): void {
        if (!this.unreadCountsMap[groupId]) {
            this.unreadCountsMap[groupId] = new BehaviorSubject<number>(1);
        } else {
            const currentCount = this.unreadCountsMap[groupId].getValue();
            this.unreadCountsMap[groupId].next(currentCount + 1);
        }
    }

    private updateUnreadCount(groupId: string, count: number): void {
        if (!this.unreadCountsMap[groupId]) {
            this.unreadCountsMap[groupId] = new BehaviorSubject<number>(count);
        } else {
            this.unreadCountsMap[groupId].next(count);
        }
    }

    markGroupAsRead(groupId: string): void {
        if (this.unreadCountsMap[groupId]) {
            this.unreadCountsMap[groupId].next(0);

            this.markMessagesAsReadInBackend(groupId);
        }
    }

    private async markMessagesAsReadInBackend(groupId: string): Promise<void> {
        try {
            const response = await fetch(`${this.apiUrl}api/mensajes/read-all/${groupId}`, {
                method: 'PUT',
                credentials: 'include'
            });

            if (response.ok) {
                this.socket?.emit('reload_unread_counts');
            }
        } catch (error) {
            console.error(`Error marking messages as read for group ${groupId}:`, error);
        }
    }

    getUnreadCountForGroup(groupId: string): Observable<number> {
        if (!this.unreadCountsMap[groupId]) {
            this.unreadCountsMap[groupId] = new BehaviorSubject<number>(0);
        }
        return this.unreadCountsMap[groupId].asObservable();
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        this.isConnected = false;
        this.lastMessagesMap.clear();
        this.unreadCountsMap = {};
    }

    leaveGroup(groupId: string): void {
        if (this.socket && this.isConnected) {
            this.socket.emit('leave_group', groupId);
        }
        this.lastMessagesMap.delete(groupId);
        if (this.unreadCountsMap[groupId]) {
            delete this.unreadCountsMap[groupId];
        }
    }
}