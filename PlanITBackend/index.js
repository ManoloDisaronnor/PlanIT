require('dotenv').config({
    path: `.env.${process.env.NODE_ENV || 'development'}`
});

// Importar fichero de configuración con variables de entorno
const config = require("./config/config");
const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Importar gestores de rutas
const grupoRoutes = require("./routes/grupoRoutes");
const mensajeRoutes = require("./routes/mensajeRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();
const http = require('http');
const setupSocket = require('./services/socket-service');

// Habilitar CORS en modo desarrollo
if (process.env.NODE_ENV === "development") {
    app.use(cors({
        origin: "http://localhost:4200",
        credentials: true,
    }));
}

app.use(cookieParser());

// **Middleware para parsear JSON y datos de formularios**
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Definir rutas
app.use("/api/grupos", grupoRoutes);
app.use("/api/mensajes", mensajeRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/auth", authRoutes);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, "public")));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const server = http.createServer(app);
setupSocket(server);

// Iniciar servidor si no estamos en modo test
if (process.env.NODE_ENV !== "test") {
    server.listen(config.port, () => {
        console.log(`Servidor escuchando en el puerto ${config.port}`);
    });
}

module.exports = app;