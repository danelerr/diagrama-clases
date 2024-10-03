-- Tabla de usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    "user" VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL,
    pass VARCHAR(255) NOT NULL
);

-- Tabla de proyectos
CREATE TABLE proyecto (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    link VARCHAR(255) NOT NULL,
    user_id INT NOT NULL,
    objetos JSONB DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);