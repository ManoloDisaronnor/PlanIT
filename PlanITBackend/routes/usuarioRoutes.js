const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const upload = require('../middlewares/multerConfig');
const firebaseAuth = require('../middlewares/firebaseAuth');

router.get('/', usuarioController.getAllUsuarios);
router.get('/checkusername/:username', usuarioController.checkUsernameAvailability);
router.post('/uploadprofilepicture', firebaseAuth, upload.single('profileImage'), usuarioController.uploadProfilePicture);
router.post('/setupconfiguration', firebaseAuth ,usuarioController.configureProfile);

module.exports = router;