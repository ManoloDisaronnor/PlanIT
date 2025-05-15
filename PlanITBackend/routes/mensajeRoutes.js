const express = require('express');
const router = express.Router();
const mensajeController = require('../controllers/mensajeController');
const firebaseAuth = require('../middlewares/firebaseAuth');
const initModels = require("../models/init-models.js").initModels;
const sequelize = require("../config/sequelize.js");
const { idGeneratorMiddleware } = require("../services/id-generator.js");
const uploadMessage = require('../middlewares/multerMessageConfig.js');

const models = initModels(sequelize);
const Mensaje = models.message;

router.get('/unread', firebaseAuth, mensajeController.getUnreadMessages);
router.get('/:id', firebaseAuth, mensajeController.getMensajesGrupo);
router.get('/recent/:id', firebaseAuth, mensajeController.getMensajesRecientes);
router.get('/:id/before', firebaseAuth, mensajeController.getMensajesAntes);
router.get('/featured/:id', firebaseAuth, mensajeController.getMensajesDestacados);
router.post('/send/:id', firebaseAuth, idGeneratorMiddleware(Mensaje), uploadMessage.single('messageImage'), mensajeController.sendMessage);
router.get('/last/:id', firebaseAuth, mensajeController.getLastMessage);
router.put('/read/:id', firebaseAuth, mensajeController.markMessageAsRead);
router.put('/read-all/:id', firebaseAuth, mensajeController.markAllMessagesAsRead);
router.put('/feature/:id', firebaseAuth, mensajeController.featureMessage);
router.delete('/delete/:id', firebaseAuth, mensajeController.deleteMessage);

module.exports = router;