const Respuesta = require("../utils/respuesta.js");
// Recuperar función de inicialización de modelos
const initModels = require("../models/init-models.js").initModels;
// Crear la instancia de sequelize con la conexión a la base de datos
const sequelize = require("../config/sequelize.js");

const models = initModels(sequelize);
const Grupo = models.grupo;

class GrupoController {

    async getAllGrupos(req, res) {
        try {
            const grupos = await Grupo.findAll();
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
}

module.exports = new GrupoController();