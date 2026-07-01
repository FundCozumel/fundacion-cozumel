from fastapi import APIRouter, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from app.auth import TokenPayload, verify_token
from app.database import get_user_client
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
bearer_scheme = HTTPBearer()


class DashboardStats(BaseModel):
    programas_activos: int
    total_participantes: int
    actividades_del_mes: int
    total_usuarios: int | None = None
    rol: str


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)

    res_programas = supabase.table("programas").select("id", count="exact").eq("estatus", True).execute()
    programas_activos = res_programas.count or 0

    res_participantes = supabase.table("participantes").select("id", count="exact").execute()
    total_participantes = res_participantes.count or 0

    inicio_mes = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    res_actividades = (
        supabase.table("actividades")
        .select("id", count="exact")
        .gte("created_at", inicio_mes.isoformat())
        .execute()
    )
    actividades_del_mes = res_actividades.count or 0

    total_usuarios = None
    res_perfil = supabase.table("usuarios").select("roles(nombre)").eq("auth_user_id", token.sub).single().execute()
    rol = ""
    if res_perfil.data:
        rol = res_perfil.data.get("roles", {}).get("nombre", "")

    if rol == "administrador":
        res_usuarios = supabase.table("usuarios").select("id", count="exact").eq("estatus", True).execute()
        total_usuarios = res_usuarios.count or 0

    return DashboardStats(
        programas_activos=programas_activos,
        total_participantes=total_participantes,
        actividades_del_mes=actividades_del_mes,
        total_usuarios=total_usuarios,
        rol=rol,
    )
