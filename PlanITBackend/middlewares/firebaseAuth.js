const admin = require('firebase-admin');
const Respuesta = require('../utils/respuesta');

module.exports = async (req, res, next) => {
    try {
        const sessionCookie = req.cookies.session;

        if (!sessionCookie) {
            return res.status(401).json(Respuesta.error(null, "No autorizado - Cookie no presente", "NO_AUTENTICADO"));
        }

        // Verificar la cookie de sesión
        const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);

        // Verificar que el usuario aún existe en Firebase
        const user = await admin.auth().getUser(decodedClaims.uid);

        // Adjuntar el UID al request para uso posterior
        req.uid = decodedClaims.uid;
        next();
    } catch (error) {
        let mensaje = "Error de autenticación";
        let codError = "ERROR_AUTENTICACION";

        if (error.code === 'auth/session-cookie-expired') {
            mensaje = "Sesión expirada";
            codError = "SESION_EXPIRADA";
        } else if (error.code === 'auth/session-cookie-revoked' || error.code === 'auth/user-disabled') {
            mensaje = "Sesión inválida";
            codError = "SESION_INVALIDA";
        }

        return res.status(401).json(Respuesta.error(null, mensaje, codError));
    }
};