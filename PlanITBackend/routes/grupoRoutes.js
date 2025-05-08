const express = require('express');
const router = express.Router();
const grupoController = require('../controllers/grupoController');
const firebaseAuth = require('../middlewares/firebaseAuth');
const uploadGroup = require('../middlewares/multerGroupConfig');
const initModels = require("../models/init-models.js").initModels;
const sequelize = require("../config/sequelize.js");
const { idGeneratorMiddleware } = require("../services/id-generator.js");

const models = initModels(sequelize);
const Grupo = models.groups;

router.get('/usergroups', firebaseAuth, grupoController.getGroupsForUser);
router.post('/create', firebaseAuth, idGeneratorMiddleware(Grupo), uploadGroup.single('groupImage'), grupoController.createGruop);
router.put('/accept/:id', firebaseAuth, grupoController.acceptGroupJoinRequest);
router.delete('/reject/:id', firebaseAuth, grupoController.rejectGroupJoinRequest);
router.put('/acceptnotification/:id', firebaseAuth, grupoController.acceptGroupJoinRequestNotification);
router.delete('/rejectnotification/:id', firebaseAuth, grupoController.rejectGroupJoinRequestNotification);

module.exports = router;