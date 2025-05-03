const Respuesta = require("../utils/respuesta.js");
// Recuperar función de inicialización de modelos
const initModels = require("../models/init-models.js").initModels;
// Crear la instancia de sequelize con la conexión a la base de datos
const sequelize = require("../config/sequelize.js");
const { Op } = require("sequelize");

const models = initModels(sequelize);
const Grupo = models.groups;
const GroupMembers = models.groupMember;

class GrupoController {

    async getGroupsForUser(req, res) {
        try {
            const { uid } = req.params;
            if (!uid) {
                return res.status(400).json(Respuesta.error(null, "El uid es requerido", "UID_REQUIRED"));
            }
            const grupos = await GroupMembers.findAll({
                where: { user: uid },
                attributes: ["admin", "joined"],
                include: {
                    model: Grupo,
                    as: "groups_group"
                },
            });
            if (!grupos || grupos.length === 0) {
                return res.status(404).json(Respuesta.error(null, "No se encontraron grupos para el usuario", "NO_GROUPS_FOUND"));
            }
            return res.json(Respuesta.exito(grupos, "Grupos recuperados"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al recuperar los grupos" + error, "ERROR_AL_OBTENER_GRUPOS"));
        }
    }

    async createGrupo(req, res) {
        try {
            const grupo = await Grupo.create(req.body);
            return res.json(Respuesta.exito(grupo, "Grupo creado"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al crear el grupo" + error, "ERROR_AL_CREAR_GRUPO"));
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
                    [ Op.and ]: [
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