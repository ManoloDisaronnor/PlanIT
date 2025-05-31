const Respuesta = require("../utils/respuesta.js");
const sequelize = require("../config/sequelize.js");
const { Sequelize } = require("sequelize");

module.exports = async (req, res, next) => {
    try {
        const uid = req.uid;
        const eventId = req.params.eventId;

        if (!uid || !eventId) {
            return res.status(400).json(Respuesta.error('Faltan parámetros necesarios: uid o eventId', 'PARAMETROS_FALTANTES'));
        }

        const [permissionCheck] = await sequelize.query(`
            SELECT 
                e.id,
                e.founder,
                e.public,
                e.starts,
                e.ends,
                CASE 
                    WHEN e.founder = :uid THEN 1
                    WHEN e.public = 1 AND EXISTS (
                        SELECT 1 FROM user_joined_to_event ue 
                        WHERE ue.event = e.id AND ue.participant = :uid
                    ) THEN 1
                    WHEN e.public = 0 AND EXISTS (
                        SELECT 1 FROM group_invited_to_event ge
                        JOIN \`groups\` g ON ge.groups = g.id
                        JOIN group_member gm ON g.id = gm.groups
                        WHERE ge.event = e.id 
                        AND gm.user = :uid 
                        AND gm.joined = 1
                    ) THEN 1
                    ELSE 0
                END as can_upload
            FROM event e
            WHERE e.id = :eventId
        `, {
                replacements: { uid, eventId },
                type: Sequelize.QueryTypes.SELECT
            });

            const today = new Date();
            const eventStart = new Date(permissionCheck.starts);
            const eventEnd = new Date(permissionCheck.ends);
            const userCanUploadImages = (eventStart <= today && eventEnd >= today && permissionCheck.can_upload === 1);

        if (!permissionCheck) {
            return res.status(404).json(Respuesta.error('No tienes permisos para subir imagenes a este evento, el evento no existe o ha sido eliminado', 'NOT_FOUND'));
        }

        req.hasPermissionToUpload = userCanUploadImages;
        next();
    } catch (error) {
        return res.status(401).json(Respuesta.error('Error al comprobar si formas parte del evento: ' + error.message, 'UKNOWN_ERROR'));
    }
};