# Plan — Homologación de Google Forms y datos demográficos

Sistema de Autoevaluación · Fundación Comunitaria Cozumel, IAP

## Objetivo

Definir un **bloque demográfico estándar** que todos los Google Forms deben incluir, y hacer que el importador:
1. **Reconozca** automáticamente esas columnas (por sus títulos), sin importar el orden.
2. **Guarde** esos datos en el participante (creándolo o actualizándolo).
3. **Calcule la edad** a partir de la fecha de nacimiento (para gráficas por edad).
4. Trate **el resto de las columnas** como preguntas de la encuesta (para graficar resultados).
5. Permita **graficar la demografía por programa** (género, edad, estado civil, etc.).

---

## 1. Bloque estándar de Forms (homologación)

Estos son los **títulos canónicos** que debe llevar cada Form. El importador los reconoce por el título (normalizado, sin acentos/mayúsculas) y por alias comunes.

| # | Título en el Form (recomendado) | Campo en participante | Obligatorio | Tipo en Forms | Valores / formato |
|---|----------------------------------|------------------------|:-----------:|----------------|-------------------|
| 1 | Dirección de correo electrónico | `correo` | ✅ | Recolección automática de correo | email |
| 2 | Nombre(s) | `nombre` | ✅ | Respuesta corta | texto |
| 3 | Apellido Paterno | `apellido_paterno` | ✅ | Respuesta corta | texto |
| 4 | Apellido Materno | `apellido_materno` | ✅ | Respuesta corta | texto |
| 5 | CURP | `curp` | ⬜ (opcional) | Respuesta corta | 18 caracteres |
| 6 | Fecha de Nacimiento | `fecha_nacimiento` → `edad` | ✅ | **Fecha** | dd/mm/aaaa |
| 7 | Estado de Nacimiento | `estado_nacimiento` | ✅ | Desplegable | catálogo de estados |
| 8 | Municipio | `municipio` | ⬜ (opcional) | Respuesta corta / desplegable | texto |
| 9 | Estado Civil | `estado_civil` | ⬜ (opcional) | Opción múltiple | Soltero/a, Casado/a, Unión libre, Divorciado/a, Viudo/a |
| 10 | Género | `sexo` | ✅ | Opción múltiple | Masculino, Femenino, Otro, Prefiero no decir |
| 11 | Número de Celular | `celular` | ✅ | Respuesta corta | 10 dígitos |
| 12 | Grado de Estudios | `grado_estudios` | ✅ | Opción múltiple / desplegable | Secundaria, Preparatoria, Universidad, Posgrado, Otro |
| 13 | Escuela | `escuela` | ⬜ (opcional) | Respuesta corta | texto |

**Reglas de reconocimiento (alias aceptados):** el importador normaliza títulos y acepta variantes, p. ej.
- `correo` ← "Dirección de correo electrónico", "Email", "Correo electrónico"
- `nombre` ← "Nombre(s)", "Nombres"
- `fecha_nacimiento` ← "Fecha de Nacimiento", "Fecha de nacimiento", "Nacimiento"
- `sexo` ← "Género", "Genero", "Sexo"
- `celular` ← "Número de Celular", "Celular", "Teléfono"
- `grado_estudios` ← "Grado de Estudios", "Escolaridad", "Nivel de estudios"
- …y "Marca temporal" / "Timestamp" se ignora siempre.

> **Entregable:** una **plantilla de Forms** (documento y/o Form de ejemplo clonable) con estos 13 campos exactos, para que cada coordinador la duplique al crear un nuevo Form. Así todos quedan homologados.

---

## 2. Cambios en la base de datos

`participantes` hoy tiene: `nombre, apellido_paterno, apellido_materno, correo, edad, sexo, municipio, escuela, semestre, celular, es_menor_edad, consentimiento_tutor`.

**Faltan columnas — migración SQL (`database/migration_demograficos.sql`):**
```sql
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS curp              text;
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS fecha_nacimiento  date;
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS estado_nacimiento text;
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS estado_civil      text;
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS grado_estudios    text;

-- Evita duplicados al re-importar por correo (clave para upsert):
CREATE UNIQUE INDEX IF NOT EXISTS participantes_correo_unique
  ON participantes (lower(correo)) WHERE correo IS NOT NULL;
```

- `edad` se conserva y se **calcula desde `fecha_nacimiento`** al importar/guardar.
- El índice único en `correo` habilita el **upsert** (re-importar actualiza en vez de duplicar) — resuelve además el bug de duplicados detectado antes.

---

## 3. Cambios en el importador (Cuestionario desde Forms)

1. **Separar demografía de preguntas.** Hoy toda columna no-meta se vuelve "pregunta". Con esto, las 13 columnas estándar se reconocen como **demografía** (no como preguntas de encuesta); el resto siguen siendo preguntas a graficar.
2. **Mapear y hacer upsert del participante** por `correo`: crea o actualiza con nombre, apellidos, CURP, fecha de nacimiento, estado, municipio, estado civil, género, celular, grado de estudios, escuela.
3. **Calcular edad** desde `fecha_nacimiento` (`edad = años cumplidos a hoy`) y guardarla; marcar `es_menor_edad` si < 18.
4. **Normalizar valores:**
   - Género → `sexo` (`Hombre/Masculino→masculino`, `Mujer/Femenino→femenino`, `Otro`, `Prefiero no decir`).
   - Fecha → ISO `aaaa-mm-dd` (ya hay `normalizarFecha`).
   - CURP → mayúsculas, validación de formato opcional (18 caracteres).
5. **Panel de revisión:** el resumen de detección mostrará dos bloques —"Datos del participante detectados (X campos)" y "Preguntas de la encuesta detectadas (Y)"— ambos ajustables en el colapsable.

> Esto también aplica al dataset **Participantes** (importación directa) y al **formulario manual** de participante, para que el modelo de datos sea consistente por las 3 vías.

---

## 4. Gráficas demográficas por programa (dashboard)

El backend `metricas_participantes` ya agrupa por sexo, edad, municipio y escuela. Se amplía para incluir los nuevos campos:

- **Nuevos desgloses:** `por_estado_civil`, `por_grado_estudios`, `por_estado_nacimiento`.
- **Edad:** se sigue calculando por rangos (ya existe `por_grupo_edad`); ahora alimentada por `fecha_nacimiento`.
- **Filtro por programa:** ya soportado (las gráficas demográficas se recalculan al elegir programa).

En el dashboard se agregan las tarjetas/gráficas correspondientes (género — pastel; edad — barras; estado civil, grado de estudios, estado de nacimiento, municipio — barras), todas filtrables por programa/fecha.

---

## 5. Validación y normalización

| Campo | Regla |
|-------|-------|
| correo | requerido para upsert; minúsculas; clave de deduplicación |
| fecha_nacimiento | parsear dd/mm/aaaa o aaaa-mm-dd; si inválida → fila con error (no rompe la importación) |
| género | mapear a enum `sexo`; si no mapea → `null` + aviso |
| celular | quitar espacios/guiones; validar 10 dígitos (aviso, no bloqueante) |
| CURP | 18 caracteres en mayúsculas (aviso si no cuadra) |
| estado_civil / grado_estudios | texto libre normalizado (idealmente desde el catálogo del Form) |

Las filas con error se reportan (como ya hace el importador) sin abortar el resto.

---

## 6. Orden de implementación / entregables

1. **SQL de migración** (`database/migration_demograficos.sql`) — nuevas columnas + índice único en correo.
2. **Tipos** (`frontend/src/types`) — ampliar `Participante`.
3. **Importador** — reconocimiento demográfico (alias), upsert por correo, cálculo de edad, separar demografía de preguntas, panel de revisión en dos bloques.
4. **Formulario manual de participante** — agregar los campos nuevos.
5. **Backend `metricas.py`** — nuevos desgloses demográficos.
6. **Dashboard** — gráficas demográficas por programa.
7. **Plantilla de Forms homologada** — documento guía + Form de ejemplo para clonar.

---

## 7. Decisiones (CONFIRMADAS)

1. **Edad:** se guarda `fecha_nacimiento` y la edad se **calcula dinámicamente (edad actual)**.
   → Implicación técnica: el backend `metricas_participantes` agrupará `por_grupo_edad` **calculando la edad desde `fecha_nacimiento`** en cada consulta, no desde la columna `edad`. Se mantiene `edad` como apoyo, pero la fuente de verdad es la fecha.
2. **Grado de Estudios:** **lista cerrada** → `Secundaria, Preparatoria, Universidad, Posgrado, Otro`.
3. **CURP:** **solo guardar** (sin derivar datos).
4. **Estado de Nacimiento:** **desplegable** con catálogo fijo de los 32 estados de México. **Municipio:** texto libre.

### Catálogo de estados (para el desplegable del Form y validación)
Aguascalientes, Baja California, Baja California Sur, Campeche, Chiapas, Chihuahua, Ciudad de México, Coahuila, Colima, Durango, Estado de México, Guanajuato, Guerrero, Hidalgo, Jalisco, Michoacán, Morelos, Nayarit, Nuevo León, Oaxaca, Puebla, Querétaro, Quintana Roo, San Luis Potosí, Sinaloa, Sonora, Tabasco, Tamaulipas, Tlaxcala, Veracruz, Yucatán, Zacatecas.
