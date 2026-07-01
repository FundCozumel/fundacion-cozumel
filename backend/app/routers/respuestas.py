from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.auth import TokenPayload, verify_token
from app.database import get_user_client
from app.models import RespuestasBulk

router = APIRouter(prefix="/respuestas", tags=["respuestas"])
bearer_scheme = HTTPBearer()


@router.post("", status_code=status.HTTP_201_CREATED, summary="Enviar respuestas de un cuestionario")
def enviar_respuestas(
    body: RespuestasBulk,
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    """
    Registra todas las respuestas de un participante para una sesión de cuestionario.
    Se envían en una sola llamada para garantizar atomicidad.
    """
    supabase = get_user_client(credentials.credentials)

    rows = []
    for item in body.respuestas:
        row = item.model_dump(mode="json")
        row["cuestionario_id"] = str(body.cuestionario_id)
        row["participante_id"] = str(body.participante_id)
        if body.actividad_id:
            row["actividad_id"] = str(body.actividad_id)
        rows.append(row)

    if not rows:
        raise HTTPException(status_code=400, detail="La lista de respuestas está vacía")

    res = supabase.table("respuestas").insert(rows).execute()
    return {"insertadas": len(res.data), "respuestas": res.data}


@router.get("", summary="Listar respuestas")
def listar_respuestas(
    cuestionario_id: str | None = Query(None),
    participante_id: str | None = Query(None),
    actividad_id: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)
    q = (
        supabase.table("respuestas")
        .select("*, preguntas(texto, tipo_respuesta), opciones_respuesta(etiqueta, valor)")
        .order("creado_en", desc=True)
        .range(offset, offset + limit - 1)
    )
    if cuestionario_id:
        q = q.eq("cuestionario_id", cuestionario_id)
    if participante_id:
        q = q.eq("participante_id", participante_id)
    if actividad_id:
        q = q.eq("actividad_id", actividad_id)
    return q.execute().data
