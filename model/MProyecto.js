const pool = require('../database/db');

class MProyecto {
    constructor() {
        this.table = 'proyecto';
    }

    async listarProyectos() {
        try {
            const sql = `SELECT * FROM ${this.table}`;
            const { rows } = await pool.query(sql); // pool.query en lugar de connection.promise().query
            console.log("CONTENIDO:", rows);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    async update(id, newData) {
        try {
            console.log("UPDATE", newData);
            const sql = `UPDATE ${this.table} SET objetos = $1 WHERE id = $2`;
            await pool.query(sql, [JSON.stringify(newData), id]); // Usa pool.query con placeholders
        } catch (error) {
            throw error;
        }
    }

    async crearProyecto(Proyecto) {
        try {
            const sql = `INSERT INTO ${this.table} (name, link, user_id) VALUES ($1, $2, $3) RETURNING id`;
            const values = [Proyecto.name, Proyecto.link, Proyecto.user_id]; // Definir columnas y valores explícitamente
            const { rows } = await pool.query(sql, values);
            return rows[0].id; // PostgreSQL devuelve filas en un objeto 'rows'
        } catch (error) {
            throw error;
        }
    }

    async find(id) {
        try {
            const sql = `SELECT * FROM ${this.table} WHERE id = $1`;
            const { rows } = await pool.query(sql, [id]); // Usa pool.query con placeholders
            if (rows.length === 1) {
                return rows[0]; // Retorna el primer y único resultado
            } else {
                throw new Error('Proyecto no encontrado'); // Si no se encontró ninguna tupla con ese ID
            }
        } catch (error) {
            throw error;
        }
    }
}

module.exports = MProyecto;
