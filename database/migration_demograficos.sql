-- =============================================================
-- Migración: datos demográficos de participantes
-- Sistema de Autoevaluación - Fundación Comunitaria Cozumel, IAP
-- Ejecutar en el SQL Editor de Supabase.
-- =============================================================

-- Nuevas columnas demográficas (homologación de Forms)
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS curp              text;
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS fecha_nacimiento  date;
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS estado_nacimiento text;
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS estado_civil      text;
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS grado_estudios    text;

COMMENT ON COLUMN participantes.curp              IS 'CURP del participante (18 caracteres). Opcional.';
COMMENT ON COLUMN participantes.fecha_nacimiento  IS 'Fecha de nacimiento. Fuente de verdad para calcular la edad.';
COMMENT ON COLUMN participantes.estado_nacimiento IS 'Estado de nacimiento (catálogo de 32 estados de México).';
COMMENT ON COLUMN participantes.estado_civil      IS 'Estado civil. Opcional.';
COMMENT ON COLUMN participantes.grado_estudios    IS 'Grado de estudios (Secundaria, Preparatoria, Universidad, Posgrado, Otro).';

-- =============================================================
-- Índice único en correo: habilita upsert (re-importar actualiza
-- en lugar de duplicar) y evita participantes repetidos por correo.
--
-- IMPORTANTE: si ya existen correos duplicados, este índice fallará.
-- Para detectarlos antes:
--   SELECT lower(correo), count(*) FROM participantes
--   WHERE correo IS NOT NULL GROUP BY lower(correo) HAVING count(*) > 1;
-- Los NULL se permiten múltiples (participantes sin correo).
-- =============================================================
CREATE UNIQUE INDEX IF NOT EXISTS participantes_correo_unique
    ON participantes (correo);
