const express = require('express');
const router = express.Router();
const mensajeController = require('../controllers/mensajeController');

router.get('/:idgrupo', mensajeController.getMensajesGrupo);
router.post('/enviarmensaje', mensajeController.sendMensaje);

module.exports = router;