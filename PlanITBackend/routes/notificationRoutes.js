const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const firebaseAuth = require('../middlewares/firebaseAuth');

router.get('/', firebaseAuth, notificationController.getUserNotifications);
router.get('/getunread', firebaseAuth, notificationController.getUnreadNotifications);
router.put('/markasread/:id', firebaseAuth, notificationController.markAsRead);
router.put('/read-all', firebaseAuth, notificationController.markAllAsRead);
router.put('/markasreadall', firebaseAuth, notificationController.markAllAsRead);
router.put('/hide/:id', firebaseAuth, notificationController.hideNotification);
router.put('/hidegroup/:id', firebaseAuth, notificationController.hideGroupNotification);

module.exports = router;