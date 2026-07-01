-- =============================================================
-- Sistema de Autoevaluación - Fundación Comunitaria Cozumel, IAP
-- Archivo: rls.sql
-- Descripción: Row Level Security - Políticas de acceso por rol
-- Orden de ejecución: 3 (después de seed.sql)
-- =============================================================

-- =============================================================
-- FUNCIÓN AUXILIAR: get_current_user_role
-- Retorna el nombre del rol del usuario autenticado consultando
-- la tabla usuarios mediante auth.uid().
-- =============================================================
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT r.nombre
    FROM usuarios u
    INNER JOIN roles r ON r.id = u.rol_id
    WHERE u.auth_user_id = auth.uid()
      AND u.estatus = true
    LIMIT 1;
$$;

COMMENT ON FUNCTION get_current_user_role IS
    'Retorna el rol (nombre) del usuario autenticado actualmente. Usa auth.uid() para identificarlo.';

-- =============================================================
-- ACTIVAR ROW LEVEL SECURITY EN TODAS LAS TABLAS
-- =============================================================
ALTER TABLE roles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE programas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sedes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividades        ENABLE ROW LEVEL SECURITY;
ALTER TABLE participantes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuestionarios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE preguntas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE opciones_respuesta ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas         ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- TABLA: roles
-- =============================================================

-- Administrador: SELECT
CREATE POLICY "roles_select_admin"
    ON roles FOR SELECT
    USING (get_current_user_role() = 'administrador');

-- Administrador: INSERT
CREATE POLICY "roles_insert_admin"
    ON roles FOR INSERT
    WITH CHECK (get_current_user_role() = 'administrador');

-- Administrador: UPDATE
CREATE POLICY "roles_update_admin"
    ON roles FOR UPDATE
    USING (get_current_user_role() = 'administrador');

-- Administrador: DELETE
CREATE POLICY "roles_delete_admin"
    ON roles FOR DELETE
    USING (get_current_user_role() = 'administrador');

-- Coordinador: SELECT
CREATE POLICY "roles_select_coordinador"
    ON roles FOR SELECT
    USING (get_current_user_role() = 'coordinador');

-- =============================================================
-- TABLA: usuarios
-- =============================================================

-- Administrador: SELECT
CREATE POLICY "usuarios_select_admin"
    ON usuarios FOR SELECT
    USING (get_current_user_role() = 'administrador');

-- Administrador: INSERT
CREATE POLICY "usuarios_insert_admin"
    ON usuarios FOR INSERT
    WITH CHECK (get_current_user_role() = 'administrador');

-- Administrador: UPDATE
CREATE POLICY "usuarios_update_admin"
    ON usuarios FOR UPDATE
    USING (get_current_user_role() = 'administrador');

-- Administrador: DELETE
CREATE POLICY "usuarios_delete_admin"
    ON usuarios FOR DELETE
    USING (get_current_user_role() = 'administrador');

-- Coordinador: SELECT (solo puede ver su propio registro)
CREATE POLICY "usuarios_select_coordinador"
    ON usuarios FOR SELECT
    USING (
        get_current_user_role() = 'coordinador'
        AND auth_user_id = auth.uid()
    );

-- Coordinador: UPDATE (solo puede editar su propio registro)
CREATE POLICY "usuarios_update_coordinador"
    ON usuarios FOR UPDATE
    USING (
        get_current_user_role() = 'coordinador'
        AND auth_user_id = auth.uid()
    );

-- =============================================================
-- TABLA: programas
-- =============================================================

CREATE POLICY "programas_select_admin"
    ON programas FOR SELECT
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "programas_insert_admin"
    ON programas FOR INSERT
    WITH CHECK (get_current_user_role() = 'administrador');

CREATE POLICY "programas_update_admin"
    ON programas FOR UPDATE
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "programas_delete_admin"
    ON programas FOR DELETE
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "programas_select_coordinador"
    ON programas FOR SELECT
    USING (get_current_user_role() = 'coordinador');

CREATE POLICY "programas_insert_coordinador"
    ON programas FOR INSERT
    WITH CHECK (get_current_user_role() = 'coordinador');

CREATE POLICY "programas_update_coordinador"
    ON programas FOR UPDATE
    USING (get_current_user_role() = 'coordinador');

-- =============================================================
-- TABLA: sedes
-- =============================================================

CREATE POLICY "sedes_select_admin"
    ON sedes FOR SELECT
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "sedes_insert_admin"
    ON sedes FOR INSERT
    WITH CHECK (get_current_user_role() = 'administrador');

CREATE POLICY "sedes_update_admin"
    ON sedes FOR UPDATE
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "sedes_delete_admin"
    ON sedes FOR DELETE
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "sedes_select_coordinador"
    ON sedes FOR SELECT
    USING (get_current_user_role() = 'coordinador');

CREATE POLICY "sedes_insert_coordinador"
    ON sedes FOR INSERT
    WITH CHECK (get_current_user_role() = 'coordinador');

CREATE POLICY "sedes_update_coordinador"
    ON sedes FOR UPDATE
    USING (get_current_user_role() = 'coordinador');

-- =============================================================
-- TABLA: actividades
-- =============================================================

CREATE POLICY "actividades_select_admin"
    ON actividades FOR SELECT
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "actividades_insert_admin"
    ON actividades FOR INSERT
    WITH CHECK (get_current_user_role() = 'administrador');

CREATE POLICY "actividades_update_admin"
    ON actividades FOR UPDATE
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "actividades_delete_admin"
    ON actividades FOR DELETE
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "actividades_select_coordinador"
    ON actividades FOR SELECT
    USING (get_current_user_role() = 'coordinador');

CREATE POLICY "actividades_insert_coordinador"
    ON actividades FOR INSERT
    WITH CHECK (get_current_user_role() = 'coordinador');

CREATE POLICY "actividades_update_coordinador"
    ON actividades FOR UPDATE
    USING (get_current_user_role() = 'coordinador');

-- =============================================================
-- TABLA: participantes
-- =============================================================

CREATE POLICY "participantes_select_admin"
    ON participantes FOR SELECT
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "participantes_insert_admin"
    ON participantes FOR INSERT
    WITH CHECK (get_current_user_role() = 'administrador');

CREATE POLICY "participantes_update_admin"
    ON participantes FOR UPDATE
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "participantes_delete_admin"
    ON participantes FOR DELETE
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "participantes_select_coordinador"
    ON participantes FOR SELECT
    USING (get_current_user_role() = 'coordinador');

CREATE POLICY "participantes_insert_coordinador"
    ON participantes FOR INSERT
    WITH CHECK (get_current_user_role() = 'coordinador');

CREATE POLICY "participantes_update_coordinador"
    ON participantes FOR UPDATE
    USING (get_current_user_role() = 'coordinador');

-- =============================================================
-- TABLA: asistencias
-- =============================================================

CREATE POLICY "asistencias_select_admin"
    ON asistencias FOR SELECT
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "asistencias_insert_admin"
    ON asistencias FOR INSERT
    WITH CHECK (get_current_user_role() = 'administrador');

CREATE POLICY "asistencias_update_admin"
    ON asistencias FOR UPDATE
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "asistencias_delete_admin"
    ON asistencias FOR DELETE
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "asistencias_select_coordinador"
    ON asistencias FOR SELECT
    USING (get_current_user_role() = 'coordinador');

CREATE POLICY "asistencias_insert_coordinador"
    ON asistencias FOR INSERT
    WITH CHECK (get_current_user_role() = 'coordinador');

CREATE POLICY "asistencias_update_coordinador"
    ON asistencias FOR UPDATE
    USING (get_current_user_role() = 'coordinador');

-- =============================================================
-- TABLA: cuestionarios
-- =============================================================

CREATE POLICY "cuestionarios_select_admin"
    ON cuestionarios FOR SELECT
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "cuestionarios_insert_admin"
    ON cuestionarios FOR INSERT
    WITH CHECK (get_current_user_role() = 'administrador');

CREATE POLICY "cuestionarios_update_admin"
    ON cuestionarios FOR UPDATE
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "cuestionarios_delete_admin"
    ON cuestionarios FOR DELETE
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "cuestionarios_select_coordinador"
    ON cuestionarios FOR SELECT
    USING (get_current_user_role() = 'coordinador');

CREATE POLICY "cuestionarios_insert_coordinador"
    ON cuestionarios FOR INSERT
    WITH CHECK (get_current_user_role() = 'coordinador');

CREATE POLICY "cuestionarios_update_coordinador"
    ON cuestionarios FOR UPDATE
    USING (get_current_user_role() = 'coordinador');

-- =============================================================
-- TABLA: preguntas
-- =============================================================

CREATE POLICY "preguntas_select_admin"
    ON preguntas FOR SELECT
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "preguntas_insert_admin"
    ON preguntas FOR INSERT
    WITH CHECK (get_current_user_role() = 'administrador');

CREATE POLICY "preguntas_update_admin"
    ON preguntas FOR UPDATE
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "preguntas_delete_admin"
    ON preguntas FOR DELETE
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "preguntas_select_coordinador"
    ON preguntas FOR SELECT
    USING (get_current_user_role() = 'coordinador');

CREATE POLICY "preguntas_insert_coordinador"
    ON preguntas FOR INSERT
    WITH CHECK (get_current_user_role() = 'coordinador');

CREATE POLICY "preguntas_update_coordinador"
    ON preguntas FOR UPDATE
    USING (get_current_user_role() = 'coordinador');

-- =============================================================
-- TABLA: opciones_respuesta
-- =============================================================

CREATE POLICY "opciones_respuesta_select_admin"
    ON opciones_respuesta FOR SELECT
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "opciones_respuesta_insert_admin"
    ON opciones_respuesta FOR INSERT
    WITH CHECK (get_current_user_role() = 'administrador');

CREATE POLICY "opciones_respuesta_update_admin"
    ON opciones_respuesta FOR UPDATE
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "opciones_respuesta_delete_admin"
    ON opciones_respuesta FOR DELETE
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "opciones_respuesta_select_coordinador"
    ON opciones_respuesta FOR SELECT
    USING (get_current_user_role() = 'coordinador');

CREATE POLICY "opciones_respuesta_insert_coordinador"
    ON opciones_respuesta FOR INSERT
    WITH CHECK (get_current_user_role() = 'coordinador');

CREATE POLICY "opciones_respuesta_update_coordinador"
    ON opciones_respuesta FOR UPDATE
    USING (get_current_user_role() = 'coordinador');

-- =============================================================
-- TABLA: respuestas
-- =============================================================

CREATE POLICY "respuestas_select_admin"
    ON respuestas FOR SELECT
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "respuestas_insert_admin"
    ON respuestas FOR INSERT
    WITH CHECK (get_current_user_role() = 'administrador');

CREATE POLICY "respuestas_update_admin"
    ON respuestas FOR UPDATE
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "respuestas_delete_admin"
    ON respuestas FOR DELETE
    USING (get_current_user_role() = 'administrador');

CREATE POLICY "respuestas_select_coordinador"
    ON respuestas FOR SELECT
    USING (get_current_user_role() = 'coordinador');

CREATE POLICY "respuestas_insert_coordinador"
    ON respuestas FOR INSERT
    WITH CHECK (get_current_user_role() = 'coordinador');

CREATE POLICY "respuestas_update_coordinador"
    ON respuestas FOR UPDATE
    USING (get_current_user_role() = 'coordinador');
