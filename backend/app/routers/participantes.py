from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.auth import TokenPayload, verify_token
from app.database import get_user_client
from app.models import ParticipanteCreate, ParticipanteUpdate

router = APIRouter(prefix="/participantes", tags=["participantes"])
bearer_scheme = HTTPBearer()


@router.get("", summary="Listar participantes")
def listar_participantes(
    search: str | None = Query(None, description="Buscar por nombre o correo"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    q = (
        supabase.table("participantes")
        .select("*")
        .order("nombre")
        .range(offset, offset + limit - 1)
    )
    if search:
        q = q.or_(f"nombre.ilike.%{search}%,correo.ilike.%{search}%")
    return q.execute().data


@router.post("", status_code=status.HTTP_201_CREATED, summary="Crear participante")
def crear_participante(
    body: ParticipanteCreate,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    res = supabase.table("participantes").insert(body.model_dump(mode="json")).execute()
    return res.data[0]


@router.get("/{id}", summary="Obtener participante")
def obtener_participante(
    id: str,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    res = (
        supabase.table("participantes")
        .select("*, asistencias(actividad_id, estatus, actividades(nombre, fecha_inicio))")
        .eq("id", id)
        .maybe_single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Participante no encontrado")
    return res.data


@router.put("/{id}", summary="Actualizar participante")
def actualizar_participante(
    id: str,
    body: ParticipanteUpdate,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    data = body.model_dump(mode="json", exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="Sin campos para actualizar")
    res = supabase.table("participantes").update(data).eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Participante no encontrado")
    return res.data[0]


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar participante")
def eliminar_participante(
    id: str,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    supabase.table("participantes").delete().eq("id", id).execute()
