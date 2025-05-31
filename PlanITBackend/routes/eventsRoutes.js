const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventsController');
const firebaseAuth = require('../middlewares/firebaseAuth');
const { idGeneratorMiddleware, idGeneratorMiddleWareForEventImage } = require('../services/id-generator');
const initModels = require("../models/init-models.js").initModels;
const sequelize = require("../config/sequelize.js");
const uploadEvent = require('../middlewares/multerEventConfig.js');
const uploadEventImage = require('../middlewares/multerEventImagesConfig.js');
const checkUserJoinedEvent = require('../middlewares/checkUserJoinedEvent.js');

const models = initModels(sequelize);
const Event = models.event;
const EventImage = models.eventImages;

router.get('/discover', firebaseAuth, eventsController.getEventsDiscover);
router.get('/filters', eventsController.getFiltersReduced);
router.get('/allfilters', eventsController.getAllFilters);
router.get('/created', firebaseAuth, eventsController.getCreatedEvents);
router.get('/created/count', firebaseAuth, eventsController.getCreatedEventsCount);
router.get('/joined/reduced', firebaseAuth, eventsController.getJoinedEventsReduced);
router.get('/joined/count', firebaseAuth, eventsController.getJoinedEventsCount);
router.get('/future', firebaseAuth, eventsController.getFutureEvents);
router.get('/past', firebaseAuth, eventsController.getPastEvents);
router.get('/ongoing', firebaseAuth, eventsController.getOngoingEvents);
router.get('/details/:eventId', firebaseAuth, eventsController.getEventDetails);
router.post('/create', firebaseAuth, idGeneratorMiddleware(Event), uploadEvent.single('eventImage'), eventsController.createEvent);
router.post('/join/:eventId', firebaseAuth, eventsController.joinEvent);
router.post('/upload/:eventId', firebaseAuth, checkUserJoinedEvent, idGeneratorMiddleWareForEventImage(EventImage), uploadEventImage.single('file'), eventsController.uploadImageForEvent);

module.exports = router;