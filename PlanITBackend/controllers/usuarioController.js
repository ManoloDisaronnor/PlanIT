const Respuesta = require("../utils/respuesta.js");
// Recuperar función de inicialización de modelos
const initModels = require("../models/init-models.js").initModels;
// Crear la instancia de sequelize con la conexión a la base de datos
const sequelize = require("../config/sequelize.js");

const models = initModels(sequelize);
const Usuario = models.user;

class UsuarioController {

    async getAllUsuarios(req, res) {
        try {
            const usuarios = await Usuario.findAll();
            return res.json(Respuesta.exito(usuarios, "usuarios recuperados"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al recuperar los usuarios" + error, "ERROR_AL_OBTENER_USUARIOS"));
        }
    }

    async checkUsernameAvailability(req, res) {
        try {
            const username = req.params.username;
            if (!username) {
                return res.status(400).json(Respuesta.error(null, "No se ha proporcionado un nombre de usuario", "NO_USERNAME_PROVIDED"));
            }
            const user = await Usuario.findOne({ where: { username } });
            if (user) {
                return res.status(409).json(Respuesta.error(null, "El nombre de usuario ya está en uso", "USERNAME_ALREADY_IN_USE"));
            }
            return res.json(Respuesta.exito(null, "El nombre de usuario está disponible"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al comprobar la disponibilidad del nombre de usuario" + error, "ERROR_AL_COMPROBAR_NOMBRE_USUARIO"));
        }
    }

    async uploadProfilePicture(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json(Respuesta.error(null, "No se ha subido ningún archivo", "NO_ARCHIVO_SUBIDO"));
            }
            const fileUrl = `/uploads/profiles/${req.file.filename}`;

            return res.json(Respuesta.exito({ fileUrl }, "Imagen subida correctamente"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al subir la imagen: " + error, "ERROR_AL_SUBIR_IMAGEN"));
        }
    }

    async configureProfile(req, res) {
        const userConfiguration = req.body;
        try {
            if (!userConfiguration) {
                return res.status(400).json(Respuesta.error(null, "No se ha podido completar el proceso de configuración, los datos de configuración del usuario parecen estar vacios", "NO_USER_CONFIGURATION"));
            }
            if (!userConfiguration.name || !userConfiguration.username || !userConfiguration.birthdate || !userConfiguration.gender) {
                return res.status(400).json(Respuesta.error(null, "No se ha podido completar el proceso de configuración, por favor vuelva a intentarlo completando obligatoriamente los campos; 'nombre', 'nombre de usuario', 'fecha de nacimiento', 'genero'", "UK_VIOLATION"));
            }
            if (await Usuario.findOne({ where: { uid: userConfiguration.uid } })) {
                return res.status(400).json(Respuesta.error(null, "No se ha podido completar el proceso de configuración, el usuario ya ha sido configurado", "USER_ALREADY_CONFIGURED"));
            }
            if (await Usuario.findOne({ where: { username: userConfiguration.username } })) {
                return res.status(400).json(Respuesta.error(null, "No se ha podido completar el proceso de configuración, el nombre de usuario ya está en uso", "USERNAME_ALREADY_IN_USE"));
            }
            if (userConfiguration.uid !== req.uid) {
                return res.status(403).json(Respuesta.error(null, "No se ha podido completar el proceso de configuración, el uid del usuario no coincide con el uid del token", "UID_MISMATCH"));
            }
            const uidUsuario = await Usuario.create(userConfiguration);
            return res.json(Respuesta.exito(uidUsuario, "Perfil configurado correctamente"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al configurar el perfil: " + error, "ERROR_CONFIG_USER"));
        }
    }
}

module.exports = new UsuarioController();