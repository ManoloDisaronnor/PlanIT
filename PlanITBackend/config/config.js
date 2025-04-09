require('dotenv').config({
    path: `.env.${process.env.NODE_ENV || 'development'}`
  });

  // Creación de variables de entorno en el fichero config, para que se puedan utilizar en cualquier parte de la aplicación
  //  sin tener que recalcular las process.env cada vez que se importe el fichero config.
  const {
    NODE_ENV: nodeEnv = 'development',
    PORT: port = 3000,
    DB_HOST: dbHost = 'localhost',
    DB_USER: dbUser = 'root',
    DB_PASSWORD: dbPassword = 'test',
    DB_NAME: dbName = 'planit',
    DB_PORT: dbPort = 3306
  } = process.env;
  
  module.exports = {
    port: port,
    db: {
      host: dbHost || "localhost",
      user: dbUser || "root",
      password: dbPassword || "test",
      name: dbName || "planit",
      port: dbPort || 3306,
    }
  };