from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.auth import TokenPayload, verify_token
from app.database import get_user_client
from app.models import (
    CuestionarioCreate, CuestionarioUpdate,
    PreguntaCreate, PreguntaUpdate,
    OpcionCreate,
)

router = APIRouter(tags=["cuestionarios"])
bearer_scheme = HTTPBearer()


# ── Cuestionarios ──────────────────────────────────────────────────────────────

@router.get("/cuestionarios", summary="Listar cuestionarios")
def listar_cuestionarios(
    programa_id: str | None = Query(None),
    tipo: str | None = Query(None),
    activo: bool | None = Query(None),
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    q = supabase.table("cuestionarios").select("*, programas(nombre), actividades(nombre)").order("nombre")
    if programa_id:
        q = q.eq("programa_id", programa_id)
    if tipo:
        q = q.eq("tipo", tipo)
    if activo is not None:
        q = q.eq("activo", activo)
    return q.execute().data


@router.post("/cuestionarios", status_code=status.HTTP_201_CREATED, summary="Crear cuestionario")
def crear_cuestionario(
    body: CuestionarioCreate,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    res = supabase.table("cuestionarios").insert(body.model_dump(mode="json")).execute()
    return res.data[0]


@router.get("/cuestionarios/{id}", summary="Obtener cuestionario con preguntas y opciones")
def obtener_cuestionario(
    id: str,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    res = (
        supabase.table("cuestionarios")
        .select("*, programas(nombre), preguntas(*, opciones_respuesta(*))")
        .eq("id", id)
        .maybe_single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado")
    return res.data


@router.put("/cuestionarios/{id}", summary="Actualizar cuestionario")
def actualizar_cuestionario(
    id: str,
    body: CuestionarioUpdate,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    data = body.model_dump(mode="json", exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="Sin campos para actualizar")
    res = supabase.table("cuestionarios").update(data).eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado")
    return res.data[0]


@router.delete("/cuestionarios/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar cuestionario")
def eliminar_cuestionario(
    id: str,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    supabase.table("cuestionarios").delete().eq("id", id).execute()


# ── Preguntas ──────────────────────────────────────────────────────────────────

@router.post("/cuestionarios/{id}/preguntas", status_code=status.HTTP_201_CREATED, summary="Agregar pregunta")
def agregar_pregunta(
    id: str,
    body: PreguntaCreate,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    res = supabase.table("preguntas").insert({
        **body.model_dump(mode="json"),
        "cuestionario_id": id,
    }).execute()
    return res.data[0]


@router.put("/preguntas/{id}", summary="Actualizar pregunta")
def actualizar_pregunta(
    id: str,
    body: PreguntaUpdate,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    data = body.model_dump(mode="json", exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="Sin campos para actualizar")
    res = supabase.table("preguntas").update(data).eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")
    return res.data[0]


@router.delete("/preguntas/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar pregunta")
def eliminar_pregunta(
    id: str,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    supabase.table("preguntas").delete().eq("id", id).execute()


# ── Opciones de respuesta ──────────────────────────────────────────────────────

@router.post("/preguntas/{id}/opciones", status_code=status.HTTP_201_CREATED, summary="Agregar opción de respuesta")
def agregar_opcion(
    id: str,
    body: OpcionCreate,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    res = supabase.table("opciones_respuesta").insert({
        **body.model_dump(mode="json"),
        "pregunta_id": id,
    }).execute()
    return res.data[0]


@router.delete("/opciones/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar opción de respuesta")
def eliminar_opcion(
    id: str,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    supabase.table("opciones_respuesta").delete().eq("id", id).execute()
