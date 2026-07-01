-- =============================================================
-- Sistema de Autoevaluación - Fundación Comunitaria Cozumel, IAP
-- Archivo: seed.sql
-- Descripción: Datos iniciales del sistema
-- Orden de ejecución: 2 (después de schema.sql)
-- =============================================================

-- =============================================================
-- ROLES
-- Solo existen dos roles en el sistema: administrador y coordinador.
-- =============================================================
INSERT INTO roles (id, nombre, descripcion)
VALUES
    (gen_random_uuid(), 'administrador', 'Acceso total al sistema. Puede crear, editar y eliminar registros.'),
    (gen_random_uuid(), 'coordinador',   'Acceso operativo. Puede crear y editar registros, pero no eliminar.')
ON CONFLICT (nombre) DO NOTHING;

-- =============================================================
-- PROGRAMAS
-- Programas iniciales de la fundación.
-- =============================================================
INSERT INTO programas (id, nombre, edicion, anio, objetivo, estatus)
VALUES
    (
        gen_random_uuid(),
        'Liderazgo',
        '2025-A',
        2025,
        'Desarrollar habilidades de liderazgo, comunicación y trabajo en equipo en jóvenes de Cozumel.',
        true
    ),
    (
        gen_random_uuid(),
        'Startup Weekend',
        '2025',
        2025,
        'Fomentar el emprendimiento y la innovación en jóvenes mediante la metodología de 54 horas.',
        true
    )
ON CONFLICT DO NOTHING;

-- =============================================================
-- SEDES
-- Sedes iniciales donde se realizan las actividades.
-- =============================================================
INSERT INTO sedes (id, nombre, municipio, direccion)
VALUES
    (
        gen_random_uuid(),
        'Fundación Comunitaria Cozumel',
        'Cozumel',
        'Cozumel, Quintana Roo, México'
    ),
    (
        gen_random_uuid(),
        'Cozumel',
        'Cozumel',
        'Isla de Cozumel, Quintana Roo, México'
    )
ON CONFLICT DO NOTHING;

-- =============================================================
-- NOTA IMPORTANTE SOBRE USUARIOS
-- Los usuarios del sistema (administradores y coordinadores) NO se
-- insertan aquí porque dependen de Supabase Auth.
--
-- Para crear un usuario real:
--   1. Crear el usuario en Supabase Auth (Dashboard > Authentication > Users)
--      o desde la app usando supabase.auth.signUp()
--   2. Obtener el auth_user_id generado por Supabase Auth
--   3. Insertar manualmente en la tabla usuarios:
--
-- INSERT INTO usuarios (auth_user_id, nombre, apellido_paterno, correo, rol_id)
-- VALUES (
--     '<UUID_DE_AUTH_USERS>',
--     'Nombre',
--     'Apellido',
--     'correo@ejemplo.com',
--     (SELECT id FROM roles WHERE nombre = 'administrador')
-- );
-- =============================================================
