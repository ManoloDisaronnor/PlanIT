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

router.get('/reduced/:id', firebaseAuth, grupoController.getGrupoById);
router.get('/usergroups', firebaseAuth, grupoController.getGroupsForUser);
router.get('/createevent', firebaseAuth, grupoController.getCreateEvent);
router.get('/:id', firebaseAuth, grupoController.getGroupById);
router.post('/create', firebaseAuth, idGeneratorMiddleware(Grupo), uploadGroup.single('groupImage'), grupoController.createGruop);
router.put('/fix/:id', firebaseAuth, grupoController.toggleFix);
router.put('/accept/:id', firebaseAuth, grupoController.acceptGroupJoinRequest);
router.delete('/reject/:id', firebaseAuth, grupoController.rejectGroupJoinRequest);
router.put('/acceptnotification/:id', firebaseAuth, grupoController.acceptGroupJoinRequestNotification);
router.delete('/rejectnotification/:id', firebaseAuth, grupoController.rejectGroupJoinRequestNotification);
router.put('/leave/:id', firebaseAuth, grupoController.leaveGroup);
router.put('/toggleadmin/:id', firebaseAuth, grupoController.toggleAdmin);
router.post('/addmembers/:id', firebaseAuth, grupoController.addMembers);

module.exports = router;