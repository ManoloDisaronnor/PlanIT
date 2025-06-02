const { Server } = require('socket.io');
const initModels = require("../models/init-models.js").initModels;
const sequelize = require("../config/sequelize.js");
const models = initModels(sequelize);
const Notification = models.notification;
const UserNotification = models.userNotification;

let io = null;
let userSockets = new Map();
function setupSocket(server) {
    if (!io) {
        io = new Server(server, {
            cors: {
                origin: process.env.NODE_ENV === 'development' ? 'http://localhost:4200' : '*',
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
                credentials: true
            }
        });
        io.on('connection', (socket) => {

            socket.on('register', (userId) => {
                if (!userSockets.has(userId)) {
                    userSockets.set(userId, new Set());
                }
                userSockets.get(userId).add(socket.id);
            });

            // Unirse a un grupo
            socket.on('join_group', (groupId) => {
                socket.join(groupId);
            });

            socket.on('disconnect', () => {
                for (const [userId, socketSet] of userSockets.entries()) {
                    if (socketSet.has(socket.id)) {
                        socketSet.delete(socket.id);

                        // Si no quedan sockets para este usuario, eliminar la entrada
                        if (socketSet.size === 0) {
                            userSockets.delete(userId);
                        }
                    }
                }
            });
        });
    }

    return io;
}
/**

Envía una notificación a un usuario específico a través de socket
@param {string} userId - ID del usuario
@param {Object} notification - Datos de la notificación
@returns {boolean} - Verdadero si se envió correctamente
*/
function notifyUserSocket(userId, notification) {
    if (!io) {
        console.error('Socket IO no está inicializado');
        return false;
    }
    // Obtener todos los sockets del usuario
    const userSocketSet = userSockets.get(userId);
    if (userSocketSet && userSocketSet.size > 0) {
        // Emitir a todos los sockets del usuario
        userSocketSet.forEach(socketId => {
            io.to(socketId).emit('notification', notification);
        });
        return true;
    } else {
        return false;
    }
}

/**

Envía un mensaje a un usuario específico sobre un mensaje leído
@param {string} userId - ID del remitente del mensaje
@param {Object} readData - Datos sobre el mensaje leído
@returns {boolean} - Verdadero si se envió correctamente
*/
function notifyMessageRead(userId, readData) {
    if (!io) {
        console.error('Socket IO no está inicializado');
        return false;
    }
    const socketId = userSockets.get(userId);
    if (socketId) {
        io.to(socketId).emit('message_read', readData);
        return true;
    } else {
        return false;
    }
}

/**

Envía un mensaje a un grupo
@param {string} groupId - ID del grupo
@param {Object} message - Datos del mensaje
@returns {boolean} - Verdadero si se envió correctamente
*/
function emitGroupMessage(groupId, message) {
    if (!io) {
        console.error('Socket IO no está inicializado');
        return false;
    }
    io.to(groupId).emit('chat_message', message);
    return true;
}

function emitDeleteMessages(groupId, messages) {
    if (!io) {
        console.error('Socket IO no está inicializado');
        return false;
    }
    io.to(groupId).emit('delete_messages', messages);
    return true;
}

/**

Crea y envía una notificación a uno o más usuarios
@param {string|string[]} userIds - ID o array de IDs de usuarios a notificar
@param {string} type - Tipo de notificación (friendRequest, friendAccepted, etc.)
@param {string} entityId - ID de la entidad relacionada (request ID, group ID, etc.)
@param {Object} content - Datos adicionales como JSON
@param {Object} options - Opciones adicionales
@returns {Promise<boolean>} - Verdadero si la notificación se creó correctamente
*/
async function createNotification(userIds, type, entityId, content, options = {}) {
    const users = Array.isArray(userIds) ? userIds : [userIds];
    try {
        const result = await sequelize.transaction(async (t) => {
            const notification = await Notification.create({
                type,
                entity_id: entityId,
                content,
                created_at: new Date()
            }, { transaction: t });
            const userNotifications = await Promise.all(users.map(userId => {
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
        console.error('Error al crear notificación:', error);
        return false;
    }
}

function getUserSocket(userId) {
    return userSockets.get(userId);
}

function getIo() {
    return io;
}
module.exports = {
    setupSocket,
    notifyUserSocket,
    notifyMessageRead,
    createNotification,
    getUserSocket,
    userSockets,
    getIo,
    emitGroupMessage,
    emitDeleteMessages
}