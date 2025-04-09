const Respuesta = require("../utils/respuesta.js");
// Recuperar función de inicialización de modelos
const initModels = require("../models/init-models.js").initModels;
// Crear la instancia de sequelize con la conexión a la base de datos
const sequelize = require("../config/sequelize.js");

const models = initModels(sequelize);
const Mensaje = models.mensaje;
const Usuario = models.usuario;

class MensajeController {

    async getMensajesGrupo(req, res) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : 5;
            const offset = req.query.offset ? parseInt(req.query.offset) : 0;

            const mensajes = await Mensaje.findAll({
                where: {
                    id_grupo: req.params.idgrupo
                },
                include: [
                    {
                        model: Usuario,
                        as: "usuario"
                    }
                ],
                limit,
                offset
            });
            return res.json(Respuesta.exito(mensajes, "Mensajes recuperados"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al recuperar los mensajes" + error, "ERROR_AL_OBTENER_MENSAJES"));
        }
    }

    async sendMensaje(req, res) {
        try {
            const mensaje = await Mensaje.create(req.body);
            return res.json(Respuesta.exito(mensaje, "Mensaje enviado"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al enviar el mensaje" + error, "ERROR_AL_ENVIAR_MENSAJE"));
        }
    }

    async guardarNuevoMensaje(mensaje) {
        try {
            const msg = await Mensaje.create(mensaje);
            const nuevoMensaje = await Mensaje.findByPk(msg.id, {
                include: [
                    {
                        model: Usuario,
                        as: "usuario"
                    }
                ]
            });
            return nuevoMensaje;
        } catch (error) {
            return null;
        }
    }
}

module.exports = new MensajeController();