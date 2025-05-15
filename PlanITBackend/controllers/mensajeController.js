const Respuesta = require("../utils/respuesta.js");
const initModels = require("../models/init-models.js").initModels;
const sequelize = require("../config/sequelize.js");
const { Op } = require("sequelize");
const socketService = require("../services/socket-service.js");

const models = initModels(sequelize);
const Mensaje = models.message;
const MessagesUser = models.messagesUser;
const Usuario = models.user;
const GroupMembers = models.groupMember;

class MensajeController {

    async getMensajesGrupo(req, res) {
        try {
            const uid = req.uid;
            const idGrupo = req.params.id;
            const limit = req.query.limit ? parseInt(req.query.limit) : 20;
            const offset = req.query.offset ? parseInt(req.query.offset) : 0;
            const messageId = req.query.messageId || null;
            const contextSize = req.query.contextSize ? parseInt(req.query.contextSize) : 20;

            if (!uid || !idGrupo) {
                return res.status(400).json(Respuesta.error(null, "Faltan parámetros", "PARAMETROS_FALTANTES"));
            }

            const belongsToGroup = await GroupMembers.findOne({
                where: {
                    user: uid,
                    groups: idGrupo,
                    [Op.or]: [
                        { joined: 1 },
                        { joined: -1 }
                    ]
                }
            });

            if (!belongsToGroup) {
                return res.status(403).json(Respuesta.error(null, "No perteneces a este grupo", "DOESNT_BELONG_TO_GROUP"));
            }

            if (messageId) {
                const targetMessage = await Mensaje.findByPk(messageId);

                if (!targetMessage) {
                    return res.status(404).json(Respuesta.error(null, "Mensaje no encontrado", "MENSAJE_NO_ENCONTRADO"));
                }
                const olderMessages = await Mensaje.findAll({
                    where: {
                        groups: idGrupo,
                        datetime: {
                            [Op.lt]: targetMessage.datetime
                        }
                    },
                    include: [
                        {
                            model: Usuario,
                            as: "user_user",
                            attributes: ['username', 'imageUrl'],
                        },
                        {
                            model: MessagesUser,
                            as: "messages_users",
                            where: {
                                [Op.and]: [
                                    { user: uid },
                                    { message: { [Op.col]: 'message.id' } }
                                ]
                            },
                            attributes: ['featured', 'readed', 'read_at'],
                        },
                        {
                            model: Mensaje,
                            as: "reference_message",
                            attributes: ['id', 'content', 'sourceUrl'],
                            include: [
                                {
                                    model: Usuario,
                                    as: "user_user",
                                    attributes: ['uid', 'username', 'imageUrl'],
                                }
                            ]
                        }
                    ],
                    order: [['datetime', 'DESC']],
                    limit: Math.floor(contextSize / 2)
                });

                const targetWithDetails = await Mensaje.findOne({
                    where: { id: messageId },
                    include: [
                        {
                            model: Usuario,
                            as: "user_user",
                            attributes: ['username', 'imageUrl'],
                        },
                        {
                            model: MessagesUser,
                            as: "messages_users",
                            where: {
                                [Op.and]: [
                                    { user: uid },
                                    { message: { [Op.col]: 'message.id' } }
                                ]
                            },
                            attributes: ['featured', 'readed', 'read_at'],
                        },
                        {
                            model: Mensaje,
                            as: "reference_message",
                            attributes: ['id', 'content', 'sourceUrl'],
                            include: [
                                {
                                    model: Usuario,
                                    as: "user_user",
                                    attributes: ['uid', 'username', 'imageUrl'],
                                }
                            ]
                        }
                    ]
                });

                // 3. Obtener mensajes posteriores al mensaje objetivo (más recientes)
                const newerMessages = await Mensaje.findAll({
                    where: {
                        groups: idGrupo,
                        datetime: {
                            [Op.gt]: targetMessage.datetime
                        }
                    },
                    include: [
                        {
                            model: Usuario,
                            as: "user_user",
                            attributes: ['username', 'imageUrl'],
                        },
                        {
                            model: MessagesUser,
                            as: "messages_users",
                            where: {
                                [Op.and]: [
                                    { user: uid },
                                    { message: { [Op.col]: 'message.id' } }
                                ]
                            },
                            attributes: ['featured', 'readed', 'read_at'],
                        },
                        {
                            model: Mensaje,
                            as: "reference_message",
                            attributes: ['id', 'content', 'sourceUrl'],
                            include: [
                                {
                                    model: Usuario,
                                    as: "user_user",
                                    attributes: ['uid', 'username', 'imageUrl'],
                                }
                            ]
                        }
                    ],
                    order: [['datetime', 'ASC']],
                    limit: Math.floor(contextSize / 2)
                });

                newerMessages.reverse();
                const allMessages = [...newerMessages];
                if (targetWithDetails && !allMessages.some(m => m.id === targetWithDetails.id)) {
                    allMessages.push(targetWithDetails);
                }
                olderMessages.forEach(msg => {
                    if (!allMessages.some(m => m.id === msg.id)) {
                        allMessages.push(msg);
                    }
                });

                allMessages.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
                const olderMessagesCount = await Mensaje.count({
                    where: {
                        groups: idGrupo,
                        datetime: {
                            [Op.lt]: targetMessage.datetime
                        }
                    }
                });

                const newerMessagesCount = await Mensaje.count({
                    where: {
                        groups: idGrupo,
                        datetime: {
                            [Op.gt]: targetMessage.datetime
                        }
                    }
                });

                const targetIndex = allMessages.findIndex(msg => msg.id === messageId);

                return res.json(Respuesta.exito({
                    mensajes: allMessages,
                    metadata: {
                        olderMessagesCount,
                        newerMessagesCount,
                        totalMensajes: olderMessagesCount + newerMessagesCount + 1,
                        hasMoreOlderMessages: olderMessagesCount > olderMessages.length,
                        hasMoreRecentMessages: newerMessagesCount > newerMessages.length,
                        targetMessageId: messageId,
                        targetMessageIndex: targetIndex,
                        loadedOlderCount: olderMessages.length,
                        loadedNewerCount: newerMessages.length
                    }
                }, "Mensajes recuperados con contexto"));
            } else {
                const mensajes = await Mensaje.findAll({
                    where: { groups: idGrupo },
                    include: [
                        {
                            model: Usuario,
                            as: "user_user",
                            attributes: ['username', 'imageUrl'],
                        },
                        {
                            model: MessagesUser,
                            as: "messages_users",
                            where: {
                                [Op.and]: [
                                    { user: uid },
                                    { message: { [Op.col]: 'message.id' } }
                                ]
                            },
                            attributes: ['featured', 'readed', 'read_at'],
                        },
                        {
                            model: Mensaje,
                            as: "reference_message",
                            attributes: ['id', 'content', 'sourceUrl'],
                            include: [
                                {
                                    model: Usuario,
                                    as: "user_user",
                                    attributes: ['uid', 'username', 'imageUrl'],
                                }
                            ]
                        }
                    ],
                    order: [['datetime', 'DESC']],
                    limit,
                    offset
                });

                if ((!mensajes || mensajes.length === 0) && offset === 0) {
                    return res.status(404).json(Respuesta.error(null, "No se encontraron mensajes", "EMPTY_CHAT"));
                }

                if (mensajes.length === 0) {
                    return res.json(Respuesta.exito([], "No hay más mensajes"));
                }

                return res.json(Respuesta.exito(mensajes, "Mensajes recuperados"));
            }
        } catch (error) {
            console.error("Error en getMensajesGrupo:", error);
            return res.status(500).json(Respuesta.error(null, "Error al recuperar los mensajes: " + error.message, "ERROR_AL_OBTENER_MENSAJES"));
        }
    }

    async getMensajesAntes(req, res) {
        try {
            const uid = req.uid;
            const idGrupo = req.params.id;
            const limit = req.query.limit ? parseInt(req.query.limit) : 20;
            const beforeDate = req.query.beforeDate ? new Date(req.query.beforeDate) : null;

            if (!uid || !idGrupo || !beforeDate) {
                return res.status(400).json(Respuesta.error(null, "Faltan parámetros", "PARAMETROS_FALTANTES"));
            }

            const belongsToGroup = await GroupMembers.findOne({
                where: {
                    user: uid,
                    groups: idGrupo,
                    [Op.or]: [
                        { joined: 1 },
                        { joined: -1 }
                    ]
                }
            });

            if (!belongsToGroup) {
                return res.status(403).json(Respuesta.error(null, "No perteneces a este grupo", "DOESNT_BELONG_TO_GROUP"));
            }

            const mensajes = await Mensaje.findAll({
                where: {
                    groups: idGrupo,
                    datetime: {
                        [Op.lt]: beforeDate
                    }
                },
                include: [
                    {
                        model: Usuario,
                        as: "user_user",
                        attributes: ['username', 'imageUrl'],
                    },
                    {
                        model: MessagesUser,
                        as: "messages_users",
                        where: {
                            [Op.and]: [
                                { user: uid },
                                { message: { [Op.col]: 'message.id' } }
                            ]
                        },
                        attributes: ['featured', 'readed', 'read_at'],
                    },
                    {
                        model: Mensaje,
                        as: "reference_message",
                        attributes: ['id', 'content', 'sourceUrl'],
                        include: [
                            {
                                model: Usuario,
                                as: "user_user",
                                attributes: ['uid', 'username', 'imageUrl'],
                            }
                        ]
                    }
                ],
                order: [['datetime', 'DESC']],
                limit
            });

            if (mensajes.length === 0) {
                return res.json(Respuesta.exito([], "No hay más mensajes anteriores"));
            }

            return res.json(Respuesta.exito(mensajes, "Mensajes anteriores recuperados"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al recuperar los mensajes anteriores: " + error.message, "ERROR_MENSAJES_ANTERIORES"));
        }
    }

    async getMensajesDestacados(req, res) {
        try {
            const uid = req.uid;
            const idGrupo = req.params.id;

            if (!uid || !idGrupo) {
                return res.status(400).json(Respuesta.error(null, "Faltan parámetros", "PARAMETROS_FALTANTES"));
            }

            const belongsToGroup = await GroupMembers.findOne({
                where: {
                    user: uid,
                    groups: idGrupo,
                    [Op.or]: [
                        { joined: 1 },
                        { joined: -1 }
                    ]
                }
            });

            if (!belongsToGroup) {
                return res.status(403).json(Respuesta.error(null, "No perteneces a este grupo", "DOESNT_BELONG_TO_GROUP"));
            }

            const featuredMessages = await MessagesUser.findAll({
                where: {
                    [Op.and]: [
                        { user: uid },
                        { featured: 1 }
                    ]
                },
                include: [
                    {
                        model: Mensaje,
                        as: "message_message",
                        where: { groups: idGrupo },
                        include: [
                            {
                                model: Usuario,
                                as: "user_user",
                                attributes: ['username', 'imageUrl'],
                            },
                            {
                                model: Mensaje,
                                as: "reference_message",
                                attributes: ['id', 'content', 'sourceUrl'],
                                include: [
                                    {
                                        model: Usuario,
                                        as: "user_user",
                                        attributes: ['uid', 'username', 'imageUrl'],
                                    }
                                ]
                            }
                        ]
                    }
                ],
                order: [[{ model: Mensaje, as: 'message_message' }, 'datetime', 'DESC']]
            });

            if (!featuredMessages || featuredMessages.length === 0) {
                return res.json(Respuesta.exito([], "No hay mensajes destacados"));
            }

            return res.json(Respuesta.exito(featuredMessages, "Mensajes destacados recuperados"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al recuperar los mensajes destacados: " + error.message, "ERROR_MENSAJES_DESTACADOS"));
        }
    }

    async getMensajesRecientes(req, res) {
        try {
            const uid = req.uid;
            const idGrupo = req.params.id;
            const limit = req.query.limit ? parseInt(req.query.limit) : 20;
            const afterDate = req.query.afterDate ? new Date(req.query.afterDate) : null;

            if (!uid || !idGrupo || !afterDate) {
                return res.status(400).json(Respuesta.error(null, "Faltan parámetros", "PARAMETROS_FALTANTES"));
            }

            const belongsToGroup = await GroupMembers.findOne({
                where: {
                    user: uid,
                    groups: idGrupo,
                    [Op.or]: [
                        { joined: 1 },
                        { joined: -1 }
                    ]
                }
            });

            if (!belongsToGroup) {
                return res.status(403).json(Respuesta.error(null, "No perteneces a este grupo", "DOESNT_BELONG_TO_GROUP"));
            }

            const mensajes = await Mensaje.findAll({
                where: {
                    groups: idGrupo,
                    datetime: { [Op.gt]: afterDate }
                },
                include: [
                    {
                        model: Usuario,
                        as: "user_user",
                        attributes: ['username', 'imageUrl'],
                    },
                    {
                        model: MessagesUser,
                        as: "messages_users",
                        where: {
                            [Op.and]: [
                                { user: uid },
                                { message: { [Op.col]: 'message.id' } }
                            ]
                        },
                        attributes: ['featured', 'readed', 'read_at'],
                    },
                    {
                        model: Mensaje,
                        as: "reference_message",
                        attributes: ['id', 'content', 'sourceUrl'],
                        include: [
                            {
                                model: Usuario,
                                as: "user_user",
                                attributes: ['uid', 'username', 'imageUrl'],
                            }
                        ]
                    }
                ],
                order: [['datetime', 'ASC']],
                limit
            });

            return res.json(Respuesta.exito(mensajes, "Mensajes recientes recuperados"));
        } catch (error) {
            console.error("Error en getMensajesRecientes:", error);
            return res.status(500).json(Respuesta.error(null, "Error al recuperar los mensajes recientes: " + error.message, "ERROR_MENSAJES_RECIENTES"));
        }
    }

    async getUnreadMessages(req, res) {
        try {
            const uid = req.uid;

            if (!uid) {
                return res.status(400).json(Respuesta.error(null, "Falta el ID de usuario", "PARAMETROS_FALTANTES"));
            }

            const userGroups = await GroupMembers.findAll({
                where: {
                    user: uid,
                    joined: 1
                },
                attributes: ['groups']
            });

            const groupIds = userGroups.map(group => group.groups);

            // Consulta para contar mensajes no leídos por grupo
            const unreadMessagesQuery = `
                SELECT m.groups, COUNT(*) as unreadCount
                FROM message m
                JOIN messages_user mu ON m.id = mu.message
                WHERE mu.user = :uid 
                AND m.groups IN (:groupIds)
                AND mu.readed = 0
                GROUP BY m.groups
            `;

            const unreadMessages = await sequelize.query(unreadMessagesQuery, {
                replacements: { uid, groupIds },
                type: sequelize.QueryTypes.SELECT
            });

            // Formato del resultado
            const result = [];
            for (const group of unreadMessages) {
                result.push({
                    groups: group.groups,
                    unreadCount: parseInt(group.unreadCount)
                });
            }

            // Añadir grupos que no tienen mensajes no leídos
            for (const group of groupIds) {
                if (!result.some(item => item.groups === group)) {
                    result.push({
                        groups: group,
                        unreadCount: 0
                    });
                }
            }

            return res.json(Respuesta.exito(result, "Mensajes no leídos recuperados"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al recuperar los mensajes no leídos: " + error.message, "ERROR_MENSAJES_NO_LEIDOS"));
        }
    }

    async sendMessage(req, res) {
        try {
            const uid = req.uid;
            const idGrupo = req.params.id;
            const messageId = req.id
            const file = req.file;

            if (!uid || !idGrupo || !messageId) {
                return res.status(400).json(Respuesta.error(null, "Faltan parámetros", "PARAMETROS_FALTANTES"));
            }

            const belongsToGroup = await GroupMembers.findOne({
                where: {
                    user: uid,
                    groups: idGrupo,
                    joined: 1
                }
            });

            if (!belongsToGroup) {
                return res.status(403).json(Respuesta.error(null, "No tienes perteneces a este grupo", "DOESNT_BELONG_TO_GROUP"));
            }

            const mensajeData = {
                id: messageId,
                type: req.body.type,
                content: req.body.content,
                sourceUrl: file ? `uploads/groups/${idGrupo}/images/${req.file.filename}` : null,
                user: uid,
                groups: idGrupo,
                reference: req.body.reference ? req.body.reference : null,
                datetime: new Date()
            }

            if (mensajeData.type === '' || mensajeData.content === '') {
                return res.status(400).json(Respuesta.error(null, "Faltan parámetros", "PARAMETROS_FALTANTES"));
            }

            const userInfo = await Usuario.findOne({
                where: { uid: uid },
                attributes: ['username', 'imageUrl']
            });

            if (!userInfo) {
                return res.status(404).json(Respuesta.error(null, "Usuario no encontrado", "USUARIO_NO_ENCONTRADO"));
            }

            const groupUsers = await GroupMembers.findAll({
                where: {
                    [Op.and]: [
                        { groups: idGrupo },
                        { joined: 1 },
                    ]
                },
                attributes: ['user']
            });

            await sequelize.transaction(async (t) => {
                await Mensaje.create({
                    id: messageId,
                    type: mensajeData.type,
                    content: mensajeData.content,
                    sourceUrl: mensajeData.sourceUrl,
                    user: mensajeData.user,
                    groups: mensajeData.groups,
                    reference: mensajeData.reference,
                    datetime: mensajeData.datetime
                }, { transaction: t });

                await Promise.all(groupUsers.map(async (user) => {
                    await MessagesUser.create({
                        message: messageId,
                        user: user.user,
                        featured: 0,
                        readed: user.user === uid ? 1 : 0,
                        read_at: user.user === uid ? mensajeData.datetime : null,
                    }, { transaction: t });
                }));
            });

            const messageReference = mensajeData.reference ? await Mensaje.findOne({
                where: { id: mensajeData.reference },
                attributes: ['id', 'type', 'content', 'sourceUrl'],
                include: [
                    {
                        model: Usuario,
                        as: "user_user",
                        attributes: ['uid', 'username', 'imageUrl'],
                    }
                ]
            }) : null;

            const messageToEmit = {
                id: messageId,
                type: mensajeData.type,
                content: mensajeData.content,
                sourceUrl: mensajeData.sourceUrl,
                featured: false,
                readed: true,
                read_at: mensajeData.datetime,
                reference: mensajeData.reference ? mensajeData.reference : null,
                user: {
                    uid: uid,
                    username: userInfo.username,
                    imageUrl: userInfo.imageUrl
                },
                reference_message: mensajeData.reference ? {
                    id: mensajeData.reference,
                    type: messageReference.type,
                    content: messageReference.content,
                    sourceUrl: messageReference.sourceUrl,
                    user_user: {
                        uid: messageReference.user_user.uid,
                        username: messageReference.user_user.username,
                        imageUrl: messageReference.user_user.imageUrl
                    }
                } : null,
                datetime: mensajeData.datetime,
                groups: idGrupo,
            };

            const io = socketService.getIo();
            if (io) {
                socketService.emitGroupMessage(idGrupo, messageToEmit);
            } else {
                console.error('Socket IO no está inicializado');
            }

            return res.json(Respuesta.exito(messageToEmit, "Mensaje enviado"));
        } catch (error) {
            console.error("Error al enviar mensaje:", error);
            return res.status(500).json(Respuesta.error(null, "Error al enviar el mensaje: " + error.message, "ERROR_AL_ENVIAR_MENSAJE"));
        }
    }

    async featureMessage(req, res) {
        try {
            const uid = req.uid;
            const groupId = req.params.id;
            const messageId = req.body.id;
            const featured = req.body.featured;

            if (!uid || !groupId || !messageId) {
                return res.status(400).json(Respuesta.error(null, "Faltan parámetros", "PARAMETROS_FALTANTES"));
            }

            const belongsToGroup = await GroupMembers.findOne({
                where: {
                    user: uid,
                    groups: groupId,
                    joined: 1
                }
            });

            if (!belongsToGroup) {
                return res.status(403).json(Respuesta.error(null, "No tienes perteneces a este grupo", "DOESNT_BELONG_TO_GROUP"));
            }

            await MessagesUser.update(
                { featured: featured ? 0 : 1 },
                {
                    where: {
                        [Op.and]: [
                            { user: uid },
                            { message: messageId }
                        ]
                    }
                }
            );

            return res.json(Respuesta.exito(null, "Mensaje marcado como destacado"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al marcar el mensaje como destacado: " + error.message, "ERROR_AL_DESTACAR_MENSAJE"));
        }
    }

    async deleteMessage(req, res) {
        try {
            const uid = req.uid;
            const groupId = req.params.id;
            const messages = req.body;

            if (!uid || !groupId || !messages) {
                return res.status(400).json(Respuesta.error(null, "Faltan parámetros", "PARAMETROS_FALTANTES"));
            }

            const belongsToGroup = await GroupMembers.findOne({
                where: {
                    user: uid,
                    groups: groupId,
                    joined: 1
                }
            });

            if (!belongsToGroup) {
                return res.status(403).json(Respuesta.error(null, "No tienes perteneces a este grupo", "DOESNT_BELONG_TO_GROUP"));
            }

            const requiredAdminToDelete = messages.some(message => {
                return message.user !== uid;
            });

            const isUserAdmin = belongsToGroup.admin === 1;

            if (requiredAdminToDelete && !isUserAdmin) {
                return res.status(403).json(Respuesta.error(null, "No tienes permisos para eliminar mensajes de otros usuarios", "NO_TIENES_PERMISOS"));
            }

            await sequelize.transaction(async (t) => {
                for (const message of messages) {
                    await Mensaje.update(
                        {
                            reference: null,
                            reference_deleted: 1
                        },
                        {
                            where: { reference: message.id },
                            transaction: t
                        }
                    );
                }

                for (const message of messages) {
                    await Mensaje.destroy({
                        where: { id: message.id },
                        transaction: t
                    });
                }
            });

            const io = socketService.getIo();
            if (io) {
                socketService.emitDeleteMessages(groupId, messages);
            } else {
                console.error('Socket IO no está inicializado');
            }

            return res.json(Respuesta.exito(null, "Mensajes eliminados"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al eliminar el mensaje: " + error.message, "ERROR_AL_ELIMINAR_MENSAJE"));
        }
    }

    async getUnreadNotifications(req, res) {
        try {
            const uid = req.uid;

            if (!uid) {
                return res.status(400).json(Respuesta.error(null, "Falta el ID de usuario", "PARAMETROS_FALTANTES"));
            }

            const userGroups = await GroupMembers.findAll({
                where: {
                    user: uid,
                    joined: 1
                },
                attributes: ['groups']
            });

            const groupIds = userGroups.map(group => group.groups);

            // Consulta para contar mensajes no leídos por grupo
            const unreadCounts = await sequelize.query(`
                SELECT m.groups, COUNT(*) as unreadCount 
                FROM mensaje m
                JOIN messages_user mu ON m.id = mu.message
                WHERE mu.user = :uid 
                AND m.groups IN (:groupIds)
                AND mu.readed = 0
                GROUP BY m.groups
            `, {
                replacements: { uid, groupIds },
                type: sequelize.QueryTypes.SELECT
            });

            // Obtener el último mensaje de cada grupo
            const lastMessages = await sequelize.query(`
                SELECT m.* 
                FROM mensaje m
                INNER JOIN (
                    SELECT groups, MAX(datetime) as maxDate
                    FROM mensaje
                    WHERE groups IN (:groupIds)
                    GROUP BY groups
                ) as latest ON m.groups = latest.groups AND m.datetime = latest.maxDate
                ORDER BY m.datetime DESC
            `, {
                replacements: { groupIds },
                type: sequelize.QueryTypes.SELECT
            });

            const result = {
                totalUnreadCount: unreadCounts.reduce((sum, item) => sum + parseInt(item.unreadCount), 0),
                unreadByGroup: {},
                lastMessageByGroup: {}
            };

            unreadCounts.forEach(item => {
                result.unreadByGroup[item.groups] = parseInt(item.unreadCount);
            });

            lastMessages.forEach(msg => {
                result.lastMessageByGroup[msg.groups] = msg;
            });

            return res.json(Respuesta.exito(result, "Notificaciones no leídas obtenidas correctamente"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al obtener notificaciones: " + error.message, "ERROR_NOTIFICACIONES"));
        }
    }

    async getLastMessage(req, res) {
        try {
            const uid = req.uid;
            const groupId = req.params.id;

            if (!uid || !groupId) {
                return res.status(400).json(Respuesta.error(null, "Faltan parámetros", "PARAMETROS_FALTANTES"));
            }

            const belongsToGroup = await GroupMembers.findOne({
                where: {
                    user: uid,
                    groups: groupId,
                    joined: 1
                }
            });

            if (!belongsToGroup) {
                return res.status(403).json(Respuesta.error(null, "No tienes perteneces a este grupo", "DOESNT_BELONG_TO_GROUP"));
            }

            const lastMessage = await Mensaje.findOne({
                where: { groups: groupId },
                order: [['datetime', 'DESC']],
                limit: 1,
                include: [
                    {
                        model: Usuario,
                        as: "user_user",
                        attributes: ['username'],
                    }
                ],
                attributes: ['id', 'type', 'content', 'groups', 'datetime'],
                order: [['datetime', 'DESC']],
            });

            if (!lastMessage) {
                return res.status(404).json(Respuesta.exito(null, "No se encontraron mensajes"));
            }

            return res.json(Respuesta.exito(lastMessage, "Último mensaje recuperado"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al obtener el último mensaje: " + error.message, "ERROR_ULTIMO_MENSAJE"));
        }
    }

    async markMessageAsRead(req, res) {
        try {
            const uid = req.uid;
            const messageId = req.params.id;

            if (!uid || !messageId) {
                return res.status(400).json(Respuesta.error(null, "Faltan parámetros", "PARAMETROS_FALTANTES"));
            }
            const messageUser = await MessagesUser.findOne({
                where: {
                    message: messageId,
                    user: uid
                }
            });

            if (!messageUser) {
                return res.status(404).json(Respuesta.error(null, "Mensaje no encontrado", "MENSAJE_NO_ENCONTRADO"));
            }
            if (messageUser.readed) {
                return res.json(Respuesta.exito(null, "Mensaje ya estaba marcado como leído"));
            }
            await messageUser.update({
                readed: 1,
                read_at: new Date()
            });
            const message = await Mensaje.findOne({
                where: { id: messageId },
                include: [
                    {
                        model: Usuario,
                        as: "user_user",
                        attributes: ['username', 'imageUrl'],
                    }
                ]
            });
            if (message && message.user !== uid) {
                socketService.notifyMessageRead(message.user, {
                    messageId: messageId,
                    userId: uid,
                    read_at: messageUser.read_at
                });
            }

            return res.json(Respuesta.exito({
                id: messageId,
                readed: true,
                read_at: messageUser.read_at
            }, "Mensaje marcado como leído"));

        } catch (error) {
            console.error("Error al marcar mensaje como leído:", error);
            return res.status(500).json(Respuesta.error(null, "Error al marcar mensaje como leído: " + error.message, "ERROR_AL_MARCAR_MENSAJE"));
        }
    }

    async markAllMessagesAsRead(req, res) {
        try {
            const uid = req.uid;
            const groupId = req.params.id;

            if (!uid || !groupId) {
                return res.status(400).json(Respuesta.error(null, "Faltan parámetros", "PARAMETROS_FALTANTES"));
            }

            const belongsToGroup = await GroupMembers.findOne({
                where: {
                    user: uid,
                    groups: groupId,
                    joined: 1
                }
            });

            if (!belongsToGroup) {
                return res.status(403).json(Respuesta.error(null, "No tienes perteneces a este grupo", "DOESNT_BELONG_TO_GROUP"));
            }

            await MessagesUser.update({
                readed: 1,
                read_at: new Date()
            }, {
                where: {
                    user: uid
                }
            });

            return res.json(Respuesta.exito(null, "Todos los mensajes marcados como leídos"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al marcar todos los mensajes como leídos: " + error.message, "ERROR_AL_MARCAR_TODOS_LOS_MENSAJES"));
        }
    }
}

module.exports = new MensajeController();