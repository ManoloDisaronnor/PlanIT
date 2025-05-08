const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'groups', req.id);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const id = req.id;
    const extension = path.extname(file.originalname);
    const filename = `${id}_groupimage${extension}`;
    cb(null, filename);
  }
});

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

const uploadGroup = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5
  }
});

module.exports = uploadGroup;