# Base de Datos — Sistema de Autoevaluación
**Fundación Comunitaria Cozumel, IAP**

---

## Orden de ejecución

Ejecutar los archivos en este orden en el **Supabase SQL Editor**:

| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | `schema.sql` | Crea extensiones, función auxiliar, tablas, constraints y triggers |
| 2 | `seed.sql` | Inserta datos iniciales (roles, programas, sedes) |
| 3 | `rls.sql` | Activa RLS y crea todas las políticas de acceso por rol |
| 4 | `test_queries.sql` | Consultas de validación — verificar que todo quedó correctamente |

---

## Qué hace cada archivo

### `schema.sql`
- Activa la extensión `pgcrypto` para `gen_random_uuid()`.
- Crea la función `update_updated_at_column()` usada por todos los triggers.
- Define las 11 tablas del sistema con sus columnas, tipos, constraints y llaves foráneas.
- Crea triggers `BEFORE UPDATE` para mantener `updated_at` actualizado automáticamente.
- Agrega comentarios SQL en tablas y columnas clave.

**Tablas creadas:** `roles`, `usuarios`, `programas`, `sedes`, `actividades`, `participantes`, `asistencias`, `cuestionarios`, `preguntas`, `opciones_respuesta`, `respuestas`.

### `seed.sql`
- Inserta los dos roles del sistema: `administrador` y `coordinador`.
- Inserta los programas iniciales: `Liderazgo` y `Startup Weekend`.
- Inserta las sedes iniciales: `Fundación Comunitaria Cozumel` y `Cozumel`.
- **No inserta usuarios** porque estos dependen de Supabase Auth (ver advertencia abajo).

### `rls.sql`
- Activa `ROW LEVEL SECURITY` en las 11 tablas.
- Crea la función `get_current_user_role()` que consulta el rol del usuario autenticado usando `auth.uid()`.
- Crea políticas separadas por tabla, operación y rol:

| Operación | Administrador | Coordinador |
|-----------|:---:|:---:|
| SELECT | ✅ | ✅ |
| INSERT | ✅ | ✅ |
| UPDATE | ✅ | ✅ |
| DELETE | ✅ | ❌ |

- No existen políticas para acceso público ni para participantes.

### `test_queries.sql`
- Verifica existencia de las 11 tablas.
- Verifica que los roles `administrador` y `coordinador` fueron insertados.
- Verifica que los programas y sedes fueron insertados.
- Verifica que RLS está activo en todas las tablas.
- Lista las políticas RLS creadas.
- Verifica las foreign keys del esquema.
- Verifica los constraints CHECK (valores controlados).
- Verifica los triggers creados.
- Verifica las funciones auxiliares.
- Incluye pruebas comentadas de constraints inválidos.

---

## Cómo ejecutarlo en Supabase SQL Editor

1. Ingresar a [app.supabase.com](https://app.supabase.com) y abrir el proyecto.
2. Ir a **SQL Editor** en el menú lateral.
3. Crear una nueva consulta con **New query**.
4. Pegar el contenido completo de `schema.sql` y ejecutar con **Run** (o `Ctrl+Enter`).
5. Verificar que no haya errores en el panel de resultados.
6. Repetir el proceso para `seed.sql`, `rls.sql` y `test_queries.sql` en ese orden.

> **Tip:** Cada archivo puede ejecutarse completo de una sola vez. No es necesario ejecutarlo por secciones.

---

## Qué revisar después de ejecutar

- En `test_queries.sql`, todas las consultas deben devolver resultados consistentes con lo esperado (indicado en los comentarios de cada consulta).
- Confirmar que la columna `rls_enabled` aparece como `true` para las 11 tablas.
- Confirmar que existen exactamente **2 roles**: `administrador` y `coordinador`. El rol `observador` **no debe existir**.
- Confirmar que las políticas RLS no incluyen ninguna referencia a `observador` ni acceso `public`.
- En el panel **Table Editor** de Supabase, las tablas deben ser visibles con sus columnas y relaciones.

---

## ⚠️ Advertencia: Creación de usuarios reales

Los usuarios del sistema (`administrador`, `coordinador`) **deben crearse primero en Supabase Auth** antes de relacionarse con la tabla `usuarios`.

**Proceso correcto:**

1. Crear el usuario en Supabase Auth:
   - Desde el **Dashboard**: `Authentication > Users > Invite user`
   - O desde la app con `supabase.auth.signUp({ email, password })`

2. Obtener el `UUID` generado por Supabase Auth para ese usuario.

3. Insertar el registro en la tabla `usuarios` relacionándolo:

```sql
INSERT INTO usuarios (auth_user_id, nombre, apellido_paterno, correo, rol_id)
VALUES (
    '<UUID_OBTENIDO_DE_AUTH_USERS>',
    'Nombre',
    'Apellido',
    'correo@ejemplo.com',
    (SELECT id FROM roles WHERE nombre = 'administrador')
);
```

> Los **participantes** (jóvenes) no tienen usuario en Supabase Auth ni acceso al sistema. Se registran únicamente en la tabla `participantes`.

---

## Conexión con FastAPI

La base queda lista para conectarse con FastAPI usando cualquiera de estos clientes:

- [`supabase-py`](https://github.com/supabase-community/supabase-py) — cliente oficial de Supabase para Python.
- [`asyncpg`](https://github.com/MagicStack/asyncpg) — conexión directa a PostgreSQL (recomendado para endpoints de alto rendimiento).
- [`SQLAlchemy`](https://docs.sqlalchemy.org/) + `asyncpg` — ORM completo con soporte async.

La cadena de conexión a la base de datos se obtiene desde:
`Supabase Dashboard > Settings > Database > Connection string`.
