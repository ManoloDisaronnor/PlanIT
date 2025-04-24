const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const firebaseAuth = require('../middlewares/firebaseAuth');

router.get('/checkauthstatus', firebaseAuth, authController.checkAuthStatus);
router.post('/firebasesignup', authController.insertFirebaseUser);
router.post('/login', authController.loginWithEmailAndPassword);
router.post('/logout', authController.logout);
router.get('/google-auth-url', authController.getGoogleAuthUrl);
router.get('/google-callback', authController.handleGoogleCallback);

module.exports = router;