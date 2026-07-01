from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.auth import TokenPayload, verify_token
from app.database import get_user_client
from app.models import ProgramaCreate, ProgramaUpdate

router = APIRouter(prefix="/programas", tags=["programas"])
bearer_scheme = HTTPBearer()


@router.get("", summary="Listar programas")
def listar_programas(
    activos: bool | None = Query(None, description="true = solo activos, false = solo inactivos"),
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    q = supabase.table("programas").select("*").order("nombre")
    if activos is not None:
        q = q.eq("estatus", activos)
    return q.execute().data


@router.post("", status_code=status.HTTP_201_CREATED, summary="Crear programa")
def crear_programa(
    body: ProgramaCreate,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    res = supabase.table("programas").insert(body.model_dump(mode="json")).execute()
    return res.data[0]


@router.get("/{id}", summary="Obtener programa")
def obtener_programa(
    id: str,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    res = supabase.table("programas").select("*").eq("id", id).maybe_single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Programa no encontrado")
    return res.data


@router.put("/{id}", summary="Actualizar programa")
def actualizar_programa(
    id: str,
    body: ProgramaUpdate,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    data = body.model_dump(mode="json", exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="Sin campos para actualizar")
    res = supabase.table("programas").update(data).eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Programa no encontrado")
    return res.data[0]


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Desactivar programa")
def desactivar_programa(
    id: str,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    """Realiza un borrado suave: pone estatus = false para preservar el historial."""
    supabase = get_user_client(credentials.credentials)
    supabase.table("programas").update({"estatus": False}).eq("id", id).execute()
