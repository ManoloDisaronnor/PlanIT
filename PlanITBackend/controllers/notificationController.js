const Respuesta = require("../utils/respuesta.js");
// Recuperar función de inicialización de modelos
const initModels = require("../models/init-models.js").initModels;
// Crear la instancia de sequelize con la conexión a la base de datos
const sequelize = require("../config/sequelize.js");

const models = initModels(sequelize);
const Notification = models.notification;
const UserNotification = models.userNotification;

class NotificationController {

    async getUserNotifications(req, res) {
        try {
            const userId = req.uid;
            const limit = req.query.limit ? parseInt(req.query.limit) : 10;
            const offset = req.query.offset ? parseInt(req.query.offset) : 0;

            if (!userId) {
                return res.status(400).json(Respuesta.error(null, "Usuario no identificado", "USER_ID_REQUIRED"));
            }

            // Obtener notificaciones para este usuario que sean visibles
            const notificacionesUsuario = await UserNotification.findAll({
                where: {
                    user: userId,
                    visible: true
                },
                include: [{
                    model: Notification,
                    as: 'notification_notification',
                    required: true
                }],
                order: [[{ model: Notification, as: 'notification_notification' }, 'created_at', 'DESC']],
                limit: limit,
                offset: offset
            });

            // Formatear los resultados para el frontend
            const notificaciones = notificacionesUsuario.map(nu => ({
                id: nu.dataValues.id,
                type: nu.dataValues.notification_notification.type,
                entity_id: nu.dataValues.notification_notification.entity_id,
                content: nu.dataValues.notification_notification.content,
                created_at: nu.dataValues.notification_notification.created_at,
                readed: nu.dataValues.readed,
                read_at: nu.dataValues.read_at,
                visible: nu.dataValues.visible
            }));

            return res.json(Respuesta.exito(notificaciones, "Notificaciones obtenidas con éxito"));

        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al obtener notificaciones", "NOTIFICATION_FETCH_ERROR"));
        }
    }

    /**
     * Marca una notificación como leída
     */
    async markAsRead(req, res) {
        try {
            const userId = req.uid;
            const notificationId = req.params.id;

            if (!userId || !notificationId) {
                return res.status(400).json(Respuesta.error(null, "Parámetros incompletos", "PARAMS_REQUIRED"));
            }

            // Buscar la entrada de notificación para este usuario
            const notificacionUsuario = await UserNotification.findOne({
                where: {
                    id: notificationId,
                    user: userId
                }
            });

            if (!notificacionUsuario) {
                return res.status(404).json(Respuesta.error(null, "Notificación no encontrada", "NOTIFICATION_NOT_FOUND"));
            }

            // Actualizar como leída
            await notificacionUsuario.update({
                readed: true,
                read_at: new Date()
            });

            return res.json(Respuesta.exito(null, "Notificación marcada como leída"));

        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al marcar notificación", "NOTIFICATION_UPDATE_ERROR"));
        }
    }

    /**
     * Marca todas las notificaciones del usuario como leídas
     */
    async markAllAsRead(req, res) {
        try {
            const userId = req.uid;

            if (!userId) {
                return res.status(400).json(Respuesta.error(null, "Usuario no identificado", "USER_ID_REQUIRED"));
            }

            // Actualizar todas las notificaciones no leídas
            const result = await UserNotification.update({
                readed: true,
                read_at: new Date()
            }, {
                where: {
                    user: userId,
                    readed: false
                }
            });

            return res.json(Respuesta.exito({ count: result[0] }, "Notificaciones marcadas como leídas"));

        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al marcar notificaciones", "NOTIFICATION_UPDATE_ERROR"));
        }
    }

    /**
     * Oculta una notificación para el usuario
     */
    async hideNotification(req, res) {
        try {
            const userId = req.uid;
            const notificationId = req.params.id;

            if (!userId || !notificationId) {
                return res.status(400).json(Respuesta.error(null, "Parámetros incompletos", "PARAMS_REQUIRED"));
            }

            // Buscar la entrada de notificación para este usuario
            const notificacionUsuario = await UserNotification.findOne({
                where: {
                    id: notificationId,
                    user: userId
                }
            });

            if (!notificacionUsuario) {
                return res.status(404).json(Respuesta.error(null, "Notificación no encontrada", "NOTIFICATION_NOT_FOUND"));
            }

            // Ocultar la notificación
            await notificacionUsuario.update({
                visible: false
            });

            return res.json(Respuesta.exito(null, "Notificación ocultada"));

        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al ocultar notificación", "NOTIFICATION_HIDE_ERROR"));
        }
    }

    async hideGroupNotification(req, res) {
        try {
            const userId = req.uid;
            const groupMemberId = req.params.id;

            if (!userId || !groupMemberId) {
                return res.status(400).json(Respuesta.error(null, "Parámetros incompletos", "PARAMS_REQUIRED"));
            }

            const notification = await Notification.findOne({
                where: {
                    entity_id: groupMemberId,
                },
                attributes: ['id']
            });

            if (!notification) {
                return res.status(404).json(Respuesta.error(null, "Notificación no encontrada", "NOTIFICATION_NOT_FOUND"));
            }

            const notificationId = notification.id;

            // Buscar la entrada de notificación para este usuario
            const notificacionUsuario = await UserNotification.findOne({
                where: {
                    notification: notificationId,
                    user: userId
                }
            });

            if (!notificacionUsuario) {
                return res.status(404).json(Respuesta.error(null, "Notificación no encontrada", "NOTIFICATION_NOT_FOUND"));
            }

            // Ocultar la notificación
            await notificacionUsuario.update({
                readed: true,
                read_at: new Date(),
                visible: false
            });

            return res.json(Respuesta.exito(notificacionUsuario.id, "Notificación ocultada"));

        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al ocultar notificación", "NOTIFICATION_HIDE_ERROR"));
        }
    }

    /**
     * Obtiene el número de notificaciones no leídas
     */
    async getUnreadNotifications(req, res) {
        try {
            const userId = req.uid;

            if (!userId) {
                return res.status(400).json(Respuesta.error(null, "Usuario no identificado", "USER_ID_REQUIRED"));
            }

            // Contar notificaciones no leídas y visibles
            const count = await UserNotification.count({
                where: {
                    user: userId,
                    readed: false,
                    visible: true
                }
            });

            return res.json(Respuesta.exito({ count }, "Conteo de notificaciones no leídas"));

        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al obtener conteo", "NOTIFICATION_COUNT_ERROR"));
        }
    }
}

module.exports = new NotificationController();