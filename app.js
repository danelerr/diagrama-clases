// 1 - Invocamos a Express
const express = require('express');
const app = express();

// 2 - Configuración básica
app.use(express.urlencoded({ extended: false }));
app.use(express.json()); // Soporte para JSON

// 3 - Configuración de dotenv
const dotenv = require('dotenv');
dotenv.config({ path: './env/.env' });

// 4 - Directorio de recursos estáticos
app.use('/resources', express.static('public'));
app.use('/resources', express.static(__dirname + '/public'));

// 5 - Motor de plantillas EJS
app.set('view engine', 'ejs');

// Invocamos a bcrypt
const bcrypt = require('bcryptjs');

// 6 - Configuración de sesiones
const session = require('express-session');
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

// 7 - Importar la conexión a la DB desde db.js
const pool = require('./database/db');  // Asegúrate de que la ruta es correcta
const http = require('http');
const socketIo = require('socket.io');
const MProyecto = require('./model/MProyecto');
const server = http.createServer(app);
const io = socketIo(server);
const mProyecto = new MProyecto();
const routerr = require("./routes/rutas");

// 8 - Rutas
app.use('/', routerr);

// 9 - Método para autenticación
app.post('/auth', async (req, res) => {
	const user = req.body.user;
	const pass = req.body.pass;
	if (user && pass) {
		const query = 'SELECT * FROM users WHERE "user" = $1';
        const values = [user];
		try {
			console.log(query);
			console.log(values);
			const results = await pool.query(query, values); 
			if (results.rows.length == 0 || !(await bcrypt.compare(pass, results.rows[0].pass))) {
				res.render('login', {
					alert: true,
					alertTitle: "Error",
					alertMessage: "USUARIO y/o PASSWORD incorrectas",
					alertIcon: 'error',
					showConfirmButton: false,
					timer: 3000,
					ruta: 'login'
				});
			} else {
				// Crear variables de sesión
				req.session.loggedin = true;
				req.session.name = results.rows[0].name;
				req.session.user_id = results.rows[0].id;
				res.render('login', {
					alert: true,
					alertTitle: "Conexión exitosa",
					alertMessage: "¡LOGIN CORRECTO!",
					alertIcon: 'success',
					showConfirmButton: false,
					timer: 1500,
					ruta: 'proyecto'
				});
			}
		} catch (error) {
			console.log(error);
			res.status(500).send('Error de servidor');
		}
	} else {
		res.send('Por favor ingrese usuario y contraseña');
	}
});

// 10 - Control de autenticación en todas las páginas
app.get('/', (req, res) => {
	if (req.session.loggedin) {
		res.render('index', {
			login: true,
			name: req.session.name
		});
	} else {
		res.render('index', {
			login: false,
			name: 'Debe iniciar sesión',
		});
	}
});

// 11 - Listado de proyectos
app.get('/proyecto', async (req, res) => {
	let id = req.session.user_id;
	if (req.session.loggedin) {
		try {
			const results = await pool.query('SELECT * FROM proyecto WHERE user_id = $1', [id]);
			res.render('proyecto', {
				login: true,
				name: req.session.name,
				proyect: results.rows
			});
		} catch (error) {
			res.status(500).send('Error en la consulta a la base de datos');
		}
	} else {
		res.status(401).send('No estás autenticado');
	}
});

// 12 - Cierre de sesión
app.get('/logout', function (req, res) {
	req.session.destroy(() => {
		res.redirect('/login')
	})
});

// 13 - Página de pizarra y carga de proyecto
app.get('/pizarra/:id', async (req, res) => {
	const id = req.params.id;
	try {
		const proyecto = await mProyecto.find(id);
		if (req.session.loggedin) {
			res.render('pizarra', {
				login: true,
				name: req.session.name,
				pizarra_id: id,
				proyecto: proyecto,
				objetos: JSON.stringify(proyecto.objetos)
			});
		} else {
			res.render('index', {
				login: false,
				name: 'Debe iniciar sesión',
			});
		}
	} catch (error) {
		console.error(error);
		res.render('error', {
			message: 'Proyecto no encontrado',
			error: error
		});
	}
});

// 14 - Limpiar caché al cerrar sesión
app.use(function (req, res, next) {
	if (!req.user)
		res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
	next();
});

// 15 - Funciones de socket.io
let pizarras = {}; // Objeto para almacenar los objetos de cada pizarra

// Función para inicializar una pizarra si no existe
function inicializarPizarra(pizarraId) {
	console.log("Se inicializa la pizarra: app.js");
	console.log(pizarraId);
	if (!pizarras[pizarraId]) {
		pizarras[pizarraId] = {
			objetos: [], // Estado de los objetos en la pizarra
			version: 0   // Número de versión para la sincronización
		};
	}
}

// Escuchar las conexiones de los clientes
io.on('connection', (socket) => {
	console.log('Un cliente se ha conectado');

	// Escuchar cuando un cliente se une a una pizarra específica
	socket.on('unirse', (data) => {
		const pizarraId = data.pizarraId;
		inicializarPizarra(pizarraId); // Inicializar pizarra si no existe

		// Unir al cliente a la sala de la pizarra
		socket.join(pizarraId);

		// Enviar el estado actual de la pizarra al cliente que se une
		socket.emit('dibujo', {
			pizarraId: pizarraId,
			objetos: pizarras[pizarraId].objetos,
			version: pizarras[pizarraId].version
		});

		console.log(`Cliente unido a la pizarra - UNIRE: ${pizarraId}`);
	});

	// Escuchar cuando se actualiza el dibujo en la pizarra
	socket.on('dibujo', (data) => {
		const { pizarraId, objeto, accion } = data;

		// Inicializar pizarra si no existe
		inicializarPizarra(pizarraId);

		// Manejar las acciones de los objetos en la pizarra
		switch (accion) {
			case 'agregar':
				pizarras[pizarraId].objetos.push(objeto);
				break;
			case 'mover':
				const index = pizarras[pizarraId].objetos.findIndex(obj => obj.id === objeto.id);
				if (index !== -1) {
					pizarras[pizarraId].objetos[index] = objeto; // Actualizar la posición
				}
				break;
			case 'eliminar':
				pizarras[pizarraId].objetos = pizarras[pizarraId].objetos.filter(obj => obj.id !== objeto.id);
				break;
			default:
				console.log(`Acción desconocida app: ${accion}`);
		}

		// Incrementar el número de versión
		pizarras[pizarraId].version++;

		// Emitir el cambio a todos los clientes en la sala de la pizarra
		io.to(pizarraId).emit('dibujo', {
			pizarraId: pizarraId,
			objeto: objeto,
			accion: accion,
			version: pizarras[pizarraId].version
		});

		console.log(`Actualización de pizarra ${pizarraId} con acción ${accion}`);
	});

	// Escuchar la desconexión de un cliente
	socket.on('disconnect', () => {
		console.log('Un cliente se ha desconectado.');
	});
});

// 16 - Guardar el diagrama en la base de datos
app.post('/guardarDiagrama', async (req, res) => {
	const { pizarraId, objetos } = req.body;
	if (pizarraId && objetos) {
		const objetosJson = JSON.stringify(objetos);
		try {
			await pool.query('UPDATE proyecto SET objetos = $1 WHERE id = $2', [objetosJson, pizarraId]);
			res.send('Diagrama guardado con éxito');
			console.log(`Diagrama guardado para la pizarra ${pizarraId}`);
		} catch (error) {
			console.error('Error al guardar el diagrama:', error);
			res.status(500).send('Error al guardar el diagrama');
		}
	} else {
		res.status(400).send('Faltan parámetros');
	}
});


// Rutas de descarga de archivos
app.get('/download-zip', (req, res) => {
	const filePath = __dirname + '/public/demo.zip'; // Ruta al archivo ZIP
	res.download(filePath, 'demo.zip', (err) => {
		if (err) {
			console.log('Error al descargar el archivo:', err);
			res.status(500).send('Error al descargar el archivo');
		}
	});
});


// 17 - Configuración del puerto
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log(`Servidor escuchando en el puerto ${PORT}`);
});
