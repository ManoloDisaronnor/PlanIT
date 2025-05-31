const Respuesta = require("../utils/respuesta.js");
const admin = require("../config/firebase-admin.js");
const initModels = require("../models/init-models.js").initModels;
const sequelize = require("../config/sequelize.js");
const models = initModels(sequelize);
const axios = require("axios");

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const DOMAIN = process.env.DOMINIO || "http:192.168.1.11//:4200";
const { OAuth2Client } = require('google-auth-library');

const oAuth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}auth/google-callback`
);

const Usuario = models.user;

class AuthController {

    async loginWithEmailAndPassword(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json(Respuesta.error(null, "Email y contraseña son obligatorios", "CAMPOS_OBLIGATORIOS"));
            }
            if (!email.includes("@")) {
                return res.status(400).json(Respuesta.error(null, "El email no es válido", "EMAIL_INVALIDO"));
            }
            if (password.length < 6) {
                return res.status(400).json(Respuesta.error(null, "La contraseña debe tener al menos 6 caracteres", "CONTRASENA_CORTA"));
            }

            // COMPROBACIÓN PARA SABER SI EXISTE EL EMAIL ANTES DE INICIAR SESIÓN
            try {
                await admin.auth().getUserByEmail(email);
            } catch (emailError) {
                return res.status(404).json(Respuesta.error(null, "No existe una cuenta con este email", "EMAIL_NOT_FOUND"));
            }

            const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    returnSecureToken: true
                })
            });

            if (!response.ok) {
                return res.status(400).json(Respuesta.error(null, "Contraseña incorrecta", "ERROR_AUTENTICACION"));
            }

            const data = await response.json();

            const idToken = data.idToken;

            const expiresIn = 60 * 60 * 24 * 1 * 1000;
            const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

            res.cookie('session', sessionCookie, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: expiresIn,
                sameSite: 'strict'
            });

            const userRecord = await admin.auth().getUser(data.localId);

            return res.json(Respuesta.exito({
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
            }, "Inicio de sesión exitoso"));

        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al iniciar sesión: " + error.message, "ERROR_INICIO_SESION"));
        }
    }

    async logout(req, res) {
        try {
            res.clearCookie('session', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });
            return res.json(Respuesta.exito(null, "Sesión cerrada correctamente"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al cerrar sesión: " + error.message, "ERROR_CERRAR_SESION"));
        }
    }

    async insertFirebaseUser(req, res) {
        try {
            const user = req.body;
            const firebaseUser = await admin.auth().createUser({
                email: user.email,
                password: user.password,
                emailVerified: false,
                disabled: false
            });

            const userToken = await admin.auth().createCustomToken(firebaseUser.uid);

            const { data } = await axios.post(
                `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
                { token: userToken, returnSecureToken: true }
            );

            const expiresIn = 60 * 60 * 24 * 1 * 1000;
            const sesionCookie = await admin.auth().createSessionCookie(data.idToken, { expiresIn });

            res.cookie('session', sesionCookie, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: expiresIn,
                sameSite: 'strict'
            });

            return res.json(Respuesta.exito(firebaseUser, "Usuario registrado en firebase"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al crear el usuario" + error, "ERROR_AL_CREAR_USUARIO"));
        }
    }

    async checkAuthStatus(req, res) {
        try {
            const sessionCookie = req.cookies.session;

            if (!sessionCookie) {
                return res.status(401).json(Respuesta.error(null, "No autorizado - Cookie no presente", "NO_AUTENTICADO"));
            }

            try {
                const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
                const uid = decodedClaims.uid;

                const user = await Usuario.findOne({ where: { uid } });

                return res.json(Respuesta.exito({
                    firebaseAuthenticated: true,
                    userConfigured: !!user,
                    userData: user || null
                }, "Estado de autenticación verificado"));

            } catch (firebaseError) {
                console.error("Error al verificar la autenticación de Firebase:", firebaseError);
                let mensaje = 'Error de autenticación';
                let codError = 'ERROR_AUTENTICACION';

                if (firebaseError.code === 'auth/session-cookie-expired') {
                    mensaje = "Sesión expirada";
                    codError = "SESION_EXPIRADA";
                } else if (firebaseError.code === 'auth/session-cookie-revoked' || firebaseError.code === 'auth/user-disabled') {
                    mensaje = "Sesión inválida";
                    codError = "SESION_INVALIDA";
                }

                return res.status(401).json(Respuesta.error({
                    firebaseAuthenticated: false,
                    userConfigured: false
                }, mensaje, codError));
            }
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al verificar el estado de autenticación: " + error, "ERROR_VERIFICACION"));
        }
    }

    async getGoogleAuthUrl(req, res) {
        try {
            const authorizeUrl = oAuth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: ['email', 'profile'],
                prompt: 'consent'
            });

            return res.json({ url: authorizeUrl });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Error generating Google URL' });
        }
    }

    async handleGoogleCallback(req, res) {
        try {
            const { code } = req.query;

            const { tokens } = await oAuth2Client.getToken(code);
            oAuth2Client.setCredentials(tokens);

            const ticket = await oAuth2Client.verifyIdToken({
                idToken: tokens.id_token,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            const payload = ticket.getPayload();

            let userRecord;
            try {
                userRecord = await admin.auth().getUserByEmail(payload.email);
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    userRecord = await admin.auth().createUser({
                        email: payload.email,
                        displayName: payload.name,
                        photoURL: payload.picture,
                        emailVerified: true,
                    });
                } else {
                    throw error;
                }
            }
            const firebaseCustomToken = await admin.auth().createCustomToken(userRecord.uid);

            const { data } = await axios.post(
                `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
                { token: firebaseCustomToken, returnSecureToken: true }
            );

            const firebaseIdToken = data.idToken;
            const expiresIn = 86400 * 1000;
            const sessionCookie = await admin.auth().createSessionCookie(firebaseIdToken, {
                expiresIn: expiresIn
            });

            res.cookie('session', sessionCookie, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: expiresIn,
                sameSite: 'strict'
            });

            res.redirect(DOMAIN + '/google-auth-callback?token=' + tokens.id_token);
        } catch (error) {
            console.error('Google callback error:', error);
            res.redirect(DOMAIN + '/auth/login');
        }
    }

}

module.exports = new AuthController();