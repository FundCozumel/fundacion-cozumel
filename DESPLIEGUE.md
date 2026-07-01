# Guía de despliegue gratuito

Sistema de Autoevaluación · Fundación Comunitaria Cozumel, IAP

Stack de despliegue (todo en plan gratuito):

| Componente | Servicio | URL final (ejemplo) |
|---|---|---|
| Frontend (Next.js) | **Vercel** | `https://fundacion-cozumel.vercel.app` |
| Backend (FastAPI) | **Render** | `https://fundacion-cozumel-api.onrender.com` |
| Base de datos + Auth | **Supabase** | (ya existe) |

> ⚠️ El backend en Render (plan free) se **duerme tras 15 min** sin uso. La primera petición después de dormir tarda ~30-60s en responder; luego va normal.

---

## Paso 1 — Subir el código a GitHub

Ya está inicializado Git y hecho el commit inicial. Falta crear el repositorio remoto y subirlo.

1. Entra a <https://github.com/new> y crea un repositorio **privado** (ej. `sistema-cozumel`). **No** marques "Add README" (ya tenemos uno).
2. Copia la URL del repo (ej. `https://github.com/TU-USUARIO/sistema-cozumel.git`).
3. En la terminal, dentro de la carpeta `sistema/`:

```bash
git remote add origin https://github.com/TU-USUARIO/sistema-cozumel.git
git push -u origin main
```

> Git te pedirá iniciar sesión en GitHub (usa el navegador o un Personal Access Token).

---

## Paso 2 — Desplegar el backend en Render

1. Entra a <https://render.com> y regístrate con tu cuenta de GitHub.
2. **New +** → **Blueprint** → selecciona tu repositorio. Render detectará el archivo `render.yaml` automáticamente.
3. Cuando pida las variables de entorno (marcadas como `sync: false`), pega estos valores (los mismos de tu `backend/.env`):

   | Variable | Valor |
   |---|---|
   | `SUPABASE_URL` | `https://hzkbobrpihbfhezidgoe.supabase.co` |
   | `SUPABASE_ANON_KEY` | *(tu anon key)* |
   | `SUPABASE_SERVICE_ROLE_KEY` | *(tu service role key)* |
   | `SUPABASE_JWT_SECRET` | *(tu JWT secret)* |
   | `FRONTEND_URL` | *(se llena en el Paso 4, deja `http://localhost:3000` por ahora)* |

4. **Apply** / **Create**. Render instalará dependencias y arrancará `uvicorn`.
5. Cuando termine, copia la URL pública del servicio (ej. `https://sistema-autoevaluacion-api.onrender.com`).
6. Verifica que vive: abre `<esa-url>/health` → debe responder `{"status":"ok",...}`.

---

## Paso 3 — Desplegar el frontend en Vercel

1. Entra a <https://vercel.com> y regístrate con GitHub.
2. **Add New** → **Project** → importa tu repositorio.
3. **Root Directory:** selecciona **`frontend`** (importante, el repo tiene varias carpetas).
4. Framework Preset: **Next.js** (se detecta solo).
5. En **Environment Variables**, agrega:

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://hzkbobrpihbfhezidgoe.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(tu anon key)* |
   | `NEXT_PUBLIC_API_URL` | *(la URL de Render del Paso 2)* |

6. **Deploy**. Al terminar, copia la URL pública (ej. `https://sistema-cozumel.vercel.app`).

---

## Paso 4 — Conectar backend ↔ frontend ↔ Supabase

**a) Decirle al backend cuál es el frontend (CORS):**
1. En Render → tu servicio → **Environment** → edita `FRONTEND_URL` con la URL de Vercel (Paso 3).
2. Guarda; Render reinicia solo.

**b) Autorizar la URL de producción en Supabase (para el login):**
1. En Supabase → **Authentication** → **URL Configuration**.
2. **Site URL:** la URL de Vercel.
3. **Redirect URLs:** agrega la URL de Vercel (y `https://*.vercel.app` si quieres previews).

---

## Paso 5 — Probar

1. Abre la URL de Vercel.
2. Inicia sesión (la primera petición al backend puede tardar ~30-60s si Render estaba dormido).
3. Revisa Dashboard, Importar, Cuestionarios, Participantes.

---

## Actualizaciones futuras

Cada vez que quieras publicar cambios:

```bash
git add -A
git commit -m "descripción del cambio"
git push
```

Vercel y Render **redepliegan automáticamente** con cada `push` a `main`.

---

## Notas del plan gratuito

- **Render free:** el backend se duerme tras 15 min de inactividad (primera carga lenta). Se puede evitar con un "cron" externo que haga ping a `/health` cada 10 min (ej. <https://cron-job.org>, también gratis).
- **Supabase free:** el proyecto se pausa tras ~1 semana sin actividad; se reactiva desde el dashboard con un clic. 500 MB de base de datos.
- **Vercel Hobby:** gratis para uso no comercial; ideal para este proyecto.
