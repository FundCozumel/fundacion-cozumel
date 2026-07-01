# Sistema de Autoevaluación — Fundación Comunitaria Cozumel, IAP

## Estructura del proyecto

```
sistema/
├── database/          # SQL: schema, seed, RLS, test queries
├── frontend/          # Next.js 14 (App Router) + Tailwind + @supabase/ssr
└── backend/           # FastAPI + supabase-py
```

---

## 1. Configurar variables de entorno

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (`backend/.env`)
```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
SUPABASE_JWT_SECRET=tu-jwt-secret
FRONTEND_URL=http://localhost:3000
```

**Dónde obtener estos valores en Supabase:**
| Variable | Ruta en Supabase Dashboard |
|----------|---------------------------|
| `SUPABASE_URL` | Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role |
| `SUPABASE_JWT_SECRET` | Settings → API → JWT Settings → JWT Secret |

---

## 2. Crear el primer usuario administrador

1. En Supabase Dashboard → **Authentication → Users → Add user**
2. Ingresar email y contraseña.
3. Copiar el UUID generado.
4. En SQL Editor ejecutar:

```sql
INSERT INTO usuarios (auth_user_id, nombre, apellido_paterno, correo, rol_id)
VALUES (
    '<UUID_AQUI>',
    'Nombre',
    'Apellido',
    'correo@ejemplo.com',
    (SELECT id FROM roles WHERE nombre = 'administrador')
);
```

---

## 3. Instalar dependencias y correr

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/docs
```

---

## Flujo de autenticación

```
1. Usuario ingresa email/contraseña en /login
2. supabase.auth.signInWithPassword() → JWT de Supabase
3. @supabase/ssr guarda el JWT en cookie httpOnly
4. middleware.ts refresca la sesión en cada request
5. /dashboard (Server Component) lee la sesión del cookie
6. Queries directas a Supabase → RLS aplica con auth.uid()
7. Para endpoints de FastAPI: Next.js envía Bearer <jwt>
8. FastAPI valida JWT con SUPABASE_JWT_SECRET (python-jose)
9. FastAPI crea cliente supabase-py con el JWT del usuario
10. PostgREST recibe el JWT → get_current_user_role() funciona → RLS aplica
```
