const Respuesta = require("../utils/respuesta.js");
// Recuperar función de inicialización de modelos
const initModels = require("../models/init-models.js").initModels;
// Crear la instancia de sequelize con la conexión a la base de datos
const sequelize = require("../config/sequelize.js");
const { Op, where, col } = require("sequelize");
const { createNotification } = require("../services/socket-service.js");

const models = initModels(sequelize);
const Usuario = models.user;
const Friends = models.friends;
const GroupMember = models.groupMember
const Notification = models.notification;
const UserNotification = models.userNotification;

class FriendsController {

    async getAllFriends(req, res) {
        try {
            const userUid = req.uid;
            const limit = parseInt(req.query.limit) || 5;
            const offset = parseInt(req.query.offset) || 0;
            const searchTxt = (req.query.search || '').toLowerCase();

            // Base de WHERE
            const baseAnd = [
                { accepted: 1 },
                {
                    [Op.or]: [
                        { user_send: userUid },
                        { user_requested: userUid }
                    ]
                }
            ];

            if (searchTxt) {
                const like = `%${searchTxt}%`;
                baseAnd.push({
                    [Op.or]: [
                        where(col('user_send_user.name'), { [Op.like]: like }),
                        where(col('user_send_user.surname'), { [Op.like]: like }),
                        where(col('user_send_user.username'), { [Op.like]: like }),
                        where(col('user_requested_user.name'), { [Op.like]: like }),
                        where(col('user_requested_user.surname'), { [Op.like]: like }),
                        where(col('user_requested_user.username'), { [Op.like]: like }),
                    ]
                });
            }

            const friends = await Friends.findAll({
                where: { [Op.and]: baseAnd },
                include: [
                    {
                        model: Usuario,
                        as: 'user_send_user',
                        attributes: ['uid', 'name', 'surname', 'username', 'imageUrl'],
                    },
                    {
                        model: Usuario,
                        as: 'user_requested_user',
                        attributes: ['uid', 'name', 'surname', 'username', 'imageUrl'],
                    }
                ],
                limit,
                offset
            });

            return res.json(Respuesta.exito(friends, "amigos recuperados"));

        } catch (error) {
            return res.status(500)
                .json(Respuesta.error(null, "Error al recuperar los amigos: " + error, "ERROR_AL_OBTENER_AMIGOS"));
        }

    }

    async getGroupFriends(req, res) {
        try {
            const userUid = req.uid;
            const groupId = req.params.id;
            const limit = parseInt(req.query.limit) || 5;
            const offset = parseInt(req.query.offset) || 0;
            const searchTxt = (req.query.search || '').toLowerCase();

            if (!groupId) {
                return res.status(400).json(Respuesta.error(null, "ID de grupo requerido", "GROUP_ID_REQUIRED"));
            }

            // Obtener los IDs de los usuarios que ya son miembros del grupo
            const groupMembers = await GroupMember.findAll({
                where: {
                    [Op.and]: [
                        { groups: groupId },
                        {
                            [Op.or]: [
                                { joined: 1 },
                                { joined: 0 }
                            ]
                        }
                    ]
                },
                attributes: ['user']
            });

            const existingMembers = groupMembers.map(member => member.user);

            // Base de WHERE
            const baseAnd = [
                { accepted: 1 },
                {
                    [Op.or]: [
                        { user_send: userUid },
                        { user_requested: userUid }
                    ]
                }
            ];

            if (searchTxt) {
                const like = `%${searchTxt}%`;
                baseAnd.push({
                    [Op.or]: [
                        where(col('user_send_user.name'), { [Op.like]: like }),
                        where(col('user_send_user.surname'), { [Op.like]: like }),
                        where(col('user_send_user.username'), { [Op.like]: like }),
                        where(col('user_requested_user.name'), { [Op.like]: like }),
                        where(col('user_requested_user.surname'), { [Op.like]: like }),
                        where(col('user_requested_user.username'), { [Op.like]: like }),
                    ]
                });
            }

            const friends = await Friends.findAll({
                where: { [Op.and]: baseAnd },
                include: [
                    {
                        model: Usuario,
                        as: 'user_send_user',
                        attributes: ['uid', 'name', 'surname', 'username', 'imageUrl'],
                    },
                    {
                        model: Usuario,
                        as: 'user_requested_user',
                        attributes: ['uid', 'name', 'surname', 'username', 'imageUrl'],
                    }
                ],
                limit,
                offset
            });

            // Filtrar amigos que ya son miembros del grupo
            const filteredFriends = friends.filter(friend => {
                const otherUserId = friend.user_send === userUid ? friend.user_requested : friend.user_send;
                return !existingMembers.includes(otherUserId);
            });

            return res.json(Respuesta.exito(filteredFriends, "amigos recuperados"));

        } catch (error) {
            return res.status(500)
                .json(Respuesta.error(null, "Error al recuperar los amigos: " + error, "ERROR_AL_OBTENER_AMIGOS"));
        }
    }

    async friendRequest(req, res) {
        try {
            const uid = req.uid;
            const requested = req.body.requested;
            if (!uid || !requested) {
                return res.status(400).json(Respuesta.error(null, "Usuario/s desconocidos", "UID_OR_REQUESTED_REQUIRED"));
            }
            const userRequested = await Usuario.findOne({ where: { uid: requested } });
            if (!userRequested) {
                return res.status(404).json(Respuesta.error(null, "Usuario no encontrado", "USER_NOT_FOUND"));
            }

            const existingRequest = await Friends.findOne({
                where: {
                    [Op.or]: [
                        { user_send: uid, user_requested: requested },
                        { user_send: requested, user_requested: uid }
                    ]
                }
            });

            if (existingRequest) {
                return res.status(400).json(Respuesta.error(null, "Ya existe una solicitud de amistad pendiente", "FRIEND_REQUEST_ALREADY_SENT"));
            }

            // Crear la solicitud de amistad en la base de datos
            const friendRequest = await Friends.create({
                user_send: uid,
                user_requested: requested,
                accepted: 0,
                date: new Date(),
            });

            // Obtener información de los usuarios para incluir en la notificación
            const userSender = await Usuario.findOne({
                where: { uid: uid },
                attributes: ['uid', 'username', 'imageUrl']
            });

            // Obtener el id del friendRequest creado
            const entityId = friendRequest.dataValues.id;

            // Datos para la notificación
            const notificationContent = {
                id: entityId,
                user_send: uid,
                user_requested: requested,
                accepted: 0,
                date: friendRequest.date,
                user_send_user: {
                    username: userSender.username,
                    imageUrl: userSender.imageUrl
                },
                user_requested_user: {
                    username: userRequested.username,
                    imageUrl: userRequested.imageUrl
                }
            };

            // Crear notificación para ambos usuarios
            // El remitente la recibirá como "leída" automáticamente
            await createNotification(
                [requested, uid], // IDs de usuarios a notificar
                'friendRequest',  // Tipo de notificación
                entityId,         // ID de la entidad
                notificationContent, // Contenido
                { autoReadFor: [uid] } // Opciones (marcar como leída para el remitente)
            );

            return res.json(Respuesta.exito(friendRequest, "Solicitud de amistad enviada"));
        } catch (error) {
            console.error('Error al enviar solicitud de amistad:', error);
            return res.status(500).json(Respuesta.error(null, "Error al enviar la solicitud de amistad: " + error.message, "ERROR_SENDING_FRIEND_REQUEST"));
        }
    }

    async getFriendRequests(req, res) {
        try {
            const uid = req.uid;
            if (!uid) {
                return res.status(400).json(Respuesta.error(null, "Usuario desconocido", "UID_REQUIRED"));
            }

            // Esta función ahora puede simplificarse ya que las notificaciones se manejan por separado
            const friendRequests = await Friends.findAll({
                where: {
                    [Op.and]: [
                        {
                            [Op.or]: [
                                { user_send: uid },
                                { user_requested: uid }
                            ]
                        },
                        { accepted: 0 }
                    ]
                },
                include: [
                    {
                        model: Usuario,
                        as: 'user_send_user',
                        attributes: ['username', 'imageUrl']
                    },
                    {
                        model: Usuario,
                        as: 'user_requested_user',
                        attributes: ['username', 'imageUrl']
                    }
                ],
                attributes: ["id", "user_send", "user_requested", "date", "accepted"],
            });

            return res.json(Respuesta.exito(friendRequests, "Solicitudes de amistad recuperadas"));
        } catch (error) {
            console.error('Error al recuperar solicitudes de amistad:', error);
            return res.status(500).json(Respuesta.error(null, "Error al recuperar las solicitudes de amistad: " + error.message, "ERROR_GETTING_FRIEND_REQUESTS"));
        }
    }

    async acceptFriendRequest(req, res) {
        try {
            const uid = req.uid;
            const notificationId = req.params.id;

            if (!uid || !notificationId) {
                return res.status(400).json(Respuesta.error(null, "Parámetros incompletos", "PARAMS_REQUIRED"));
            }

            const userNotification = await UserNotification.findOne({
                where: {
                    id: notificationId,
                }
            });

            const notification = await Notification.findOne({
                where: {
                    id: userNotification.notification,
                }
            });

            if (!notification) {
                return res.status(404).json(Respuesta.error(null, "Notificación no encontrada", "NOTIFICATION_NOT_FOUND"));
            }

            // Buscar la solicitud
            const friendRequest = await Friends.findOne({
                where: { id: notification.entity_id },
                include: [
                    {
                        model: Usuario,
                        as: 'user_send_user',
                        attributes: ['username', 'imageUrl']
                    },
                    {
                        model: Usuario,
                        as: 'user_requested_user',
                        attributes: ['username', 'imageUrl']
                    }
                ],
            });

            if (!friendRequest) {
                return res.status(404).json(Respuesta.error(null, "Solicitud no encontrada", "REQUEST_NOT_FOUND"));
            }

            // Verificar que el usuario actual sea el destinatario
            if (friendRequest.user_requested !== uid) {
                return res.status(403).json(Respuesta.error(null, "No autorizado para aceptar esta solicitud", "UNAUTHORIZED"));
            }

            const userSender = await Usuario.findOne({
                where: { uid: uid },
                attributes: ['username', 'imageUrl']
            });

            const userRequested = await Usuario.findOne({
                where: { uid: friendRequest.user_send },
                attributes: ['uid', 'username', 'imageUrl']
            });

            await sequelize.transaction(async (transaction) => {
                friendRequest.accepted = 1;
                await friendRequest.save({ transaction: transaction });
                await notification.destroy({ transaction: transaction });
            });

            const notificationContent = {
                user_send: uid,
                user_requested: userRequested.uid,
                accepted: 1,
                date: new Date(),
                user_send_user: {
                    username: userSender.username,
                    imageUrl: userSender.imageUrl
                },
                user_requested_user: {
                    username: userRequested.username,
                    imageUrl: userRequested.imageUrl
                }
            };

            const entityId = friendRequest.id;

            // Crear notificación para el remitente de la solicitud
            await createNotification(
                [uid, userRequested.uid],
                'friendRequest',
                entityId,
                notificationContent,
                { autoReadFor: [uid] }
            );

            return res.json(Respuesta.exito({ accepted: true }, "Solicitud de amistad aceptada"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al aceptar la solicitud: " + error.message, "ERROR_ACCEPTING_REQUEST"));
        }
    }

    async rejectFriendRequest(req, res) {
        try {
            const uid = req.uid;
            const friendRequestId = req.params.id;
            if (!uid || !friendRequestId) {
                return res.status(400).json(Respuesta.error(null, "Parámetros incompletos", "PARAMS_REQUIRED"));
            }

            const friendRequest = await Friends.findOne({
                where: { id: friendRequestId }
            });

            if (!friendRequest) {
                return res.status(404).json(Respuesta.error(null, "Solicitud no encontrada", "REQUEST_NOT_FOUND"));
            }

            const notification = await Notification.findOne({
                where: {
                    entity_id: friendRequestId,
                }
            });

            const userSender = await Usuario.findOne({
                where: { uid: friendRequest.user_send }
            });

            const userRequested = await Usuario.findOne({
                where: { uid: friendRequest.user_requested }
            });

            if (userRequested.uid !== uid) {
                return res.status(403).json(Respuesta.error(null, "No autorizado para rechazar esta solicitud", "UNAUTHORIZED"));
            }

            sequelize.transaction(async (transaction) => {
                await friendRequest.destroy({ transaction: transaction });
                await notification.destroy({ transaction: transaction });
            });

            const notificationContent = {
                user_send: uid,
                user_requested: userSender.uid,
                accepted: -1,
                date: new Date(),
                user_send_user: {
                    username: userRequested.username,
                    imageUrl: userRequested.imageUrl
                },
                user_requested_user: {
                    username: userSender.username,
                    imageUrl: userSender.imageUrl
                }
            };

            const entityId = friendRequest.id;

            // Crear notificación para el remitente de la solicitud
            await createNotification(
                [userSender.uid],
                'friendRequest',
                entityId,
                notificationContent,
                { autoReadFor: [uid] }
            );

            return res.json(Respuesta.exito({ rejected: true }, "Solicitud de amistad rechazada"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al rechazar la solicitud: " + error.message, "ERROR_REJECTING_REQUEST"));
        }
    }

}

module.exports = new FriendsController();