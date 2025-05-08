const Respuesta = require("../utils/respuesta.js");
// Recuperar función de inicialización de modelos
const initModels = require("../models/init-models.js").initModels;
// Crear la instancia de sequelize con la conexión a la base de datos
const sequelize = require("../config/sequelize.js");
const { Op, where } = require("sequelize");
const { generateUniqueId } = require("../services/id-generator.js");
const { createNotification } = require("../services/socket-notification-service.js");

const models = initModels(sequelize);
const Grupo = models.groups;
const GroupMembers = models.groupMember;
const User = models.user;
const UserNotification = models.userNotification;
const Notification = models.notification;

class GrupoController {

    async getRandomIdGroupMemeber(req, res) {
        try {
            const randomId = await generateUniqueId(GroupMembers);
            return res.json(randomId);
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al generar el ID aleatorio" + error, "ERROR_GENERANDO_ID"));
        }
    }

    async getGroupsForUser(req, res) {
        try {
            const uid = req.uid;
            const limit = req.query.limit ? parseInt(req.query.limit) : 10;
            const offset = req.query.offset ? parseInt(req.query.offset) : 0;
            const searchText = req.query.search || '';
            const search = searchText.toLowerCase();

            if (!uid) {
                return res.status(400).json(Respuesta.error(null, "El uid es requerido", "UID_REQUIRED"));
            }

            const grupos = await GroupMembers.findAll({
                where: { user: uid },
                attributes: ["admin", "joined", 'fixed'],
                include: {
                    model: Grupo,
                    as: "groups_group",
                    ...(search ? {
                        where: {
                            [Op.or]: [
                                { name: { [Op.like]: `%${search}%` } },
                                { description: { [Op.like]: `%${search}%` } }
                            ]
                        }
                    } : {}),
                    attributes: ['id', 'name', 'imageUrl']
                },
                limit: limit,
                offset: offset,
                order: [
                    ["fixed", "DESC"],
                    ["joined", "ASC"],
                    ["joined_at", "DESC"]
                ],
            });
            if (!grupos || grupos.length === 0) {
                return res.status(404).json(Respuesta.error(null, "No se encontraron grupos para el usuario", "NO_GROUPS_FOUND"));
            }
            return res.json(Respuesta.exito(grupos, "Grupos recuperados"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al recuperar los grupos" + error, "ERROR_AL_OBTENER_GRUPOS"));
        }
    }

    async createGruop(req, res) {
        try {
            const group = {
                id: req.id,
                name: req.body.name,
                description: req.body.description,
                imageUrl: req.file ? `uploads/groups/${req.id}/${req.file.filename}` : null,
            };

            if (!group.id || !group.name) {
                return res.status(400).json(Respuesta.error(null, "El id y el nombre son requeridos", "ID_Y_NOMBRE_REQUERIDOS"));
            }

            let groupMembers = [];
            if (req.body.members) {
                try {
                    groupMembers = typeof req.body.members === 'string'
                        ? JSON.parse(req.body.members)
                        : req.body.members;
                } catch (error) {
                    return res.status(400).json(Respuesta.error(null, "Error al procesar los miembros del grupo", "INVALID_MEMBERS_FORMAT"));
                }
            }

            if (groupMembers.length === 0) {
                return res.status(400).json(Respuesta.error(null, "Se requiere al menos un miembro", "GROUP_MEMBERS_REQUIRED"));
            }

            let usersToNotify = [];
            let allNewGroupMembers = [];

            await sequelize.transaction(async (t) => {
                const grupo = await Grupo.create(
                    group,
                    { transaction: t }
                );

                await Promise.all(groupMembers.map(async (member) => {
                    const groupMemberId = await generateUniqueId(GroupMembers);
                    if (member.id !== req.uid) {
                        usersToNotify.push(member.id);
                    }
                    const groupMember = {
                        id: groupMemberId,
                        user: member.id,
                        groups: grupo.id,
                        admin: member.id === req.uid ? 1 : 0, // Por defecto crearlos sin permisos de admin y sin unirse excepto el creador del grupo
                        fixed: 0,
                        joined: member.id === req.uid ? 1 : 0,
                        joined_at: member.id === req.uid ? new Date() : null
                    };

                    await GroupMembers.create(groupMember, { transaction: t });
                    allNewGroupMembers.push(groupMember);
                }));
            });

            usersToNotify.push(req.uid);

            const userSender = await User.findOne({
                where: { uid: req.uid },
                attributes: ['uid', 'username', 'imageUrl']
            });

            allNewGroupMembers.forEach(async (groupMember) => {
                let userRequested = await User.findOne({
                    where: { uid: groupMember.user },
                    attributes: ['uid', 'username', 'imageUrl']
                });
                if (groupMember.user === req.uid) {
                    userRequested = {
                        uid: req.uid,
                        username: userSender.username,
                        imageUrl: userSender.imageUrl
                    }
                }
                const entityId = groupMember.id;

                // Datos para la notificación
                const notificationContent = {
                    id: entityId,
                    user_send: req.uid,
                    user_requested: groupMember.user,
                    group: {
                        id: groupMember.id,
                        name: group.name,
                        imageUrl: group.imageUrl,
                    },
                    admin: groupMember.admin,
                    joined: groupMember.joined,
                    user_send_user: {
                        username: userSender.username,
                        imageUrl: userSender.imageUrl
                    },
                    user_requested_user: {
                        username: userRequested.username,
                        imageUrl: userRequested.imageUrl
                    }
                };
                await createNotification(
                    [groupMember.user],
                    'groupRequest',
                    entityId,
                    notificationContent,
                    { autoReadFor: [req.uid] }
                );

            });
            return res.json(Respuesta.exito(group, "Grupo creado"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al crear el grupo" + error, "ERROR_AL_CREAR_GRUPO"));
        }
    }

    async acceptGroupJoinRequest(req, res) {
        try {
            const uid = req.uid;
            const groupId = req.params.id;

            if (!uid || !groupId) {
                return res.status(400).json(Respuesta.error(null, "El uid y el id del grupo son requeridos", "UID_Y_ID_GRUPO_REQUERIDOS"));
            }

            const groupMember = await GroupMembers.findOne({
                where: {
                    [Op.and]: [
                        { user: uid },
                        { groups: groupId },
                        { joined: 0 }
                    ]
                }
            });

            if (!groupMember) {
                return res.status(404).json(Respuesta.error(null, "No se encontró la solicitud de unión al grupo", "SOLICITUD_NO_ENCONTRADA"));
            }

            if (groupMember.user !== uid) {
                return res.status(403).json(Respuesta.error(null, "No tienes permiso para aceptar esta solicitud", "PERMISO_DENEGADO"));
            }

            if (groupMember.joined === 1) {
                return res.status(400).json(Respuesta.error(null, "La solicitud ya ha sido aceptada", "SOLICITUD_YA_ACEPTADA"));
            }

            groupMember.joined = 1;
            groupMember.joined_at = new Date();
            await groupMember.save();

            return res.json(Respuesta.exito(groupMember, "Solicitud de unión al grupo aceptada"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al aceptar la solicitud de unión al grupo" + error, "ERROR_AL_ACEPTAR_SOLICITUD"));
        }
    }

    async rejectGroupJoinRequest(req, res) {
        try {
            const uid = req.uid;
            const groupId = req.params.id;

            if (!uid || !groupId) {
                return res.status(400).json(Respuesta.error(null, "El uid y el id del grupo son requeridos", "UID_Y_ID_GRUPO_REQUERIDOS"));
            }

            const groupMember = await GroupMembers.findOne({
                where: {
                    [Op.and]: [
                        { user: uid },
                        { groups: groupId },
                        { joined: 0 }
                    ]
                }
            });

            if (!groupMember) {
                return res.status(404).json(Respuesta.error(null, "No se encontró la solicitud de unión al grupo", "SOLICITUD_NO_ENCONTRADA"));
            }

            if (groupMember.user !== uid) {
                return res.status(403).json(Respuesta.error(null, "No tienes permiso para rechazar esta solicitud", "PERMISO_DENEGADO"));
            }

            if (groupMember.joined === 1) {
                return res.status(400).json(Respuesta.error(null, "La solicitud ya ha sido aceptada", "SOLICITUD_YA_ACEPTADA"));
            }

            const groupMemberId = groupMember.id;

            await groupMember.destroy();

            return res.json(Respuesta.exito(groupMemberId, "Solicitud rechazada"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al aceptar la solicitud de unión al grupo" + error, "ERROR_AL_ACEPTAR_SOLICITUD"));
        }
    }

    async acceptGroupJoinRequestNotification(req, res) {
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

            const groupMember = await GroupMembers.findOne({
                where: {
                    id: notification.entity_id,
                }
            });

            if (!groupMember) {
                return res.status(404).json(Respuesta.error(null, "No se encontró la solicitud de unión al grupo", "SOLICITUD_NO_ENCONTRADA"));
            }

            if (groupMember.user !== uid) {
                return res.status(403).json(Respuesta.error(null, "No tienes permiso para aceptar esta solicitud", "PERMISO_DENEGADO"));
            }

            if (groupMember.joined === 1) {
                return res.status(400).json(Respuesta.error(null, "La solicitud ya ha sido aceptada", "SOLICITUD_YA_ACEPTADA"));
            }

            groupMember.joined = 1;
            groupMember.joined_at = new Date();
            await sequelize.transaction(async (t) => {
                await groupMember.save({ transaction: t });
                await notification.destroy({ transaction: t });
            });

            return res.json(Respuesta.exito(groupMember, "Solicitud de unión al grupo aceptada"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al aceptar la solicitud de unión al grupo" + error, "ERROR_AL_ACEPTAR_SOLICITUD"));
        }
    }

    async rejectGroupJoinRequestNotification(req, res) {
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

            const groupMember = await GroupMembers.findOne({
                where: {
                    id: notification.entity_id,
                }
            });

            if (!groupMember) {
                return res.status(404).json(Respuesta.error(null, "No se encontró la solicitud de unión al grupo", "SOLICITUD_NO_ENCONTRADA"));
            }

            if (groupMember.user !== uid) {
                return res.status(403).json(Respuesta.error(null, "No tienes permiso para rechazar esta solicitud", "PERMISO_DENEGADO"));
            }

            if (groupMember.joined === 1) {
                return res.status(400).json(Respuesta.error(null, "La solicitud ya ha sido aceptada", "SOLICITUD_YA_ACEPTADA"));
            }

            await sequelize.transaction(async (t) => {
                await groupMember.destroy({ transaction: t });
                await notification.destroy({ transaction: t });
            });

            return res.json(Respuesta.exito(null, "Solicitud rechazada"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al aceptar la solicitud de unión al grupo" + error, "ERROR_AL_ACEPTAR_SOLICITUD"));
        }
    }

    async getJoinRequests(req, res) {
        try {
            const uid = req.uid;
            if (!uid) {
                return res.status(400).json(Respuesta.error(null, "Usuario desconocido", "UID_REQUIRED"));
            }
            const joinRequests = await GroupMembers.findAll({
                where: {
                    [Op.and]: [
                        { user: uid },
                        { joined: 0 },
                    ]
                }
            });

            return res.json(Respuesta.exito(joinRequests, "Solicitudes de grupos recuperados"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al recuperar las solicitudes de grupos" + error, "ERROR_GETTING_GROUP_REQUESTS"));
        }
    }
}

module.exports = new GrupoController();