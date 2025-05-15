import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject } from 'rxjs';
import { apiUrl } from '../config/config';
import { Howl } from 'howler';
import { GroupMessagesService } from './groups.service';

interface Message {
    id: string;
    type: 'text' | 'image' | 'video' | 'audio';
    content: string;
    sourceUrl?: string;
    featured: boolean;
    readed: boolean;
    read_at?: Date;
    user: any;
    reference?: any;
    reference_deleted?: boolean;
    reference_message?: any;
    datetime: Date;
    visible?: boolean;
    status?: string;
    groups: string;
}

interface MessagesMetadata {
    totalMensajes?: number;
    targetMessageIndex?: number;
    hasMoreRecentMessages?: boolean;
    hasMoreOlderMessages?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class MessagesService {
    private socket: Socket | null = null;
    private apiUrl = apiUrl;
    private userId: string = '';
    private groupId: string = '';
    private limitMessages: number = 20;
    private offsetMessages: number = 0;
    private loadingMore: boolean = false;
    private loadingMessageContext: boolean = false;
    private hasMoreMessages: boolean = true;
    hasMoreRecentMessages: boolean = false;
    hasMoreOlderMessages: boolean = true;
    private noMessagesFound: boolean = false;
    private sound = new Howl({ src: ['audios/chat.mp3'] });
    private metadata: MessagesMetadata = {};
    private _blockAutoLoad: boolean = false;
    private _blockAutoLoadTimeout: any = null;
    private _visibleOffset: number = 0;

    private messagesSubject = new BehaviorSubject<Message[]>([]);
    public messages$ = this.messagesSubject.asObservable();

    private loadingSubject = new BehaviorSubject<boolean>(false);
    public loading$ = this.loadingSubject.asObservable();

    private hasMoreMessagesSubject = new BehaviorSubject<boolean>(true);
    public hasMoreMessages$ = this.hasMoreMessagesSubject.asObservable();

    private hasMoreRecentMessagesSubject = new BehaviorSubject<boolean>(false);
    public hasMoreRecentMessages$ = this.hasMoreRecentMessagesSubject.asObservable();

    private hasMoreOlderMessagesSubject = new BehaviorSubject<boolean>(true);
    public hasMoreOlderMessages$ = this.hasMoreOlderMessagesSubject.asObservable();

    private noMessagesFoundSubject = new BehaviorSubject<boolean>(false);
    public noMessagesFound$ = this.noMessagesFoundSubject.asObservable();

    private lastMessageSubject = new BehaviorSubject<Message | null>(null);
    public lastMessage$ = this.lastMessageSubject.asObservable();

    private unreadCountSubject = new BehaviorSubject<number>(0);
    public unreadCount$ = this.unreadCountSubject.asObservable();

    get isAutoLoadBlocked(): boolean {
        return this._blockAutoLoad;
    }

    constructor(private groupMessagesService: GroupMessagesService) {
        window.addEventListener('click', () => {
            if (Howler.ctx && Howler.ctx.state === 'suspended') {
                Howler.ctx.resume();
            }
        }, { once: true });
    }

    connect(userId: string, groupId: string, initialLimit: number = 20): void {
        if (!userId || !groupId) return;

        this.offsetMessages = 0;
        this.hasMoreMessages = true;
        this.hasMoreMessagesSubject.next(true);
        this.hasMoreRecentMessages = false;
        this.hasMoreRecentMessagesSubject.next(false);
        this.hasMoreOlderMessages = true;
        this.hasMoreOlderMessagesSubject.next(true);
        this.noMessagesFound = false;
        this.noMessagesFoundSubject.next(false);
        this.messagesSubject.next([]);
        this.loadingSubject.next(true);
        this.metadata = {};

        this.userId = userId;
        this.groupId = groupId;
        this.limitMessages = initialLimit;
        this.offsetMessages = 0;

        if (this.socket) {
            this.disconnect();
        }

        this.socket = io(this.apiUrl, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
            this.socket?.emit('register', userId);
            this.socket?.emit('join_group', groupId);
            this.loadMessages(false);
            this.loadLastMessage();
        });

        this.socket.on('chat_message', (message: Message) => {
            if (message.reference?.groups && message.reference.groups !== this.groupId) return;

            const newMessage: Message = {
                id: message.id,
                type: message.type,
                content: message.content,
                sourceUrl: message.sourceUrl,
                featured: message.featured,
                readed: message.user.uid === this.userId ? true : message.readed,
                read_at: message.read_at ? new Date(message.read_at) : undefined,
                reference: message.reference,
                user: {
                    uid: message.user.uid,
                    username: message.user.username,
                    imageUrl: message.user.imageUrl
                },
                reference_message: message.reference_message,
                datetime: new Date(message.datetime),
                groups: message.groups
            };

            if (this.hasMoreRecentMessages) {
                if (message.user.uid !== this.userId) {
                    this.onNewMessage();
                }
                return;
            }

            const currentMessages = this.messagesSubject.value;

            if (!currentMessages.some(m => m.id === newMessage.id)) {
                this.messagesSubject.next([newMessage, ...currentMessages]);
                this.hasMoreRecentMessages = false;
                this.hasMoreRecentMessagesSubject.next(false);
            }

            if (message.user.uid !== this.userId) {
                this.markMessageAsRead(newMessage.id);
                this.onNewMessage();
            }

            this.noMessagesFound = false;
            this.noMessagesFoundSubject.next(false);
        });

        this.socket.on('delete_messages', (message: Message[]) => {
            const currentMessages = this.messagesSubject.value;
            const updatedMessages = currentMessages.map(msg => {
                if (message.some(m => m.id === msg.id)) {
                    return {
                        ...msg,
                        status: 'deleted',
                        visible: false
                    };
                }
                return msg;
            });
            const updatedMessages2 = updatedMessages.map(msg => {
                if (message.some(m => m.id === msg.reference)) {
                    return {
                        ...msg,
                        reference_deleted: true
                    };
                }
                return msg;
            });
            this.messagesSubject.next(updatedMessages2);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
    }

    private onNewMessage() {
        this.sound.play();
    }

    async loadLastMessage(): Promise<void> {
        if (!this.userId || !this.groupId) return;
        try {
            const response = await fetch(`${this.apiUrl}api/mensajes/last/${this.groupId}`, {
                method: 'GET',
                credentials: 'include'
            });
            const data = await response.json();
            if (response.ok) {
                this.lastMessageSubject.next(data.datos);
            } else {
                if (data.codError === 'EMPTY_CHAT') {
                    this.hasMoreMessages = false;
                    this.hasMoreMessagesSubject.next(false);
                    this.hasMoreOlderMessages = false;
                    this.hasMoreOlderMessagesSubject.next(false);
                    this.noMessagesFound = true;
                    this.noMessagesFoundSubject.next(true);
                } else {
                    this.lastMessageSubject.next(null);
                }
            }

        } catch (error) {
            console.error('Error loading last message:', error);
        }
    }

    async loadMessages(append: boolean = false): Promise<void> {
        if (!this.userId || this.loadingMore || (!this.hasMoreMessages && !append)) {
            return;
        }

        this.loadingMore = true;
        this.loadingSubject.next(true);

        if (!append) {
            this.offsetMessages = 0;
            this.messagesSubject.next([]);
        }

        try {
            const response = await fetch(`${this.apiUrl}api/mensajes/${this.groupId}?limit=${this.limitMessages}&offset=${this.offsetMessages}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                this.noMessagesFound = false;
                this.noMessagesFoundSubject.next(false);
                const result = await response.json();

                if (result.ok) {
                    if (result.datos.length === 0) {
                        this.hasMoreMessages = false;
                        this.hasMoreMessagesSubject.next(false);
                        this.hasMoreOlderMessages = false;
                        this.hasMoreOlderMessagesSubject.next(false);
                    } else {
                        const newMessages: Message[] = result.datos.map((item: any) => ({
                            id: item.id,
                            type: item.type,
                            content: item.content,
                            sourceUrl: item.sourceUrl,
                            featured: item.messages_users[0].featured,
                            readed: item.messages_users[0].readed,
                            read_at: item.messages_users[0].read_at ? new Date(item.messages_users[0].read_at) : null,
                            reference: item.reference,
                            reference_deleted: item.reference_deleted,
                            user: {
                                uid: item.user,
                                username: item.user_user.username,
                                imageUrl: item.user_user.imageUrl,
                            },
                            reference_message: item.reference_message,
                            datetime: new Date(item.datetime),
                            groups: item.groups
                        }));

                        this.hasMoreMessages = newMessages.length === this.limitMessages;
                        this.hasMoreMessagesSubject.next(this.hasMoreMessages);
                        this.hasMoreOlderMessages = this.hasMoreMessages;
                        this.hasMoreOlderMessagesSubject.next(this.hasMoreOlderMessages);

                        if (append) {
                            const currentMessage = this.messagesSubject.value;

                            const mergedMessages = [...currentMessage];

                            newMessages.forEach(message => {
                                if (!mergedMessages.some(n => n.id === message.id)) {
                                    mergedMessages.push(message);
                                }
                            });

                            mergedMessages.sort((a, b) => b.datetime.getTime() - a.datetime.getTime());

                            this.messagesSubject.next(mergedMessages);
                            this.markVisibleMessagesAsRead(mergedMessages);
                        } else {
                            newMessages.sort((a, b) => b.datetime.getTime() - a.datetime.getTime());
                            this.messagesSubject.next(newMessages);
                            this.markVisibleMessagesAsRead(newMessages);
                            this.hasMoreRecentMessages = false;
                            this.hasMoreRecentMessagesSubject.next(false);
                        }

                        this.offsetMessages += this.limitMessages;
                    }
                }
            } else {
                const datos = await response.json();
                if (datos.codError === 'EMPTY_CHAT') {
                    this.hasMoreMessages = false;
                    this.hasMoreMessagesSubject.next(false);
                    this.hasMoreOlderMessages = false;
                    this.hasMoreOlderMessagesSubject.next(false);
                    this.noMessagesFound = true;
                    this.noMessagesFoundSubject.next(true);
                } else {
                    console.error('Error loading messages:', datos.mensaje);
                }
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            this.loadingMore = false;
            this.loadingSubject.next(false);
        }
    }

    async loadMessageContext(messageId: string): Promise<{ success: boolean, messageIndex: number }> {
        if (!this.userId || !this.groupId || this.loadingMessageContext) {
            return { success: false, messageIndex: -1 };
        }

        this.loadingMessageContext = true;
        this.loadingSubject.next(true);

        try {
            const response = await fetch(`${this.apiUrl}api/mensajes/${this.groupId}?messageId=${messageId}&contextSize=20`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();

                if (result.ok && result.datos && result.datos.mensajes) {
                    const { mensajes, metadata } = result.datos;

                    if (!mensajes || mensajes.length === 0) {
                        console.error("No se encontraron mensajes para el contexto");
                        return { success: false, messageIndex: -1 };
                    }
                    const newMessages: Message[] = mensajes.map((item: any) => ({
                        id: item.id,
                        type: item.type,
                        content: item.content,
                        sourceUrl: item.sourceUrl,
                        featured: item.messages_users[0]?.featured || false,
                        readed: item.messages_users[0]?.readed || false,
                        read_at: item.messages_users[0]?.read_at ? new Date(item.messages_users[0].read_at) : null,
                        reference: item.reference,
                        reference_deleted: item.reference_deleted,
                        user: {
                            uid: item.user,
                            username: item.user_user.username,
                            imageUrl: item.user_user.imageUrl,
                        },
                        reference_message: item.reference_message,
                        datetime: new Date(item.datetime),
                        groups: item.groups
                    }));
                    newMessages.sort((a, b) => b.datetime.getTime() - a.datetime.getTime());
                    this._visibleOffset = 0;
                    if (metadata && metadata.targetMessageIndex !== undefined) {
                        this._visibleOffset = metadata.targetMessageIndex;
                    }
                    this.hasMoreRecentMessages = !!metadata?.hasMoreRecentMessages;
                    this.hasMoreOlderMessages = !!metadata?.hasMoreOlderMessages;
                    this.hasMoreMessages = this.hasMoreOlderMessages;
                    this.hasMoreMessagesSubject.next(this.hasMoreOlderMessages);
                    this.hasMoreRecentMessagesSubject.next(this.hasMoreRecentMessages);
                    this._blockAutoLoad = true;
                    clearTimeout(this._blockAutoLoadTimeout);
                    this.messagesSubject.next(newMessages);
                    this.markVisibleMessagesAsRead(newMessages);
                    const targetIndex = newMessages.findIndex(msg => msg.id === messageId);
                    this._blockAutoLoadTimeout = setTimeout(() => {
                        this._blockAutoLoad = false;
                    }, 200);

                    return { success: true, messageIndex: targetIndex };
                }
                return { success: false, messageIndex: -1 };
            }
            return { success: false, messageIndex: -1 };
        } catch (error) {
            console.error('Error loading message context:', error);
            return { success: false, messageIndex: -1 };
        } finally {
            this.loadingMessageContext = false;
            this.loadingSubject.next(false);
        }
    }

    async loadMoreRecentMessages(): Promise<void> {
        if (this._blockAutoLoad || !this.userId || this.loadingMore || !this.hasMoreRecentMessages) return;

        this.loadingMore = true;
        this.loadingSubject.next(true);

        try {
            const currentMessages = this.messagesSubject.value;
            if (currentMessages.length === 0) {
                this.loadingMore = false;
                this.loadingSubject.next(false);
                return;
            }

            let mostRecentMessage = currentMessages.reduce((prev, current) =>
                (prev.datetime > current.datetime) ? prev : current
            );

            const response = await fetch(
                `${this.apiUrl}api/mensajes/recent/${this.groupId}?limit=${this.limitMessages}&afterDate=${mostRecentMessage.datetime.toISOString()}`,
                {
                    method: 'GET',
                    credentials: 'include'
                }
            );

            if (response.ok) {
                const result = await response.json();

                if (result.ok) {
                    if (!result.datos || result.datos.length === 0) {
                        this.hasMoreRecentMessages = false;
                        this.hasMoreRecentMessagesSubject.next(false);
                    } else {
                        const newMessages: Message[] = result.datos.map((item: any) => ({
                            id: item.id,
                            type: item.type,
                            content: item.content,
                            sourceUrl: item.sourceUrl,
                            featured: item.messages_users[0]?.featured || false,
                            readed: item.messages_users[0]?.readed || false,
                            read_at: item.messages_users[0]?.read_at ? new Date(item.messages_users[0].read_at) : null,
                            reference: item.reference,
                            reference_deleted: item.reference_deleted,
                            user: {
                                uid: item.user,
                                username: item.user_user.username,
                                imageUrl: item.user_user.imageUrl,
                            },
                            reference_message: item.reference_message,
                            datetime: new Date(item.datetime),
                            groups: item.groups
                        }));

                        this.hasMoreRecentMessages = newMessages.length === this.limitMessages;
                        this.hasMoreRecentMessagesSubject.next(this.hasMoreRecentMessages);

                        const mergedMessages = [...currentMessages];
                        let newMessagesAdded = 0;
                        newMessages.forEach(message => {
                            if (!mergedMessages.some(m => m.id === message.id)) {
                                mergedMessages.push(message);
                                newMessagesAdded++;
                            }
                        });

                        if (newMessagesAdded === 0) {
                            this.hasMoreRecentMessages = false;
                            this.hasMoreRecentMessagesSubject.next(false);
                        }

                        mergedMessages.sort((a, b) => b.datetime.getTime() - a.datetime.getTime());
                        this.messagesSubject.next(mergedMessages);
                        this.markVisibleMessagesAsRead(newMessages);

                        if (newMessagesAdded > 0) {
                            this._blockAutoLoad = true;
                            setTimeout(() => {
                                this._blockAutoLoad = false;
                            }, 500);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error loading more recent messages:', error);
        } finally {
            this.loadingMore = false;
            this.loadingSubject.next(false);
        }
    }

    markVisibleMessagesAsRead(messages: Message[], isUserAtBottom: boolean = false): void {
        const unreadMessages = messages.filter(
            msg => !msg.readed && msg.user.uid !== this.userId
        );

        if (unreadMessages.length > 0) {
            unreadMessages.forEach(message => {
                this.markMessageAsRead(message.id);
            });
        }

        if (isUserAtBottom && this.groupId) {
            this.groupMessagesService.markGroupAsRead(this.groupId);
        } else {
            this.socket?.emit('reload_unread_counts');
        }
    }

    private async markMessageAsRead(messageId: string): Promise<void> {
        try {
            const response = await fetch(`${this.apiUrl}api/mensajes/read/${messageId}`, {
                method: 'PUT',
                credentials: 'include'
            });

            if (response.ok) {
                const currentMessages = this.messagesSubject.value;
                const updatedMessages = currentMessages.map(message => {
                    if (message.id === messageId) {
                        return {
                            ...message,
                            readed: true,
                            read_at: new Date()
                        };
                    }
                    return message;
                });

                this.messagesSubject.next(updatedMessages);
            }
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    }

    markMessagesAsReadAtBottom(groupId: string): void {
        if (this.hasMoreRecentMessages) return;
        
        this.groupMessagesService.markGroupAsRead(groupId);
    }

    async sendMessage(formData: FormData, temporalMessage: any): Promise<boolean> {
        if (!this.socket || !this.userId || !this.groupId) return false;

        let currentMessages = this.messagesSubject.value;
        if (!this.hasMoreRecentMessages) {
            this.messagesSubject.next([temporalMessage, ...currentMessages]);
        }

        try {
            const response = await fetch(`${this.apiUrl}api/mensajes/send/${this.groupId}`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error sending message:', errorData);
                throw new Error(errorData.mensaje || 'Error sending message');
            }

            const ok = response.ok;
            if (!this.hasMoreRecentMessages) {
                currentMessages = this.messagesSubject.value;
                currentMessages = currentMessages.filter(message => message.id !== temporalMessage.id);
                this.messagesSubject.next(currentMessages);
            }
            return ok;
        } catch (error: any) {
            console.error('Error sending message:', error.message);
            throw error;
        }
    }

    async featureMessage(message: any): Promise<void> {
        if (!this.socket || !this.userId || !this.groupId) return;
        try {
            const response = await fetch(`${this.apiUrl}api/mensajes/feature/${this.groupId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: message.id,
                    featured: message.featured
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error featuring message:', errorData);
                throw new Error(errorData.mensaje || 'Error featuring message');
            }

            const currentMessages = this.messagesSubject.value;
            const updatedMessages = currentMessages.map(msg => {
                if (msg.id === message.id) {
                    return {
                        ...msg,
                        featured: !msg.featured
                    };
                }
                return msg;
            });
            this.messagesSubject.next(updatedMessages);

        } catch (error) {
            console.error('Error featuring message:', error);
        }
    }

    async deleteMessages(messages: any[]): Promise<any> {
        if (!this.socket || !this.userId || !this.groupId) return;
        try {
            const response = await fetch(`${this.apiUrl}api/mensajes/delete/${this.groupId}`, {
                method: 'DELETE',
                credentials: 'include',
                body: JSON.stringify(messages),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const data = await response.json();
                if (data.codError === 'NO_TIENES_PERMISOS') {
                    return {
                        ok: false,
                        adminError: true
                    };
                }
                const errorData = await response.json();
                console.error('Error deleting messages:', errorData);
                throw new Error(errorData.mensaje || 'Error deleting messages');
            }

            return {
                ok: true
            };
        } catch (error) {
            console.error('Error deleting messages:', error);
            return {
                ok: false,
                error
            };
        }
    }

    async loadMoreMessages(): Promise<void> {
        if (!this.userId || this.loadingMore || !this.hasMoreOlderMessages) return;

        this.loadingMore = true;
        this.loadingSubject.next(true);

        try {
            const currentMessages = this.messagesSubject.value;
            if (currentMessages.length === 0) {
                this.loadingMore = false;
                this.loadingSubject.next(false);
                return;
            }

            let oldestMessage = currentMessages[0];
            for (const message of currentMessages) {
                if (message.datetime < oldestMessage.datetime) {
                    oldestMessage = message;
                }
            }

            const response = await fetch(
                `${this.apiUrl}api/mensajes/${this.groupId}/before?limit=${this.limitMessages}&beforeDate=${oldestMessage.datetime.toISOString()}`,
                {
                    method: 'GET',
                    credentials: 'include'
                }
            );

            if (response.ok) {
                const result = await response.json();

                if (result.ok) {
                    if (!result.datos || result.datos.length === 0) {
                        this.hasMoreOlderMessages = false;
                        this.hasMoreMessagesSubject.next(false);
                    } else {
                        const newMessages: Message[] = result.datos.map((item: any) => ({
                            id: item.id,
                            type: item.type,
                            content: item.content,
                            sourceUrl: item.sourceUrl,
                            featured: item.messages_users[0]?.featured || false,
                            readed: item.messages_users[0]?.readed || false,
                            read_at: item.messages_users[0]?.read_at ? new Date(item.messages_users[0].read_at) : null,
                            reference: item.reference,
                            reference_deleted: item.reference_deleted,
                            user: {
                                uid: item.user,
                                username: item.user_user.username,
                                imageUrl: item.user_user.imageUrl,
                            },
                            reference_message: item.reference_message,
                            datetime: new Date(item.datetime),
                            groups: item.groups
                        }));
                        this._visibleOffset += newMessages.length;
                        this.hasMoreOlderMessages = newMessages.length === this.limitMessages;
                        this.hasMoreMessagesSubject.next(this.hasMoreOlderMessages);
                        const mergedMessages = [...currentMessages];
                        let messagesAdded = 0;

                        newMessages.forEach(message => {
                            if (!mergedMessages.some(m => m.id === message.id)) {
                                mergedMessages.push(message);
                                messagesAdded++;
                            }
                        });
                        mergedMessages.sort((a, b) => b.datetime.getTime() - a.datetime.getTime());
                        this.messagesSubject.next(mergedMessages);
                        this.markVisibleMessagesAsRead(newMessages);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading more older messages:', error);
        } finally {
            this.loadingMore = false;
            this.loadingSubject.next(false);
        }
    }

    async getUnreadNotifications(): Promise<any> {
        try {
            const response = await fetch(`${this.apiUrl}api/mensajes/unread`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Error fetching unread notifications');
            }

            const data = await response.json();
            return data.datos;
        } catch (error) {
            console.error('Error getting unread notifications:', error);
            throw error;
        }
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        this.messagesSubject.next([]);
        this.loadingSubject.next(false);
        this.hasMoreMessagesSubject.next(true);
        this.hasMoreRecentMessagesSubject.next(false);
        this.hasMoreOlderMessagesSubject.next(true);
        this.noMessagesFoundSubject.next(false);
        this.offsetMessages = 0;
        this.metadata = {};
    }

    resetPagination(): void {
        this.offsetMessages = 0;
        this.hasMoreMessages = true;
        this.hasMoreMessagesSubject.next(true);
        this.hasMoreOlderMessages = true;
        this.hasMoreOlderMessagesSubject.next(true);
        this.hasMoreRecentMessages = false;
        this.hasMoreRecentMessagesSubject.next(false);
    }
}