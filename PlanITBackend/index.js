require('dotenv').config({
    path: `.env.${process.env.NODE_ENV || 'development'}`
});
const config = require("./config/config");
const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const grupoRoutes = require("./routes/grupoRoutes");
const mensajeRoutes = require("./routes/mensajeRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const authRoutes = require("./routes/authRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const friendRoutes = require("./routes/friendsRoutes");
const eventsRoutes = require("./routes/eventsRoutes");
const app = express();
const http = require('http');
const { setupSocket } = require('./services/socket-service');
if (process.env.NODE_ENV === "development") {
    app.use(cors({
        origin: ["http://localhost:4200"],
        credentials: true,
    }));
}
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use("/api/grupos", grupoRoutes);
app.use("/api/mensajes", mensajeRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/auth", authRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
const server = http.createServer(app);
setupSocket(server);
if (process.env.NODE_ENV !== "test") {
    server.listen(config.port, () => {
        console.log(`Servidor escuchando en el puerto ${ config.port }`);
    });
}
module.exports = app;
