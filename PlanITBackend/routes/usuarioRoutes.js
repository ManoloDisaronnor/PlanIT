const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const firebaseAuth = require('../middlewares/firebaseAuth');
const uploadUser = require('../middlewares/multerUserConfig');

router.get('/', firebaseAuth, usuarioController.getAllUsuarios);
router.get('/getuser/:uid', usuarioController.getUsuarioByUid);
router.get('/checkusername/:username', usuarioController.checkUsernameAvailability);
router.post('/uploadprofilepicture', firebaseAuth, uploadUser.single('profileImage'), usuarioController.uploadProfilePicture);
router.post('/setupconfiguration', firebaseAuth ,usuarioController.configureProfile);

module.exports = router;