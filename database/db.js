//2 - Invocamos a pg y realizamos la conexión
const { Pool } = require('pg');
const pool = new Pool({
    // Con variables de entorno
    host     : process.env.DB_HOST,
    user     : process.env.DB_USER,
    password : process.env.DB_PASS,
    database : process.env.DB_DATABASE,
    port     : process.env.DB_PORT,  // Asegúrate de definir el puerto si es necesario
});

// Verificamos la conexión

module.exports = pool;
