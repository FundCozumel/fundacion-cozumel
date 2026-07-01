from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.auth import TokenPayload, verify_token
from app.database import get_user_client
from app.models import ActividadCreate, ActividadUpdate, AsistenciaCreate, AsistenciaUpdate
from typing import List

router = APIRouter(prefix="/actividades", tags=["actividades"])
bearer_scheme = HTTPBearer()


@router.get("", summary="Listar actividades")
def listar_actividades(
    programa_id: str | None = Query(None),
    sede_id: str | None = Query(None),
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    q = (
        supabase.table("actividades")
        .select("*, programas(nombre), sedes(nombre)")
        .order("fecha_inicio", desc=True)
    )
    if programa_id:
        q = q.eq("programa_id", programa_id)
    if sede_id:
        q = q.eq("sede_id", sede_id)
    return q.execute().data


@router.post("", status_code=status.HTTP_201_CREATED, summary="Crear actividad")
def crear_actividad(
    body: ActividadCreate,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    res = supabase.table("actividades").insert(body.model_dump(mode="json")).execute()
    return res.data[0]


@router.get("/{id}", summary="Obtener actividad")
def obtener_actividad(
    id: str,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    res = (
        supabase.table("actividades")
        .select("*, programas(id, nombre), sedes(id, nombre, municipio)")
        .eq("id", id)
        .maybe_single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    return res.data


@router.put("/{id}", summary="Actualizar actividad")
def actualizar_actividad(
    id: str,
    body: ActividadUpdate,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    data = body.model_dump(mode="json", exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="Sin campos para actualizar")
    res = supabase.table("actividades").update(data).eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    return res.data[0]


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar actividad")
def eliminar_actividad(
    id: str,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    supabase.table("actividades").delete().eq("id", id).execute()


# ── Asistencias ────────────────────────────────────────────────────────────────

@router.get("/{id}/asistencias", summary="Listar asistencias de una actividad")
def listar_asistencias(
    id: str,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    res = (
        supabase.table("asistencias")
        .select("*, participantes(id, nombre, apellido_paterno, correo)")
        .eq("actividad_id", id)
        .order("created_at")
        .execute()
    )
    return res.data


@router.post("/{id}/asistencias", status_code=status.HTTP_201_CREATED, summary="Registrar asistencia(s)")
def registrar_asistencias(
    id: str,
    body: List[AsistenciaCreate],
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    """Acepta una lista de uno o más participantes para registrar en la actividad."""
    supabase = get_user_client(credentials.credentials)
    rows = [
        {**item.model_dump(mode="json"), "actividad_id": id}
        for item in body
    ]
    res = supabase.table("asistencias").upsert(rows, on_conflict="participante_id,actividad_id").execute()
    return res.data


@router.patch("/{id}/asistencias/{participante_id}", summary="Actualizar estatus de asistencia")
def actualizar_asistencia(
    id: str,
    participante_id: str,
    body: AsistenciaUpdate,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    res = (
        supabase.table("asistencias")
        .update({"estatus": body.estatus})
        .eq("actividad_id", id)
        .eq("participante_id", participante_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Registro de asistencia no encontrado")
    return res.data[0]
