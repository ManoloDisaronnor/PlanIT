const { customAlphabet } = require('nanoid');

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
const nanoid28 = customAlphabet(alphabet, 28);

async function generateUniqueId(model) {
    let id, exists;
    do {
        id = nanoid28();
        exists = await model.findOne({ where: { id } });
    } while (exists);
    return id;
}

// Middleware para generar un ID único
function idGeneratorMiddleware(model) {
    return async (req, res, next) => {
        try {
            req.id = await generateUniqueId(model);
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = {
    generateUniqueId,
    idGeneratorMiddleware
};