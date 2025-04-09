const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar multer para especificar dónde y cómo guardar los archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'profiles');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generar el nombre del archivo usando el UID del usuario autenticado
    const uid = req.uid; // Obtenido del middleware firebaseAuth
    const extension = path.extname(file.originalname);
    const filename = `${uid}_profile${extension}`;
    cb(null, filename);
  }
});

// Filtrar para aceptar solo ciertos tipos de archivos
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb({
      message: 'El archivo debe ser una imagen',
      code: 'TIPO_ARCHIVO_INVALIDO'
    }, false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // Limitar a 5MB
  }
});

module.exports = upload;