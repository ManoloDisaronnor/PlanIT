const { Server } = require("socket.io");
const express = require('express');
const mensajeController = require('../controllers/mensajeController');

async function setupSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: "http://localhost:4200",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('Usuario conectado');

        socket.on('disconnect', () => {
            console.log('Usuario desconectado');
        });

        socket.on('chat message', async (msg) => {
            const mensajeEmitir = {
                id: null,
                id_grupo: msg.id_grupo,
                id_usuario: msg.id_usuario,
                mensaje: msg.mensaje,
            }
            const mensajeAEmitir = await mensajeController.guardarNuevoMensaje(mensajeEmitir);
            io.emit('chat message', mensajeAEmitir);
        });
    });

    return io;
}

module.exports = setupSocket;