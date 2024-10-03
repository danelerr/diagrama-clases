const express = require("express");
const router = express.Router();

const pool = require('../database/db');


/* importamos el Model */
const MProyecto = require('../model/MProyecto');
const mProyecto = new MProyecto();

const bcrypt = require('bcryptjs');
const ProyectoDTO = require('../interface/system');



/**   RUTAS  **/
// Mostrar página de login
router.get('/login', (req, res) => {
    res.render('../views/login.ejs');
});



// Mostrar página de registro
router.get('/register', (req, res) => {
    res.render('register');
});



// Mostrar página para crear proyecto
router.get('/createproyecto', (req, res) => {
    res.render('create', {
        login: true,
        name: req.session.name,
        user_id: req.session.user_id,
    });
});



// Método para REGISTRARSE
router.post('/register', async (req, res) => {
    const { user, name, pass } = req.body;
    const rol = 'admin';
    
    let passwordHash = await bcrypt.hash(pass, 8);
    
    try {
        const query = 'INSERT INTO users ("user", name, rol, pass) VALUES ($1, $2, $3, $4)';
        const values = [user, name, rol, passwordHash];
        
        await pool.query(query, values);
        res.render('register', {
            alert: true,
            alertTitle: "Registro",
            alertMessage: "Te registraste correctamente!",
            alertIcon: 'success',
            showConfirmButton: false,
            timer: 1500,
            ruta: 'login'
        });
    } catch (error) {
        console.log(error);
    }
});


// Método para crear un proyecto
router.post('/store', async (req, res) => {
    const name = req.body.name;
    const user_id = req.session.user_id;
    const link = `http://localhost:3000/pizarra/` + name;
    const nuevoProyectoDTO = new ProyectoDTO(name, link, user_id);
    
    try {
        const insertId = await mProyecto.crearProyecto(nuevoProyectoDTO);
        
        res.render('create', {
            alert: true,
            name: name,
            alertTitle: "Registro Correcto",
            alertMessage: "¡Registro exitoso!",
            alertIcon: 'success',
            showConfirmButton: false,
            timer: 1500,
            ruta: ''
        });
    } catch (error) {
        console.error(error);
    }
});


// Método para actualizar un proyecto
router.post('/update', async (req, res) => {
    try {
        const { id, newData } = req.body;
        
        await mProyecto.update(id, newData);
        res.status(200).json({ message: 'Datos actualizados con éxito' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar datos' });
    }
});

module.exports = router;
