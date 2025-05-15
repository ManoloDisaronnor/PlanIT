import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject } from 'rxjs';
import { apiUrl } from '../config/config';

export interface Notification {
    id: number;
    type: 'friendRequest' | 'groupRequest';
    entity_id: string;
    content: any;
    created_at: Date;
    readed: boolean;
    read_at?: Date;
    visible: boolean;
}

export interface NotificationCount {
    totalCount: number;
    unreadCount: number;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private socket: Socket | null = null;
    private apiUrl = apiUrl;
    private userId: string = '';
    private limitNotifications: number = 10;
    private offsetNotifications: number = 0;
    private loadingMore: boolean = false;
    private hasMoreNotifications: boolean = true;
    private sound = new Howl({ src: ['audios/notification.mp3'] });

    private notificationsSubject = new BehaviorSubject<Notification[]>([]);
    public notifications$ = this.notificationsSubject.asObservable();

    private notificationCountSubject = new BehaviorSubject<NotificationCount>({
        totalCount: 0,
        unreadCount: 0
    });
    public notificationCount$ = this.notificationCountSubject.asObservable();

    private loadingSubject = new BehaviorSubject<boolean>(false);
    public loading$ = this.loadingSubject.asObservable();

    private hasMoreNotificationsSubject = new BehaviorSubject<boolean>(true);
    public hasMoreNotifications$ = this.hasMoreNotificationsSubject.asObservable();

    constructor() {
        window.addEventListener('click', () => {
            if (Howler.ctx && Howler.ctx.state === 'suspended') {
                Howler.ctx.resume();
            }
        }, { once: true });
    }

    connect(userId: string, initialLimit: number = 10): void {
        if (!userId) {
            console.error('Se intentó conectar sin ID de usuario');
            return;
        }

        this.userId = userId;
        this.limitNotifications = initialLimit;
        this.offsetNotifications = 0;
        this.hasMoreNotifications = true;
        this.hasMoreNotificationsSubject.next(true);

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
            this.loadNotifications(false);
            this.fetchNotificationCounts();
        });

        this.socket.on('notification', (notificationData) => {
            const newNotification: Notification = {
                id: notificationData.id,
                type: notificationData.type,
                entity_id: notificationData.entity_id,
                content: notificationData.content,
                created_at: new Date(notificationData.created_at),
                readed: notificationData.readed,
                visible: true
            };

            const currentNotifications = this.notificationsSubject.value;

            const exists = currentNotifications.some(n => n.id === newNotification.id);

            if (!exists) {
                if (!newNotification.readed) {
                    this.onNewUnreadNotification();
                }
                const updatedNotifications = [newNotification, ...currentNotifications];
                this.notificationsSubject.next(updatedNotifications);

                this.updateLocalNotificationCount(1, newNotification.readed ? 0 : 1);
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('Error de conexión del socket:', error);
        });
    }

    private onNewUnreadNotification() {
        this.sound.play();
    }

    async fetchNotificationCounts(): Promise<void> {
        if (!this.userId) {
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}api/notifications/getunread`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.notificationCountSubject.next({
                    unreadCount: data.datos.count,
                    totalCount: 0
                });

            } else {
                const datos = await response.json();
                console.error('Error al obtener contadores de notificaciones:', datos.mensaje);
            }
        } catch (error) {
            console.error('Error al obtener contadores de notificaciones:', error);
        }
    }

    private updateLocalNotificationCount(totalDelta: number = 0, unreadDelta: number = 0): void {
        const currentCount = this.notificationCountSubject.value;

        this.notificationCountSubject.next({
            totalCount: currentCount.totalCount + totalDelta,
            unreadCount: currentCount.unreadCount + unreadDelta
        });
    }

    private updateVisibleNotificationCount(notifications: Notification[]): void {
        const visibleNotifications = notifications.filter(notif => notif.visible);
        const unreadVisibleNotifications = visibleNotifications.filter(notif => !notif.readed);
    }

    async loadNotifications(append: boolean = false): Promise<void> {
        if (!this.userId || this.loadingMore || !this.hasMoreNotifications) {
            return;
        }

        this.loadingMore = true;
        this.loadingSubject.next(true);

        if (!append) {
            this.offsetNotifications = 0;
            this.notificationsSubject.next([]);
        }

        try {
            const response = await fetch(`${this.apiUrl}api/notifications?limit=${this.limitNotifications}&offset=${this.offsetNotifications}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();

                if (result.ok) {
                    const newNotifications: Notification[] = result.datos.map((item: any) => ({
                        id: item.id,
                        type: item.type,
                        entity_id: item.entity_id,
                        content: item.content,
                        created_at: new Date(item.created_at),
                        readed: item.readed,
                        read_at: item.read_at ? new Date(item.read_at) : undefined,
                        visible: item.visible
                    }));

                    this.hasMoreNotifications = newNotifications.length === this.limitNotifications;
                    this.hasMoreNotificationsSubject.next(this.hasMoreNotifications);

                    if (append) {
                        const currentNotifications = this.notificationsSubject.value;

                        const mergedNotifications = [...currentNotifications];

                        newNotifications.forEach(notification => {
                            if (!mergedNotifications.some(n => n.id === notification.id)) {
                                mergedNotifications.push(notification);
                            }
                        });

                        mergedNotifications.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

                        this.notificationsSubject.next(mergedNotifications);
                        this.updateVisibleNotificationCount(mergedNotifications);
                    } else {
                        newNotifications.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
                        this.notificationsSubject.next(newNotifications);
                        this.updateVisibleNotificationCount(newNotifications);
                    }

                    this.offsetNotifications += this.limitNotifications;
                }
            } else {
                const datos = await response.json();
                console.error('Error al cargar notificaciones:', datos.mensaje);
            }
        } catch (error) {
            console.error('Error al cargar notificaciones:', error);
        } finally {
            this.loadingMore = false;
            this.loadingSubject.next(false);
        }
    }

    loadMoreNotifications(): void {
        if (!this.loadingMore && this.hasMoreNotifications) {
            this.loadNotifications(true);
        }
    }

    async acceptFriendRequest(notificationId: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.apiUrl}api/friends/accept/${notificationId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.updateHideNotification(notificationId);
                return true;
            } else {
                const datos = await response.json();
                console.error('Error al aceptar solicitud de amistad: ', datos.mensaje);
                return false;
            }
        } catch (error) {
            console.error('Error al aceptar solicitud de amistad:', error);
            return false;
        }
    }

    async acceptGroupRequest(notificationId: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.apiUrl}api/grupos/acceptnotification/${notificationId}`, {
                method: 'PUT',
                credentials: 'include'
            });

            if (response.ok) {
                this.updateHideNotification(notificationId);
                return true;
            } else {
                const datos = await response.json();
                console.error('Error al aceptar solicitud de grupo: ', datos.mensaje);
                return false;
            }
        } catch (error) {
            console.error('Error al aceptar solicitud de amistad:', error);
            return false;
        }
    }

    async rejectGroupRequest(notificationId: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.apiUrl}api/grupos/rejectnotification/${notificationId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                this.updateHideNotification(notificationId);
                return true;
            } else {
                const datos = await response.json();
                console.error('Error al rechazar solicitud de grupo: ', datos.mensaje);
                return false;
            }
        } catch (error) {
            console.error('Error al rechazar solicitud de grupo:', error);
            return false;
        }
    }


    // DE MOMENTO NO SE USA, FUNCION PARA CAMBIAR EL TIPO DE NOTIFICACION
    // private updateNotificationStatus(notificationId: number, newType: string): void {
    //     const notifications = this.notificationsSubject.value;
    //     const updatedNotifications = notifications.map(notif => {
    //         if (notif.id === notificationId) {
    //             if (!notif.readed) {
    //                 this.updateLocalNotificationCount(0, -1);
    //             }

    //             return {
    //                 ...notif,
    //                 type: newType as any,
    //                 readed: true,
    //                 read_at: new Date()
    //             };
    //         }
    //         return notif;
    //     });

    //     this.notificationsSubject.next(updatedNotifications);
    //     this.updateVisibleNotificationCount(updatedNotifications);
    // }

    private updateHideNotification(notificationId: number): void {
        const notifications = this.notificationsSubject.value;
        const updatedNotifications = notifications.map(notif => {
            if (notif.id === notificationId) {
                if (!notif.readed) {
                    this.updateLocalNotificationCount(0, -1);
                }

                return {
                    ...notif,
                    readed: true,
                    read_at: new Date(),
                    visible: false
                };
            }
            return notif;
        });
        this.notificationsSubject.next(updatedNotifications);
        this.updateVisibleNotificationCount(updatedNotifications);
    }

    async rejectFriendRequest(requestId: number, notificationId: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.apiUrl}api/friends/reject/${requestId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                this.updateHideNotification(notificationId);
                return true;
            } else {
                const datos = await response.json();
                console.error('Error al rechazar solicitud de amistad: ', datos.mensaje);
                return false;
            }
        } catch (error) {
            console.error('Error al rechazar solicitud de amistad:', error);
            return false;
        }
    }

    async markAsRead(notificationId: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.apiUrl}api/notifications/markasread/${notificationId}`, {
                method: 'PUT',
                credentials: 'include'
            });

            if (response.ok) {
                const notifications = this.notificationsSubject.value;
                const targetNotification = notifications.find(n => n.id === notificationId);
                if (targetNotification && !targetNotification.readed) {
                    this.updateLocalNotificationCount(0, -1);
                }
                const updatedNotifications = notifications.map(notif => {
                    if (notif.id === notificationId) {
                        return {
                            ...notif,
                            readed: true,
                            read_at: new Date()
                        };
                    }
                    return notif;
                });

                this.notificationsSubject.next(updatedNotifications);
                this.updateVisibleNotificationCount(updatedNotifications);
                return true;
            } else {
                const datos = await response.json();
                console.error('Error al marcar como leída: ', datos.mensaje);
                return false;
            }
        } catch (error) {
            console.error('Error al marcar como leída:', error);
            return false;
        }
    }

    async markAllAsRead(): Promise<boolean> {
        try {
            const response = await fetch(`${this.apiUrl}api/notifications/read-all`, {
                method: 'PUT',
                credentials: 'include'
            });

            if (response.ok) {
                const notifications = this.notificationsSubject.value;
                const updatedNotifications = notifications.map(notif => ({
                    ...notif,
                    readed: true,
                    read_at: new Date()
                }));

                this.notificationsSubject.next(updatedNotifications);
                const currentCount = this.notificationCountSubject.value;
                this.notificationCountSubject.next({
                    ...currentCount,
                    unreadCount: 0
                });

                this.updateVisibleNotificationCount(updatedNotifications);
                return true;
            } else {
                const datos = await response.json();
                console.error('Error al marcar todas como leídas: ', datos.mensaje);
                return false;
            }
        } catch (error) {
            console.error('Error al marcar todas como leídas:', error);
            return false;
        }
    }

    async hideNotification(notificationId: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.apiUrl}api/notifications/hide/${notificationId}`, {
                method: 'PUT',
                credentials: 'include'
            });

            if (response.ok) {
                const currentNotifications = this.notificationsSubject.getValue();
                const updatedNotifications = currentNotifications.filter(n => n.id !== notificationId);

                this.notificationsSubject.next(updatedNotifications);
                const removedNotification = currentNotifications.find(n => n.id === notificationId);
                if (removedNotification && !removedNotification.readed) {
                    const currentCount = this.notificationCountSubject.getValue();
                    this.notificationCountSubject.next({
                        ...currentCount,
                        unreadCount: Math.max(0, currentCount.unreadCount - 1)
                    });
                }

                return true;
            } else {
                const datos = await response.json();
                console.error('Error al ocultar notificación: ', datos.mensaje);
                return false;
            }
        } catch (error) {
            console.error('Error al ocultar notificación:', error);
            return false;
        }
    }

    async hideNotificationFromEntityGroup(groupMemberId: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.apiUrl}api/notifications/hidegroup/${groupMemberId}`, {
                method: 'PUT',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                const notificationId = data.datos;
                const currentNotifications = this.notificationsSubject.getValue();
                const updatedNotifications = currentNotifications.filter(n => n.id !== notificationId);

                this.notificationsSubject.next(updatedNotifications);
                const removedNotification = currentNotifications.find(n => n.id === notificationId);
                if (removedNotification && !removedNotification.readed) {
                    const currentCount = this.notificationCountSubject.getValue();
                    this.notificationCountSubject.next({
                        ...currentCount,
                        unreadCount: Math.max(0, currentCount.unreadCount - 1)
                    });
                }

                return true;
            } else {
                const datos = await response.json();
                console.error('Error al ocultar notificación: ', datos.mensaje);
                return false;
            }
        } catch (error) {
            console.error('Error al ocultar notificación:', error);
            return false;
        }
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    resetPagination(): void {
        this.offsetNotifications = 0;
        this.hasMoreNotifications = true;
        this.hasMoreNotificationsSubject.next(true);
    }
}