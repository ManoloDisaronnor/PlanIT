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

async function generateUniqueEventImage(req, model) {
    let value, exists;
    do {
        value = nanoid28();
        const route = 'uploads/events/' + req.params.eventId + '/images/' + value + '_eventimage.jpg';
        exists = await model.findOne({ where: { imageUrl: route } });
    } while (exists);
    return value;
}

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

function idGeneratorMiddleWareForEventImage(model) {
    return async (req, res, next) => {
        try {
            req.imageUrl = await generateUniqueEventImage(req, model);
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = {
    generateUniqueId,
    idGeneratorMiddleware,
    generateUniqueEventImage,
    idGeneratorMiddleWareForEventImage
};