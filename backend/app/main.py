from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Cargar variables de entorno ANTES de importar routers, ya que varios módulos
# (database, auth) leen os.getenv a nivel de módulo al importarse.
load_dotenv()

from app.routers import dashboard  # noqa: E402
from app.routers import programas, participantes, actividades, cuestionarios, respuestas, metricas  # noqa: E402

app = FastAPI(
    title="Sistema de Autoevaluación — API",
    description="Backend del Sistema de Autoevaluación de la Fundación Comunitaria Cozumel.",
    version="0.2.0",
)

# FRONTEND_URL puede tener varias URLs separadas por coma (producción + previews).
# Siempre se permite localhost para desarrollo.
_frontend_env = os.getenv("FRONTEND_URL", "http://localhost:3000")
_orígenes = [u.strip() for u in _frontend_env.split(",") if u.strip()]
for local in ("http://localhost:3000", "http://127.0.0.1:3000"):
    if local not in _orígenes:
        _orígenes.append(local)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_orígenes,
    # Permite subdominios de previews de Vercel (proyecto-*.vercel.app).
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,  # cachea el preflight OPTIONS 1h (menos viajes en importaciones masivas)
)

app.include_router(dashboard.router)
app.include_router(programas.router)
app.include_router(participantes.router)
app.include_router(actividades.router)
app.include_router(cuestionarios.router)
app.include_router(respuestas.router)
app.include_router(metricas.router)


@app.get("/health", tags=["sistema"])
def health_check():
    return {"status": "ok", "service": "sistema-autoevaluacion-api"}
