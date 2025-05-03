const express = require('express');
const router = express.Router();
const friendsController = require('../controllers/friendsController');
const firebaseAuth = require('../middlewares/firebaseAuth');

router.get('/', firebaseAuth, friendsController.getAllFriends);
router.get('/getrequests', firebaseAuth, friendsController.getFriendRequests);
router.post('/request', firebaseAuth, friendsController.friendRequest);
router.put('/accept/:id', firebaseAuth, friendsController.acceptFriendRequest);
router.delete('/reject/:id', firebaseAuth, friendsController.rejectFriendRequest);

module.exports = router;