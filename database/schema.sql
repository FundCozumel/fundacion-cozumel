-- =============================================================
-- Sistema de Autoevaluación - Fundación Comunitaria Cozumel, IAP
-- Archivo: schema.sql
-- Descripción: Definición completa del esquema de base de datos
-- Orden de ejecución: 1
-- =============================================================

-- Activar extensión para generación de UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================
-- FUNCIÓN: update_updated_at_column
-- Actualiza automáticamente el campo updated_at en cualquier tabla
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- TABLA: roles
-- Catálogo de roles del sistema. Solo existen: administrador y coordinador.
-- =============================================================
CREATE TABLE IF NOT EXISTS roles (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      text        NOT NULL UNIQUE,
    descripcion text,
    created_at  timestamptz DEFAULT now(),

    CONSTRAINT roles_nombre_check CHECK (nombre IN ('administrador', 'coordinador'))
);

COMMENT ON TABLE  roles             IS 'Catálogo de roles del sistema. Valores permitidos: administrador, coordinador.';
COMMENT ON COLUMN roles.nombre      IS 'Nombre único del rol. Solo se permiten: administrador, coordinador.';
COMMENT ON COLUMN roles.descripcion IS 'Descripción opcional del rol.';

-- =============================================================
-- TABLA: usuarios
-- Usuarios del sistema (administradores y coordinadores).
-- Se vinculan con Supabase Auth mediante auth_user_id.
-- Los participantes NO son usuarios del sistema.
-- =============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id      uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre            text        NOT NULL,
    apellido_paterno  text,
    apellido_materno  text,
    correo            text        NOT NULL UNIQUE,
    rol_id            uuid        REFERENCES roles(id),
    estatus           boolean     DEFAULT true,
    created_at        timestamptz DEFAULT now(),
    updated_at        timestamptz DEFAULT now()
);

COMMENT ON TABLE  usuarios                 IS 'Usuarios internos del sistema (administradores y coordinadores). Vinculados a Supabase Auth.';
COMMENT ON COLUMN usuarios.auth_user_id    IS 'Referencia al usuario en Supabase Auth (auth.users.id).';
COMMENT ON COLUMN usuarios.rol_id          IS 'Rol asignado al usuario: administrador o coordinador.';
COMMENT ON COLUMN usuarios.estatus         IS 'true = activo, false = inactivo.';

CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- TABLA: programas
-- Programas principales administrados por la fundación.
-- Un programa agrupa actividades y cuestionarios.
-- =============================================================
CREATE TABLE IF NOT EXISTS programas (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     text        NOT NULL,
    edicion    text,
    anio       int,
    objetivo   text,
    estatus    boolean     DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE  programas         IS 'Programas administrados por la fundación. Agrupan actividades y cuestionarios.';
COMMENT ON COLUMN programas.edicion IS 'Edición del programa (ej: "2024-A", "Primavera 2025").';
COMMENT ON COLUMN programas.anio    IS 'Año de ejecución del programa.';
COMMENT ON COLUMN programas.estatus IS 'true = activo, false = inactivo.';

CREATE TRIGGER trg_programas_updated_at
    BEFORE UPDATE ON programas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- TABLA: sedes
-- Sedes o lugares físicos donde se realizan las actividades.
-- =============================================================
CREATE TABLE IF NOT EXISTS sedes (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     text        NOT NULL,
    municipio  text,
    direccion  text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE  sedes           IS 'Sedes o lugares físicos donde se realizan las actividades.';
COMMENT ON COLUMN sedes.municipio IS 'Municipio donde se ubica la sede.';
COMMENT ON COLUMN sedes.direccion IS 'Dirección física completa de la sede.';

CREATE TRIGGER trg_sedes_updated_at
    BEFORE UPDATE ON sedes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- TABLA: actividades
-- Actividades específicas dentro de un programa, realizadas en una sede.
-- =============================================================
CREATE TABLE IF NOT EXISTS actividades (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    programa_id  uuid        NOT NULL REFERENCES programas(id) ON DELETE CASCADE,
    sede_id      uuid        REFERENCES sedes(id),
    nombre       text        NOT NULL,
    tipo         text,
    facilitador  text,
    fecha_inicio date,
    fecha_fin    date,
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now()
);

COMMENT ON TABLE  actividades              IS 'Actividades específicas dentro de un programa. Se realizan en una sede.';
COMMENT ON COLUMN actividades.programa_id  IS 'Programa al que pertenece la actividad.';
COMMENT ON COLUMN actividades.sede_id      IS 'Sede donde se realiza la actividad.';
COMMENT ON COLUMN actividades.tipo         IS 'Tipo de actividad (ej: taller, conferencia, sesión).';
COMMENT ON COLUMN actividades.facilitador  IS 'Nombre del facilitador o responsable de la actividad.';

CREATE TRIGGER trg_actividades_updated_at
    BEFORE UPDATE ON actividades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- TABLA: participantes
-- Jóvenes o personas que asisten a las actividades.
-- NO se vinculan con Supabase Auth porque no ingresan al sistema.
-- =============================================================
CREATE TABLE IF NOT EXISTS participantes (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre              text        NOT NULL,
    apellido_paterno    text,
    apellido_materno    text,
    correo              text,
    edad                int,
    sexo                text,
    municipio           text,
    escuela             text,
    semestre            text,
    celular             text,
    es_menor_edad       boolean     DEFAULT false,
    consentimiento_tutor boolean    DEFAULT false,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),

    CONSTRAINT participantes_sexo_check CHECK (sexo IN ('masculino', 'femenino', 'otro', 'prefiero_no_decir') OR sexo IS NULL),
    CONSTRAINT participantes_edad_check CHECK (edad IS NULL OR (edad >= 0 AND edad <= 120))
);

COMMENT ON TABLE  participantes                    IS 'Participantes (jóvenes) de las actividades. No tienen acceso al sistema.';
COMMENT ON COLUMN participantes.es_menor_edad      IS 'Indica si el participante es menor de edad.';
COMMENT ON COLUMN participantes.consentimiento_tutor IS 'Indica si se cuenta con consentimiento de tutor para menores de edad.';
COMMENT ON COLUMN participantes.sexo               IS 'Valores permitidos: masculino, femenino, otro, prefiero_no_decir.';

CREATE TRIGGER trg_participantes_updated_at
    BEFORE UPDATE ON participantes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- TABLA: asistencias
-- Tabla intermedia N:N entre participantes y actividades.
-- Registra si un participante asistió a una actividad.
-- =============================================================
CREATE TABLE IF NOT EXISTS asistencias (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    participante_id  uuid        NOT NULL REFERENCES participantes(id) ON DELETE CASCADE,
    actividad_id     uuid        NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
    estatus          text        DEFAULT 'registrado',
    fecha_registro   timestamptz DEFAULT now(),
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now(),

    CONSTRAINT asistencias_estatus_check CHECK (
        estatus IN ('registrado', 'asistio', 'no_asistio', 'cancelado')
    ),
    CONSTRAINT asistencias_unique CHECK (
        (participante_id, actividad_id) IS NOT NULL
    )
);

COMMENT ON TABLE  asistencias                IS 'Tabla intermedia N:N entre participantes y actividades. Registra asistencia.';
COMMENT ON COLUMN asistencias.estatus        IS 'Estado de asistencia: registrado, asistio, no_asistio, cancelado.';
COMMENT ON COLUMN asistencias.fecha_registro IS 'Fecha y hora en que se registró la asistencia.';

CREATE UNIQUE INDEX IF NOT EXISTS asistencias_participante_actividad_unique
    ON asistencias (participante_id, actividad_id);

CREATE TRIGGER trg_asistencias_updated_at
    BEFORE UPDATE ON asistencias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- TABLA: cuestionarios
-- Cuestionarios dinámicos asociados a un programa.
-- Opcionalmente pueden vincularse a una actividad específica.
-- =============================================================
CREATE TABLE IF NOT EXISTS cuestionarios (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    programa_id  uuid        NOT NULL REFERENCES programas(id) ON DELETE CASCADE,
    actividad_id uuid        REFERENCES actividades(id),
    tipo         text        NOT NULL,
    nombre       text        NOT NULL,
    descripcion  text,
    activo       boolean     DEFAULT true,
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now(),

    CONSTRAINT cuestionarios_tipo_check CHECK (
        tipo IN ('registro', 'pre', 'post', 'evaluacion_modulo', 'evaluacion_evento')
    )
);

COMMENT ON TABLE  cuestionarios              IS 'Cuestionarios dinámicos del sistema. Se asocian a programas y opcionalmente a actividades.';
COMMENT ON COLUMN cuestionarios.tipo         IS 'Tipo de cuestionario: registro, pre, post, evaluacion_modulo, evaluacion_evento.';
COMMENT ON COLUMN cuestionarios.activo       IS 'true = disponible para responder, false = desactivado.';
COMMENT ON COLUMN cuestionarios.actividad_id IS 'Actividad específica a la que aplica. Puede ser NULL si aplica a todo el programa.';

CREATE TRIGGER trg_cuestionarios_updated_at
    BEFORE UPDATE ON cuestionarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- TABLA: preguntas
-- Preguntas que conforman un cuestionario. Soportan múltiples tipos de respuesta.
-- =============================================================
CREATE TABLE IF NOT EXISTS preguntas (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    cuestionario_id  uuid        NOT NULL REFERENCES cuestionarios(id) ON DELETE CASCADE,
    texto            text        NOT NULL,
    tipo_respuesta   text        NOT NULL,
    orden            int,
    obligatoria      boolean     DEFAULT false,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now(),

    CONSTRAINT preguntas_tipo_respuesta_check CHECK (
        tipo_respuesta IN ('texto', 'numero', 'opcion_multiple', 'si_no', 'likert_1_5', 'fecha')
    )
);

COMMENT ON TABLE  preguntas                IS 'Preguntas que conforman un cuestionario.';
COMMENT ON COLUMN preguntas.tipo_respuesta IS 'Tipo de respuesta esperada: texto, numero, opcion_multiple, si_no, likert_1_5, fecha.';
COMMENT ON COLUMN preguntas.orden          IS 'Orden de aparición de la pregunta en el cuestionario.';
COMMENT ON COLUMN preguntas.obligatoria    IS 'true = la pregunta es obligatoria al responder el cuestionario.';

CREATE TRIGGER trg_preguntas_updated_at
    BEFORE UPDATE ON preguntas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- TABLA: opciones_respuesta
-- Opciones disponibles para preguntas de tipo opcion_multiple,
-- si_no o likert_1_5.
-- =============================================================
CREATE TABLE IF NOT EXISTS opciones_respuesta (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    pregunta_id uuid        NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
    etiqueta    text        NOT NULL,
    valor       numeric,
    orden       int,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

COMMENT ON TABLE  opciones_respuesta           IS 'Opciones de respuesta para preguntas cerradas (opcion_multiple, si_no, likert_1_5).';
COMMENT ON COLUMN opciones_respuesta.etiqueta  IS 'Texto visible de la opción (ej: "De acuerdo", "Sí", "No").';
COMMENT ON COLUMN opciones_respuesta.valor     IS 'Valor numérico asociado a la opción (ej: 1, 2, 3 para Likert).';
COMMENT ON COLUMN opciones_respuesta.orden     IS 'Orden de aparición de la opción dentro de la pregunta.';

CREATE TRIGGER trg_opciones_respuesta_updated_at
    BEFORE UPDATE ON opciones_respuesta
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- TABLA: respuestas
-- Almacena las respuestas individuales de cada participante.
-- Soporta múltiples tipos: texto abierto, número, opción, fecha.
-- =============================================================
CREATE TABLE IF NOT EXISTS respuestas (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    cuestionario_id  uuid        NOT NULL REFERENCES cuestionarios(id) ON DELETE CASCADE,
    pregunta_id      uuid        NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
    participante_id  uuid        NOT NULL REFERENCES participantes(id) ON DELETE CASCADE,
    actividad_id     uuid        REFERENCES actividades(id),
    opcion_id        uuid        REFERENCES opciones_respuesta(id),
    valor_texto      text,
    valor_num        numeric,
    valor_fecha      date,
    creado_en        timestamptz DEFAULT now()
);

COMMENT ON TABLE  respuestas                IS 'Respuestas individuales de cada participante a las preguntas de los cuestionarios.';
COMMENT ON COLUMN respuestas.opcion_id      IS 'Opción seleccionada (para tipo opcion_multiple, si_no o likert_1_5).';
COMMENT ON COLUMN respuestas.valor_texto    IS 'Valor de respuesta abierta (para tipo texto).';
COMMENT ON COLUMN respuestas.valor_num      IS 'Valor numérico (para tipo numero).';
COMMENT ON COLUMN respuestas.valor_fecha    IS 'Valor de tipo fecha (para tipo fecha).';
COMMENT ON COLUMN respuestas.actividad_id   IS 'Actividad en la que se respondió el cuestionario.';
