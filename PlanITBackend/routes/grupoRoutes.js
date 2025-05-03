const express = require('express');
const router = express.Router();
const grupoController = require('../controllers/grupoController');
const firebaseAuth = require('../middlewares/firebaseAuth');

router.get('/joinrequests', firebaseAuth, grupoController.getJoinRequests);
router.get('/getgroups/:uid', firebaseAuth, grupoController.getGroupsForUser);
router.post('/creargrupo', firebaseAuth, grupoController.createGrupo);

module.exports = router;