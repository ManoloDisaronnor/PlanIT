const { Server } = require('socket.io');
const mensajeController = require('../controllers/mensajeController.js');
const initModels = require("../models/init-models.js").initModels;
// Crear la instancia de sequelize con la conexión a la base de datos
const sequelize = require("../config/sequelize.js");

const models = initModels(sequelize);
const Notification = models.notification;
const UserNotification = models.userNotification;

// Variables para almacenar las referencias globales
let io;
let userSockets = new Map();

function setupSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.NODE_ENV === 'development' ? 'http://192.168.0.32:4200' : '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        // El cliente se identifica con su userId
        socket.on('register', (userId) => {

            // Almacenar la asociación de usuario a socket
            userSockets.set(userId, socket.id);

            // Emitir evento de confirmación al cliente
            socket.emit('registered', { success: true, message: 'Usuario registrado con éxito' });
        });

        socket.on('chat message', async (msg) => {
            const mensajeEmitir = {
                id: null,
                id_grupo: msg.id_grupo,
                id_usuario: msg.id_usuario,
                mensaje: msg.mensaje,
            }
            const mensajeAEmitir = await mensajeController.guardarNuevoMensaje(mensajeEmitir);
            io.emit('chat message', mensajeAEmitir);
        });

        // Cuando un usuario se desconecta
        socket.on('disconnect', () => {

            // Eliminar el usuario de nuestro registro
            for (const [userId, socketId] of userSockets.entries()) {
                if (socketId === socket.id) {
                    userSockets.delete(userId);
                    break;
                }
            }
        });
    });

    return io;
}

/**
 * Crea y envía una notificación a uno o más usuarios
 * @param {string|string[]} userIds - ID o array de IDs de usuarios a notificar
 * @param {string} type - Tipo de notificación (friendRequest, friendAccepted, etc.)
 * @param {string} entityId - ID de la entidad relacionada (request ID, group ID, etc.)
 * @param {Object} content - Datos adicionales como JSON
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<boolean>} - Verdadero si la notificación se creó correctamente
 */
async function createNotification(userIds, type, entityId, content, options = {}) {
    const users = Array.isArray(userIds) ? userIds : [userIds];

    try {
        // Usar una transacción para garantizar la integridad
        const result = await sequelize.transaction(async (t) => {
            // Crear la notificación principal
            const notification = await Notification.create({
                type,
                entity_id: entityId,
                content,
                created_at: new Date()
            }, { transaction: t });

            // Crear las entradas en notificacion_usuarios para cada usuario
            const userNotifications = await Promise.all(users.map(userId => {
                // Determinar si esta notificación debe marcarse como leída automáticamente
                // Por ejemplo, para el remitente de una solicitud de amistad
                const isAutoRead = options.autoReadFor && options.autoReadFor.includes(userId);

                return UserNotification.create({
                    notification: notification.id,
                    user: userId,
                    readed: isAutoRead,
                    read_at: isAutoRead ? new Date() : null,
                    visible: true
                }, { transaction: t });
            }));

            return { notification, userNotifications };
        });

        // Notificar a cada usuario conectado
        for (const userId of users) {
            notifyUserSocket(userId, {
                id: result.userNotifications.find(un => un.user === userId).id,
                type,
                entity_id: entityId,
                content,
                created_at: result.notification.created_at,
                readed: options.autoReadFor && options.autoReadFor.includes(userId),
            });
        }

        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Envía una notificación a un usuario específico a través de socket
 * @param {string} userId - ID del usuario
 * @param {Object} notification - Datos de la notificación
 * @returns {boolean} - Verdadero si se envió correctamente
 */
function notifyUserSocket(userId, notification) {
    const socketId = userSockets.get(userId);

    if (socketId) {
        // Enviar la notificación al usuario
        io.to(socketId).emit('notification', notification);
        return true;
    } else {
        return false;
    }
}

// Función para depurar y ver qué usuarios están conectados
function getConnectedUsers() {
    return Array.from(userSockets.keys());
}

module.exports = {
    setupSocket,
    createNotification,
    getConnectedUsers
};