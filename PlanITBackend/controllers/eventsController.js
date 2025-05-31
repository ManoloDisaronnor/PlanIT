const Respuesta = require("../utils/respuesta.js");
const initModels = require("../models/init-models.js").initModels;
const sequelize = require("../config/sequelize.js");
const { Op, Sequelize, where } = require("sequelize");
const models = initModels(sequelize);

const Filter = models.filter;
const Event = models.event;
const GroupEvents = models.groupInvitedToEvent;
const GroupFilters = models.eventsFilter;
const GroupMembers = models.groupMember;
const Group = models.groups;
const User = models.user;
const UserEvents = models.userJoinedToEvent;
const UploadEvent = models.eventImages;

class EventsController {

    async getEventsDiscover(req, res) {
        try {
            const uid = req.uid;
            const limit = parseInt(req.query.limit) || 10;
            const offset = parseInt(req.query.offset) || 0;
            const userLat = req.query.userLat ? parseFloat(req.query.userLat) : null;
            const userLng = req.query.userLng ? parseFloat(req.query.userLng) : null;
            const searchLat = req.query.searchLat ? parseFloat(req.query.searchLat) : null;
            const searchLng = req.query.searchLng ? parseFloat(req.query.searchLng) : null;

            let selectedFilters = null;
            if (req.query.filters) {
                try {
                    selectedFilters = JSON.parse(req.query.filters);
                } catch (error) {
                    console.error('Error al parsear filtros:', error);
                }
            }

            let referenceLat = null;
            let referenceLng = null;

            if (searchLat && searchLng) {
                referenceLat = searchLat;
                referenceLng = searchLng;
            } else if (userLat && userLng) {
                referenceLat = userLat;
                referenceLng = userLng;
            }

            let orderClause = [['starts', 'ASC']];

            if (referenceLat !== null && referenceLng !== null) {
                orderClause = [
                    Sequelize.literal(`
                    (6371 * acos(
                        cos(radians(${referenceLat})) * 
                        cos(radians(lat)) * 
                        cos(radians(lng) - radians(${referenceLng})) + 
                        sin(radians(${referenceLat})) * 
                        sin(radians(lat))
                    ))
                `),
                    ['starts', 'ASC']
                ];
            }

            let whereConditions = {
                [Op.and]: [
                    {
                        public: 1
                    },
                    {
                        ends: {
                            [Op.gte]: new Date()
                        }
                    },
                    {
                        founder: {
                            [Op.ne]: uid
                        }
                    },
                    Sequelize.literal(`
                    NOT EXISTS (
                        SELECT 1 
                        FROM user_joined_to_event uje
                        WHERE uje.event = \`event\`.id 
                        AND uje.participant = '${uid}'
                    )
                `)
                ]
            };

            let includeConfig = [
                {
                    model: Filter,
                    as: 'filters_filters',
                    attributes: ['type', 'filter']
                },
                {
                    model: User,
                    as: 'founder_user',
                    attributes: ['username', 'imageUrl'],
                }
            ];

            if (selectedFilters && selectedFilters.length > 0) {
                const filterValues = selectedFilters.map(f => f.filter);

                includeConfig[0] = {
                    model: Filter,
                    as: 'filters_filters',
                    attributes: ['type', 'filter'],
                    where: {
                        filter: {
                            [Op.in]: filterValues
                        }
                    },
                    required: true
                };
            }

            const events = await Event.findAll({
                where: whereConditions,
                include: includeConfig,
                order: orderClause,
                limit: limit,
                offset: offset,
            });

            return res.status(200).json(Respuesta.exito(events, "Eventos obtenidos con éxito", "EVENTOS_OBTENIDOS"));
        } catch (error) {
            console.error('Error en getEventsDiscover:', error);
            return res.status(500).json(Respuesta.error(null, "Error al obtener los eventos: " + error.message, "ERROR_OBTENER_EVENTOS"));
        }
    }

    async getFiltersReduced(req, res) {
        try {
            const filters = await Filter.findAll({
                attributes: ['type', 'filter'],
            });
            if (!filters || filters.length === 0) {
                return res.status(404).json(Respuesta.error(null, "No se encontraron filtros", "NO_HAY_FILTROS"));
            }

            return res.status(200).json(Respuesta.exito(filters, "Filtros obtenidos con éxito", "FILTROS_OBTENIDOS"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al obtener los filtros", "ERROR_OBTENER_FILTROS"));
        }
    }

    async getAllFilters(req, res) {
        try {
            const filters = await Filter.findAll({
                attributes: ['id', 'type', 'filter', 'description'],
            });

            if (!filters || filters.length === 0) {
                return res.status(404).json(Respuesta.error(null, "No se encontraron filtros", "NO_HAY_FILTROS"));
            }

            return res.status(200).json(Respuesta.exito(filters, "Filtros obtenidos con éxito", "FILTROS_OBTENIDOS"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al obtener los filtros", "ERROR_OBTENER_FILTROS"));
        }
    }

    async getCreatedEvents(req, res) {
        try {
            const uid = req.uid;
            const limit = parseInt(req.query.limit) || 10;
            const offset = parseInt(req.query.offset) || 0;

            const events = await Event.findAll({
                where: {
                    founder: uid,
                },
                include: [
                    {
                        model: Filter,
                        as: 'filters_filters',
                        attributes: ['type', 'filter']
                    },
                    {
                        model: User,
                        as: 'founder_user',
                        attributes: ['username', 'imageUrl'],
                    },
                    {
                        model: GroupEvents,
                        as: 'group_invited_to_events',
                        include: [
                            {
                                model: Group,
                                as: 'groups_group',
                                attributes: ['id', 'name', 'imageUrl']
                            }
                        ]
                    }

                ],
                order: [
                    ['created_at', 'DESC']
                ],
                limit: limit,
                offset: offset,
            });

            return res.status(200).json(Respuesta.exito(events, "Eventos creados obtenidos con éxito", "EVENTOS_OBTENIDOS"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al obtener los eventos creados: " + error.message, "ERROR_OBTENER_EVENTOS"));
        }
    }

    async getCreatedEventsCount(req, res) {
        try {
            const uid = req.uid;
            const count = await Event.count({
                where: {
                    founder: uid,
                }
            });
            return res.status(200).json(Respuesta.exito(count, "Cantidad de eventos creados obtenida con éxito", "CANTIDAD_EVENTOS_OBTENIDA"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al obtener la cantidad de eventos creados", "ERROR_OBTENER_CANTIDAD_EVENTOS"));
        }
    }

    async getJoinedEventsReduced(req, res) {
        try {
            const uid = req.uid;
            const limit = parseInt(req.query.limit) || 3;

            const today = new Date();

            const recentEventsJoined = await Event.findAll({
                where: {
                    [Op.and]: [
                        {
                            [Op.or]: [
                                { founder: uid },
                                Sequelize.literal(`
                                    EXISTS (
                                        SELECT 1 
                                        FROM group_invited_to_event ge
                                        JOIN \`groups\` g ON ge.groups = g.id
                                        JOIN group_member gm ON g.id = gm.groups
                                        WHERE ge.event = \`event\`.id AND gm.user = '${uid}' AND gm.joined = 1
                                    )
                                `),
                                Sequelize.literal(`
                                EXISTS (
                                    SELECT 1 
                                    FROM user_joined_to_event uje
                                    WHERE uje.event = \`event\`.id 
                                    AND uje.participant = '${uid}'
                                )
                            `)
                            ]
                        },
                        {
                            starts: {
                                [Op.lte]: today
                            }
                        }
                    ]
                },
                include: [
                    {
                        model: User,
                        as: 'founder_user',
                        attributes: ['username', 'imageUrl'],
                    },
                    {
                        model: GroupEvents,
                        as: 'group_invited_to_events',
                        include: [
                            {
                                model: Group,
                                as: 'groups_group',
                                attributes: ['id', 'name', 'imageUrl']
                            }
                        ]
                    }
                ],
                order: [['starts', 'DESC']],
                limit: limit,
            });

            return res.json(Respuesta.exito(recentEventsJoined, "Eventos a los que te has unido obtenidos con éxito", "EVENTOS_UNIDOS_OBTENIDOS"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al obtener los eventos a los que te has unido: " + error.message, "ERROR_OBTENER_EVENTOS_UNIDOS"));
        }
    }

    async getJoinedEventsCount(req, res) {
        try {
            const uid = req.uid;
            const count = await Event.count({
                where: {
                    [Op.or]: [
                        { founder: uid },
                        Sequelize.literal(`
                            EXISTS (
                                SELECT 1 
                                FROM group_invited_to_event ge
                                JOIN \`groups\` g ON ge.groups = g.id
                                JOIN group_member gm ON g.id = gm.groups
                                WHERE ge.event = \`event\`.id AND gm.user = '${uid}' AND gm.joined = 1
                            )
                        `),
                        Sequelize.literal(`
                        EXISTS (
                            SELECT 1 
                            FROM user_joined_to_event uje
                            WHERE uje.event = \`event\`.id 
                            AND uje.participant = '${uid}'
                        )
                    `)
                    ]
                }
            });
            return res.status(200).json(Respuesta.exito(count, "Cantidad de eventos a los que te has unido obtenida con éxito", "CANTIDAD_EVENTOS_UNIDOS_OBTENIDA"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al obtener la cantidad de eventos a los que te has unido: " + error.message, "ERROR_OBTENER_CANTIDAD_EVENTOS_UNIDOS"));
        }
    }

    async getFutureEvents(req, res) {
        try {
            const uid = req.uid;
            const limit = parseInt(req.query.limit) || 5;
            const offset = parseInt(req.query.offset) || 0;

            const today = new Date();

            const recentEventsJoined = await Event.findAll({
                where: {
                    [Op.and]: [
                        {
                            [Op.or]: [
                                { founder: uid },
                                Sequelize.literal(`
                                    EXISTS (
                                        SELECT 1 
                                        FROM group_invited_to_event ge
                                        JOIN \`groups\` g ON ge.groups = g.id
                                        JOIN group_member gm ON g.id = gm.groups
                                        WHERE ge.event = \`event\`.id AND gm.user = '${uid}' AND gm.joined = 1
                                    )
                                `),
                                Sequelize.literal(`
                                EXISTS (
                                    SELECT 1 
                                    FROM user_joined_to_event uje
                                    WHERE uje.event = \`event\`.id 
                                    AND uje.participant = '${uid}'
                                )
                            `)
                            ]
                        },
                        {
                            starts: {
                                [Op.gte]: today
                            }
                        }
                    ]
                },
                include: [
                    {
                        model: Filter,
                        as: 'filters_filters',
                        attributes: ['type', 'filter']
                    },
                    {
                        model: User,
                        as: 'founder_user',
                        attributes: ['username', 'imageUrl'],
                    },
                    {
                        model: GroupEvents,
                        as: 'group_invited_to_events',
                        include: [
                            {
                                model: Group,
                                as: 'groups_group',
                                attributes: ['id', 'name', 'imageUrl']
                            }
                        ]
                    }
                ],
                order: [['starts', 'ASC']],
                limit: limit,
                offset: offset,
            });

            return res.json(Respuesta.exito(recentEventsJoined, "Eventos futuros obtenidos con éxito", "EVENTOS_UNIDOS_OBTENIDOS"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al obtener los eventos futuros: " + error.message, "ERROR_OBTENER_EVENTOS_UNIDOS"));
        }
    }

    async getPastEvents(req, res) {
        try {
            const uid = req.uid;
            const limit = parseInt(req.query.limit) || 5;
            const offset = parseInt(req.query.offset) || 0;

            const today = new Date();

            const recentEventsJoined = await Event.findAll({
                where: {
                    [Op.and]: [
                        {
                            [Op.or]: [
                                { founder: uid },
                                Sequelize.literal(`
                                    EXISTS (
                                        SELECT 1 
                                        FROM group_invited_to_event ge
                                        JOIN \`groups\` g ON ge.groups = g.id
                                        JOIN group_member gm ON g.id = gm.groups
                                        WHERE ge.event = \`event\`.id AND gm.user = '${uid}' AND gm.joined = 1
                                    )
                                `),
                                Sequelize.literal(`
                                EXISTS (
                                    SELECT 1 
                                    FROM user_joined_to_event uje
                                    WHERE uje.event = \`event\`.id 
                                    AND uje.participant = '${uid}'
                                )
                            `)
                            ]
                        },
                        {
                            ends: {
                                [Op.lte]: today
                            }
                        }
                    ]
                },
                include: [
                    {
                        model: Filter,
                        as: 'filters_filters',
                        attributes: ['type', 'filter']
                    },
                    {
                        model: User,
                        as: 'founder_user',
                        attributes: ['username', 'imageUrl'],
                    },
                    {
                        model: GroupEvents,
                        as: 'group_invited_to_events',
                        include: [
                            {
                                model: Group,
                                as: 'groups_group',
                                attributes: ['id', 'name', 'imageUrl']
                            }
                        ]
                    }
                ],
                order: [['ends', 'DESC']],
                limit: limit,
                offset: offset,
            });

            return res.json(Respuesta.exito(recentEventsJoined, "Eventos pasados obtenidos con exito", "EVENTOS_UNIDOS_OBTENIDOS"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al obtener los eventos pasados: " + error.message, "ERROR_OBTENER_EVENTOS_UNIDOS"));
        }
    }

    async getOngoingEvents(req, res) {
        try {
            const uid = req.uid;
            const limit = parseInt(req.query.limit) || 5;
            const offset = parseInt(req.query.offset) || 0;

            const today = new Date();

            const ongoingEvents = await Event.findAll({
                where: {
                    [Op.and]: [
                        {
                            [Op.or]: [
                                { founder: uid },
                                Sequelize.literal(`
                                    EXISTS (
                                        SELECT 1 
                                        FROM group_invited_to_event ge
                                        JOIN \`groups\` g ON ge.groups = g.id
                                        JOIN group_member gm ON g.id = gm.groups
                                        WHERE ge.event = \`event\`.id AND gm.user = '${uid}' AND gm.joined = 1
                                    )
                                `),
                                Sequelize.literal(`
                                EXISTS (
                                    SELECT 1 
                                    FROM user_joined_to_event uje
                                    WHERE uje.event = \`event\`.id 
                                    AND uje.participant = '${uid}'
                                )
                            `)
                            ]
                        },
                        {
                            starts: {
                                [Op.lte]: today
                            },
                            ends: {
                                [Op.gte]: today
                            }
                        }
                    ]
                },
                include: [
                    {
                        model: Filter,
                        as: 'filters_filters',
                        attributes: ['type', 'filter']
                    },
                    {
                        model: User,
                        as: 'founder_user',
                        attributes: ['username', 'imageUrl'],
                    },
                    {
                        model: GroupEvents,
                        as: 'group_invited_to_events',
                        include: [
                            {
                                model: Group,
                                as: 'groups_group',
                                attributes: ['id', 'name', 'imageUrl']
                            }
                        ]
                    }
                ],
                order: [['starts', 'ASC']],
                limit: limit,
                offset: offset,
            });

            return res.json(Respuesta.exito(ongoingEvents, "Eventos en curso obtenidos con éxito", "EVENTOS_UNIDOS_OBTENIDOS"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al obtener los eventos en curso: " + error.message, "ERROR_OBTENER_EVENTOS_UNIDOS"));
        }
    }

    async getEventDetails(req, res) {
        try {
            const eventId = req.params.eventId;
            const uid = req.uid;

            if (!eventId) {
                return res.status(400).json(Respuesta.error(null, "ID del evento es obligatorio", "ID_EVENTO_OBLIGATORIO"));
            }

            const event = await Event.findOne({
                where: { id: eventId },
                include: [
                    {
                        model: Filter,
                        as: 'filters_filters',
                        attributes: ['type', 'filter', 'description']
                    },
                    {
                        model: User,
                        as: 'founder_user',
                        attributes: ['username', 'imageUrl'],
                    },
                    {
                        model: GroupEvents,
                        as: 'group_invited_to_events',
                        include: [
                            {
                                model: Group,
                                as: 'groups_group',
                                attributes: ['id', 'name', 'imageUrl']
                            }
                        ]
                    },
                    {
                        model: UserEvents,
                        as: 'user_joined_to_events',
                        include: [
                            {
                                model: User,
                                as: 'participant_user',
                                attributes: ['name', 'surname', 'username', 'imageUrl']
                            }
                        ]
                    },
                    {
                        model: UploadEvent,
                        as: 'event_images',
                        include: [
                            {
                                model: User,
                                as: 'userUploaded_user',
                                attributes: ['username', 'imageUrl']
                            }
                        ]
                    }
                ],
                order: [
                    [{ model: UploadEvent, as: 'event_images' }, 'uploaded_at', 'DESC']
                ]
            });

            if (!event) {
                return res.status(404).json(Respuesta.error(null, "No hemos podido localizar el evento que estabas buscando, puede que ya no este disponible o haya sido eliminado", "EVENTO_NO_ENCONTRADO"));
            }

            const [permissionCheck] = await sequelize.query(`
            SELECT 
                e.id,
                e.founder,
                e.public,
                e.starts,
                e.ends,
                CASE 
                    WHEN e.founder = :uid THEN 1
                    WHEN e.public = 1 AND EXISTS (
                        SELECT 1 FROM user_joined_to_event ue 
                        WHERE ue.event = e.id AND ue.participant = :uid
                    ) THEN 1
                    WHEN e.public = 0 AND EXISTS (
                        SELECT 1 FROM group_invited_to_event ge
                        JOIN \`groups\` g ON ge.groups = g.id
                        JOIN group_member gm ON g.id = gm.groups
                        WHERE ge.event = e.id 
                        AND gm.user = :uid 
                        AND gm.joined = 1
                    ) THEN 1
                    ELSE 0
                END as can_upload
            FROM event e
            WHERE e.id = :eventId
        `, {
                replacements: { uid, eventId },
                type: Sequelize.QueryTypes.SELECT
            });

            const today = new Date();
            const eventStart = new Date(permissionCheck.starts);
            const eventEnd = new Date(permissionCheck.ends);
            const userCanUploadImages = (eventStart <= today && eventEnd >= today && permissionCheck.can_upload === 1);

            return res.json(Respuesta.exito({ event, userCanUploadImages }, "Detalles del evento obtenidos con éxito", "DETALLES_EVENTO_OBTENIDOS"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al obtener los detalles del evento: " + error.message, "ERROR_OBTENER_DETALLES_EVENTO"));
        }
    }

    async createEvent(req, res) {
        try {
            const uid = req.uid;
            const groupsInvited = req.body.groups ? JSON.parse(req.body.groups) : [];
            const publicEvent = req.body.public === 'true';
            const location = req.body.location ? JSON.parse(req.body.location) : null;
            const filters = req.body.filters ? JSON.parse(req.body.filters) : [];
            const eventFormGroup = {
                id: req.id,
                name: req.body.name,
                description: req.body.description,
                public: req.body.public === 'true',
                starts: req.body.starts ? new Date(req.body.starts) : null,
                ends: req.body.ends ? new Date(req.body.ends) : null,
                lat: location ? location.lat : null,
                lng: location ? location.lng : null,
                founder: uid,
                imageUrl: req.file ? `uploads/events/${req.id}/${req.file.filename}` : null,
                created_at: new Date(),
            };

            if (!eventFormGroup.name || publicEvent === null || publicEvent === undefined || !eventFormGroup.starts || !eventFormGroup.ends || !location || !eventFormGroup.lat || !eventFormGroup.lng || !eventFormGroup.founder) {
                return res.status(400).json(Respuesta.error(null, "Faltan datos obligatorios para crear el evento", "DATOS_OBLIGATORIOS_FALTANTES"));
            }

            if (!publicEvent) {
                if (!groupsInvited || groupsInvited.length === 0) {
                    return res.status(400).json(Respuesta.error(null, "Debes especificar al menos un grupo al que invitar", "GRUPOS_OBLIGATORIOS_FALTANTES"));
                }
                for (const group of groupsInvited) {
                    const groupMember = await GroupMembers.findOne({
                        where: {
                            [Op.and]: [
                                { user: uid },
                                { groups: group.id }
                            ]
                        },
                        include: {
                            model: Group,
                            as: 'groups_group',
                            attributes: ['name']
                        },
                        attributes: ['joined']
                    });

                    if (!groupMember || groupMember.joined !== 1) {
                        const groupName = groupMember?.groups_group?.name || group.id;
                        return res.status(403).json(Respuesta.error(null, `No puedes invitar al grupo ${groupName} porque no perteneces a él`, "DOESN´T_BELONG_TO_GROUP"));
                    }
                }
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const minEndDate = new Date(eventFormGroup.starts);
            minEndDate.setHours(minEndDate.getHours() + 2);

            if (eventFormGroup.starts < today) {
                return res.status(400).json(Respuesta.error(null, "La fecha de inicio del evento no puede ser anterior a la fecha actual", "FECHA_INICIO_INVALIDA"));
            }

            const now = new Date();
            now.setHours(now.getHours() + 2);

            if (eventFormGroup.ends < now) {
                return res.status(400).json(Respuesta.error(null, "La fecha de finalización del evento debe ser al menos dos horas después a la hora actual", "FECHA_FIN_INVALIDA"));
            }

            if (eventFormGroup.ends < minEndDate) {
                return res.status(400).json(Respuesta.error(null, "La fecha de finalización del evento debe ser al menos 2 horas después de la fecha de inicio", "FECHA_FIN_INVALIDA"));
            }

            sequelize.transaction(async (transaction) => {
                const event = await Event.create(eventFormGroup, { transaction });
                if (filters && filters.length > 0) {
                    const filtersToCreate = filters.map(filter => ({
                        event: event.id,
                        filters: filter.id
                    }));
                    await GroupFilters.bulkCreate(filtersToCreate, { transaction });
                }
                if (!publicEvent) {
                    const groupsToCreate = groupsInvited.map(group => ({
                        event: event.id,
                        groups: group.id
                    }));
                    await GroupEvents.bulkCreate(groupsToCreate, { transaction });
                } else {
                    await UserEvents.create({
                        event: eventFormGroup.id,
                        participant: uid
                    }, { transaction });
                }
            });

            return res.json(Respuesta.exito(eventFormGroup, "Evento creado con éxito", "EVENTO_CREADO"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al crear el evento: " + error.message, "ERROR_CREAR_EVENTO"));
        }
    }

    async joinEvent(req, res) {
        try {
            const uid = req.uid;
            const eventId = req.params.eventId;

            if (!eventId) {
                return res.status(400).json(Respuesta.error(null, "ID del evento es obligatorio", "ID_EVENTO_OBLIGATORIO"));
            }

            const event = await Event.findOne({
                where: { id: eventId }
            });

            if (!event) {
                return res.status(404).json(Respuesta.error(null, "Evento no encontrado", "EVENTO_NO_ENCONTRADO"));
            }

            if (event.public === 0) {
                return res.status(403).json(Respuesta.error(null, "No puedes unirte a un evento privado sin ser invitado", "EVENTO_PRIVADO"));
            }

            const userEvent = await UserEvents.findOne({
                where: {
                    [Op.and]: [
                        { event: eventId },
                        { participant: uid }
                    ]
                }
            });

            if (userEvent) {
                return res.status(400).json(Respuesta.error(null, "Ya te has unido a este evento", "YA_UNIDO_EVENTO"));
            }

            const eventJoin = await UserEvents.create({
                event: eventId,
                participant: uid
            });

            return res.status(200).json(Respuesta.exito(eventJoin, "Te has unido al evento con éxito", "UNIDO_EVENTO"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al unirse al evento: " + error.message, "ERROR_UNIRSE_EVENTO"));
        }
    }

    async uploadImageForEvent(req, res) {
        try {
            const file = req.file;
            const uid = req.uid;
            const eventId = req.params.eventId;
            const hasPermissionToUpload = req.hasPermissionToUpload;

            if (!file) {
                return res.status(400).json(Respuesta.error(null, "No se ha subido correctamente el archivo", "ARCHIVO_IMAGEN_OBLIGATORIO"));
            }

            if (!hasPermissionToUpload) {
                return res.status(403).json(Respuesta.error(null, "No tienes permisos para subir imágenes a este evento", "NO_TIENE_PERMISOS_SUBIR_IMAGENES"));
            }

            const imageEvent = await UploadEvent.create({
                event: eventId,
                imageUrl: file.filename,
                userUploaded: uid,
                uploaded_at: new Date()
            });

            return res.status(200).json(Respuesta.exito(imageEvent, "Imagen del evento subida con éxito", "IMAGEN_EVENTO_SUBIDA"));
        } catch (error) {
            return res.status(500).json(Respuesta.error(null, "Error al subir la imagen del evento: " + error.message, "ERROR_SUBIR_IMAGEN_EVENTO"));
        }
    }
}

module.exports = new EventsController();