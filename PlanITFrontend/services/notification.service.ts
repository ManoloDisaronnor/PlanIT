import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject } from 'rxjs';
import { apiUrl } from '../config/config';

export interface Notification {
    id: number;  // ID de la notificación
    type: 'friendRequest' | 'friendAccepted' | 'friendRejected' | 'groupJoinRequest' | 'groupJoinAccepted';
    entity_id: string;  // ID de la entidad relacionada (request ID, group ID, etc.)
    content: any;  // Datos adicionales
    created_at: Date;
    readed: boolean;  // Si ha sido leída o no
    read_at?: Date;  // Cuándo fue leída
    visible: boolean;  // Si debe mostrarse o no
}

export interface NotificationCount {
    totalCount: number;      // Total de notificaciones
    unreadCount: number;     // Notificaciones no leídas
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private socket: Socket | null = null;
    private apiUrl = apiUrl;
    private userId: string = '';
    private limitNotifications: number = 10; // Límite de notificaciones a cargar
    private offsetNotifications: number = 0; // Offset para paginación
    private loadingMore: boolean = false; // Para controlar múltiples solicitudes
    private hasMoreNotifications: boolean = true; // Para saber si hay más notificaciones disponibles

    // Observables para que los componentes puedan suscribirse
    private notificationsSubject = new BehaviorSubject<Notification[]>([]);
    public notifications$ = this.notificationsSubject.asObservable();

    // Ahora usamos un objeto para mantener los contadores separados
    private notificationCountSubject = new BehaviorSubject<NotificationCount>({
        totalCount: 0,
        unreadCount: 0
    });
    public notificationCount$ = this.notificationCountSubject.asObservable();

    // Observable para indicar si hay carga en progreso
    private loadingSubject = new BehaviorSubject<boolean>(false);
    public loading$ = this.loadingSubject.asObservable();

    // Observable para indicar si hay más notificaciones
    private hasMoreNotificationsSubject = new BehaviorSubject<boolean>(true);
    public hasMoreNotifications$ = this.hasMoreNotificationsSubject.asObservable();

    constructor() { }

    // Conectar al socket y registrar el usuario
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

        // Desconectar si ya existe una conexión
        if (this.socket) {
            this.disconnect();
        }

        this.socket = io(this.apiUrl);

        this.socket.on('connect', () => {
            // Registrar el usuario en el socket
            this.socket?.emit('register', userId);

            // Cargar notificaciones iniciales
            this.loadNotifications(false);

            // Obtener el número total de notificaciones
            this.fetchNotificationCounts();
        });

        // Escuchar nuevas notificaciones
        this.socket.on('notification', (notificationData) => {
            // La notificación ya debe venir con el formato correcto desde el servidor
            const newNotification: Notification = {
                id: notificationData.id,
                type: notificationData.type,
                entity_id: notificationData.entity_id,
                content: notificationData.content,
                created_at: new Date(notificationData.created_at),
                readed: notificationData.readed,
                visible: true
            };

            // Actualizar la lista de notificaciones
            const currentNotifications = this.notificationsSubject.value;

            // Evitar duplicados
            const exists = currentNotifications.some(n => n.id === newNotification.id);

            if (!exists) {
                const updatedNotifications = [newNotification, ...currentNotifications];
                this.notificationsSubject.next(updatedNotifications);

                // Actualizar contador total (incrementar en 1)
                this.updateLocalNotificationCount(1, newNotification.readed ? 0 : 1);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Socket desconectado');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Error de conexión del socket:', error);
        });
    }

    // Método nuevo para obtener los contadores desde el servidor
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
                console.log('Contadores de notificaciones:', data);
                // Actualizar los contadores globales
                this.notificationCountSubject.next({
                    unreadCount: data.datos.count,
                    totalCount: 0
                });

            } else {
                console.error('Error al obtener contadores de notificaciones:', await response.text());
            }
        } catch (error) {
            console.error('Error al obtener contadores de notificaciones:', error);
        }
    }

    // Actualizar los contadores localmente (útil para actualizaciones incrementales)
    private updateLocalNotificationCount(totalDelta: number = 0, unreadDelta: number = 0): void {
        const currentCount = this.notificationCountSubject.value;

        this.notificationCountSubject.next({
            totalCount: currentCount.totalCount + totalDelta,
            unreadCount: currentCount.unreadCount + unreadDelta
        });
    }

    // Actualizar el contador de notificaciones locales (mantener por compatibilidad)
    // Esta función ahora NO actualiza el contador global, solo cuenta las notificaciones visibles
    private updateVisibleNotificationCount(notifications: Notification[]): void {
        const visibleNotifications = notifications.filter(notif => notif.visible);
        const unreadVisibleNotifications = visibleNotifications.filter(notif => !notif.readed);

        // Solo actualizar la información de visualización local
        console.log(`Notificaciones visibles: ${visibleNotifications.length}, No leídas: ${unreadVisibleNotifications.length}`);
    }

    // Cargar notificaciones existentes desde el servidor
    async loadNotifications(append: boolean = false): Promise<void> {
        if (!this.userId || this.loadingMore || !this.hasMoreNotifications) {
            return;
        }

        this.loadingMore = true;
        this.loadingSubject.next(true);

        // Solo resetear notificaciones si no es una carga de "cargar más"
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
                    // Transformar respuestas a formato de notificación
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

                    // Verificar si hay más notificaciones para cargar
                    this.hasMoreNotifications = newNotifications.length === this.limitNotifications;
                    this.hasMoreNotificationsSubject.next(this.hasMoreNotifications);

                    // Si estamos añadiendo más notificaciones, concatenamos con las existentes
                    if (append) {
                        const currentNotifications = this.notificationsSubject.value;

                        // Concatenar evitando duplicados
                        const mergedNotifications = [...currentNotifications];

                        newNotifications.forEach(notification => {
                            if (!mergedNotifications.some(n => n.id === notification.id)) {
                                mergedNotifications.push(notification);
                            }
                        });

                        // Ordenar por fecha, más recientes primero
                        mergedNotifications.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

                        this.notificationsSubject.next(mergedNotifications);
                        this.updateVisibleNotificationCount(mergedNotifications);
                    } else {
                        // Si es carga inicial, simplemente ordenamos y establecemos
                        newNotifications.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
                        this.notificationsSubject.next(newNotifications);
                        this.updateVisibleNotificationCount(newNotifications);
                    }

                    // Actualizar offset para la próxima carga
                    this.offsetNotifications += this.limitNotifications;
                    console.log('Notificaciones cargadas:', newNotifications);
                }
            } else {
                console.error('Error al cargar notificaciones:', await response.text());
            }
        } catch (error) {
            console.error('Error al cargar notificaciones:', error);
        } finally {
            this.loadingMore = false;
            this.loadingSubject.next(false);
        }
    }

    // Método para cargar más notificaciones (usado por el scroll infinito)
    loadMoreNotifications(): void {
        if (!this.loadingMore && this.hasMoreNotifications) {
            this.loadNotifications(true);
        }
    }

    // Aceptar solicitud de amistad
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
                // Actualizar localmente la notificación
                this.updateNotificationStatus(notificationId, 'friendAccepted');
                return true;
            } else {
                console.error('Error al aceptar solicitud de amistad:', await response.text());
                return false;
            }
        } catch (error) {
            console.error('Error al aceptar solicitud de amistad:', error);
            return false;
        }
    }

    // Actualizar localmente el estado de una notificación
    private updateNotificationStatus(notificationId: number, newType: string): void {
        const notifications = this.notificationsSubject.value;
        const updatedNotifications = notifications.map(notif => {
            if (notif.id === notificationId) {
                // Si la notificación no estaba leída antes, actualizamos el contador global
                if (!notif.readed) {
                    this.updateLocalNotificationCount(0, -1); // Reducir el contador de no leídas
                }

                return {
                    ...notif,
                    type: newType as any,
                    readed: true,
                    read_at: new Date()
                };
            }
            return notif;
        });

        this.notificationsSubject.next(updatedNotifications);
        this.updateVisibleNotificationCount(updatedNotifications);
    }

    // Rechazar solicitud de amistad
    async rejectFriendRequest(requestId: number, notificationId: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.apiUrl}api/friends/reject/${requestId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                this.updateNotificationStatus(notificationId, 'friendRejected');
                return true;
            } else {
                console.error('Error al rechazar solicitud de amistad:', await response.text());
                return false;
            }
        } catch (error) {
            console.error('Error al rechazar solicitud de amistad:', error);
            return false;
        }
    }

    // Marcar notificación como leída
    async markAsRead(notificationId: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.apiUrl}api/notifications/markasread/${notificationId}`, {
                method: 'PUT',
                credentials: 'include'
            });

            if (response.ok) {
                // Verificar si la notificación ya estaba leída
                const notifications = this.notificationsSubject.value;
                const targetNotification = notifications.find(n => n.id === notificationId);

                // Solo actualizar el contador global si realmente cambia el estado
                if (targetNotification && !targetNotification.readed) {
                    this.updateLocalNotificationCount(0, -1); // Decrementar no leídas
                }

                // Actualizar la lista de notificaciones localmente
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
                console.error('Error al marcar como leída:', await response.text());
                return false;
            }
        } catch (error) {
            console.error('Error al marcar como leída:', error);
            return false;
        }
    }

    // Marcar todas las notificaciones como leídas
    async markAllAsRead(): Promise<boolean> {
        try {
            const response = await fetch(`${this.apiUrl}api/notifications/read-all`, {
                method: 'PUT',
                credentials: 'include'
            });

            if (response.ok) {
                // Actualizar todas las notificaciones como leídas localmente
                const notifications = this.notificationsSubject.value;
                const updatedNotifications = notifications.map(notif => ({
                    ...notif,
                    readed: true,
                    read_at: new Date()
                }));

                this.notificationsSubject.next(updatedNotifications);

                // Establecer contador de no leídas a 0
                const currentCount = this.notificationCountSubject.value;
                this.notificationCountSubject.next({
                    ...currentCount,
                    unreadCount: 0
                });

                this.updateVisibleNotificationCount(updatedNotifications);
                return true;
            } else {
                console.error('Error al marcar todas como leídas:', await response.text());
                return false;
            }
        } catch (error) {
            console.error('Error al marcar todas como leídas:', error);
            return false;
        }
    }

    // Ocultar notificación
    async hideNotification(notificationId: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.apiUrl}api/notifications/hide/${notificationId}`, {
                method: 'PUT',
                credentials: 'include'
            });

            if (response.ok) {
                // Actualizar el BehaviorSubject local para reflejar el cambio sin necesidad de recargar
                const currentNotifications = this.notificationsSubject.getValue();
                const updatedNotifications = currentNotifications.filter(n => n.id !== notificationId);

                // Actualizar el estado
                this.notificationsSubject.next(updatedNotifications);

                // Actualizar el contador de notificaciones no leídas si la notificación era no leída
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
                console.error('Error al ocultar notificación:', await response.text());
                return false;
            }
        } catch (error) {
            console.error('Error al ocultar notificación:', error);
            return false;
        }
    }

    // Desconectar socket
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            console.log('Socket desconectado manualmente');
        }
    }

    // Reiniciar paginación
    resetPagination(): void {
        this.offsetNotifications = 0;
        this.hasMoreNotifications = true;
        this.hasMoreNotificationsSubject.next(true);
    }
}