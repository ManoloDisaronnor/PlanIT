const express = require('express');
const router = express.Router();
const grupoController = require('../controllers/grupoController');

router.get('/', grupoController.getAllGrupos);
router.post('/creargrupo', grupoController.createGrupo);

module.exports = router;