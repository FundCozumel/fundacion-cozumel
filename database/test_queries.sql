-- =============================================================
-- Sistema de Autoevaluación - Fundación Comunitaria Cozumel, IAP
-- Archivo: test_queries.sql
-- Descripción: Consultas de validación del esquema y datos iniciales
-- Orden de ejecución: 4 (después de rls.sql)
-- =============================================================

-- =============================================================
-- 1. VERIFICAR QUE LAS TABLAS EXISTEN
-- =============================================================
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
      'roles',
      'usuarios',
      'programas',
      'sedes',
      'actividades',
      'participantes',
      'asistencias',
      'cuestionarios',
      'preguntas',
      'opciones_respuesta',
      'respuestas'
  )
ORDER BY table_name;

-- Resultado esperado: 11 filas, una por cada tabla.

-- =============================================================
-- 2. VERIFICAR QUE LOS ROLES FUERON INSERTADOS
-- =============================================================
SELECT id, nombre, descripcion, created_at
FROM roles
ORDER BY nombre;

-- Resultado esperado: 2 filas — administrador, coordinador.
-- NO debe aparecer "observador".

-- =============================================================
-- 3. VERIFICAR QUE LOS PROGRAMAS FUERON INSERTADOS
-- =============================================================
SELECT id, nombre, edicion, anio, estatus
FROM programas
ORDER BY nombre;

-- Resultado esperado: 2 filas — Liderazgo, Startup Weekend.

-- =============================================================
-- 4. VERIFICAR QUE LAS SEDES FUERON INSERTADAS
-- =============================================================
SELECT id, nombre, municipio, direccion
FROM sedes
ORDER BY nombre;

-- Resultado esperado: 2 filas — Cozumel, Fundación Comunitaria Cozumel.

-- =============================================================
-- 5. VERIFICAR QUE RLS ESTÁ ACTIVADO EN TODAS LAS TABLAS
-- =============================================================
SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
      'roles',
      'usuarios',
      'programas',
      'sedes',
      'actividades',
      'participantes',
      'asistencias',
      'cuestionarios',
      'preguntas',
      'opciones_respuesta',
      'respuestas'
  )
ORDER BY tablename;

-- Resultado esperado: 11 filas con rls_enabled = true.

-- =============================================================
-- 6. VERIFICAR POLÍTICAS RLS CREADAS
-- =============================================================
SELECT
    tablename,
    policyname,
    cmd       AS operacion,
    roles     AS aplica_a
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- Resultado esperado: políticas para SELECT, INSERT, UPDATE, DELETE (admin)
-- y SELECT, INSERT, UPDATE (coordinador) en cada tabla.
-- NO debe existir ninguna política con "observador".

-- =============================================================
-- 7. VERIFICAR FOREIGN KEYS EXISTENTES
-- =============================================================
SELECT
    tc.table_name         AS tabla,
    kcu.column_name       AS columna,
    ccu.table_name        AS tabla_referenciada,
    ccu.column_name       AS columna_referenciada,
    tc.constraint_name    AS constraint_nombre
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage  AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema   = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema   = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema    = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Resultado esperado: foreign keys en usuarios, actividades,
-- asistencias, cuestionarios, preguntas, opciones_respuesta y respuestas.

-- =============================================================
-- 8. VERIFICAR CONSTRAINTS DE TIPO (CHECK) EN LAS TABLAS
-- =============================================================
SELECT
    tc.table_name      AS tabla,
    tc.constraint_name AS constraint_nombre,
    cc.check_clause    AS expresion
FROM information_schema.table_constraints AS tc
JOIN information_schema.check_constraints AS cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema    = 'public'
ORDER BY tc.table_name;

-- Resultado esperado: constraints en:
--   roles             → nombre IN ('administrador','coordinador')
--   participantes     → sexo, edad
--   asistencias       → estatus IN ('registrado','asistio','no_asistio','cancelado')
--   cuestionarios     → tipo IN ('registro','pre','post','evaluacion_modulo','evaluacion_evento')
--   preguntas         → tipo_respuesta IN ('texto','numero','opcion_multiple','si_no','likert_1_5','fecha')

-- =============================================================
-- 9. VERIFICAR TRIGGERS CREADOS
-- =============================================================
SELECT
    event_object_table AS tabla,
    trigger_name,
    event_manipulation AS evento,
    action_timing      AS momento
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Resultado esperado: triggers trg_*_updated_at en:
-- usuarios, programas, sedes, actividades, participantes,
-- asistencias, cuestionarios, preguntas, opciones_respuesta.

-- =============================================================
-- 10. VERIFICAR QUE LA FUNCIÓN get_current_user_role EXISTE
-- =============================================================
SELECT
    routine_name,
    routine_type,
    data_type AS tipo_retorno
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_current_user_role', 'update_updated_at_column')
ORDER BY routine_name;

-- Resultado esperado: 2 funciones registradas.

-- =============================================================
-- 11. PRUEBA DE CONSTRAINT: insertar un rol inválido (debe fallar)
-- =============================================================
-- Descomenta esta sección para probar que el constraint funciona.
-- Debe lanzar: ERROR: new row for relation "roles" violates check constraint

-- INSERT INTO roles (nombre, descripcion)
-- VALUES ('observador', 'Este rol no debería existir');

-- =============================================================
-- 12. PRUEBA DE CONSTRAINT: insertar estatus inválido en asistencias
-- =============================================================
-- Descomenta para probar. Debe lanzar error de check constraint.

-- INSERT INTO asistencias (participante_id, actividad_id, estatus)
-- VALUES (gen_random_uuid(), gen_random_uuid(), 'pendiente');

-- =============================================================
-- 13. RESUMEN GENERAL DEL ESQUEMA
-- =============================================================
SELECT
    t.table_name                                         AS tabla,
    COUNT(c.column_name)                                 AS num_columnas,
    pt.rowsecurity                                       AS rls_activo
FROM information_schema.tables t
JOIN information_schema.columns c
    ON t.table_name  = c.table_name
    AND t.table_schema = c.table_schema
JOIN pg_tables pt
    ON pt.tablename  = t.table_name
    AND pt.schemaname = t.table_schema
WHERE t.table_schema = 'public'
  AND t.table_type   = 'BASE TABLE'
GROUP BY t.table_name, pt.rowsecurity
ORDER BY t.table_name;

-- Resultado esperado: 11 tablas con rls_activo = true.
