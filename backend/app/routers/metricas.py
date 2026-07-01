from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.auth import TokenPayload, verify_token
from app.database import get_user_client
from collections import Counter
from datetime import date

router = APIRouter(prefix="/metricas", tags=["métricas"])
bearer_scheme = HTTPBearer()


def calcular_edad(fecha_nacimiento: str | None) -> int | None:
    """Edad actual (años cumplidos) a partir de una fecha ISO (YYYY-MM-DD)."""
    if not fecha_nacimiento:
        return None
    try:
        y, m, d = (int(x) for x in fecha_nacimiento[:10].split("-"))
        hoy = date.today()
        return hoy.year - y - ((hoy.month, hoy.day) < (m, d))
    except (ValueError, TypeError):
        return None


@router.get("/resumen", summary="Resumen general del sistema")
def resumen_general(
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)

    programas = supabase.table("programas").select("id", count="exact").eq("estatus", True).execute()
    participantes = supabase.table("participantes").select("id", count="exact").execute()
    actividades = supabase.table("actividades").select("id", count="exact").execute()
    cuestionarios = supabase.table("cuestionarios").select("id", count="exact").eq("activo", True).execute()
    asistencias = supabase.table("asistencias").select("id", count="exact").eq("estatus", "asistio").execute()

    return {
        "programas_activos": programas.count or 0,
        "total_participantes": participantes.count or 0,
        "total_actividades": actividades.count or 0,
        "cuestionarios_activos": cuestionarios.count or 0,
        "asistencias_confirmadas": asistencias.count or 0,
    }


@router.get("/participantes", summary="Desglose demográfico de participantes")
def metricas_participantes(
    programa_id: str | None = Query(None, description="Filtrar por programa"),
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)

    campos = "id, sexo, edad, fecha_nacimiento, municipio, escuela, estado_civil, grado_estudios, estado_nacimiento"

    if programa_id:
        # Participantes que asistieron a actividades del programa indicado.
        # actividades!inner permite filtrar por la columna de la relación embebida.
        res = (
            supabase.table("asistencias")
            .select(f"participantes({campos}), actividades!inner(programa_id)")
            .eq("actividades.programa_id", programa_id)
            .execute()
        )
        # Deduplicar por participante para no contar al mismo varias veces.
        vistos: dict = {}
        for r in res.data:
            p = r.get("participantes")
            if p and p.get("id"):
                vistos[p["id"]] = p
        participantes = list(vistos.values())
    else:
        res = supabase.table("participantes").select(campos).execute()
        participantes = res.data

    sexo_count = Counter(p.get("sexo") or "no_especificado" for p in participantes)
    municipio_count = Counter(p.get("municipio") or "no_especificado" for p in participantes)
    escuela_count = Counter(p.get("escuela") or "no_especificado" for p in participantes)
    estado_civil_count = Counter(p.get("estado_civil") or "no_especificado" for p in participantes)
    grado_count = Counter(p.get("grado_estudios") or "no_especificado" for p in participantes)
    estado_nac_count = Counter(p.get("estado_nacimiento") or "no_especificado" for p in participantes)

    # Edad: se calcula desde fecha_nacimiento (fuente de verdad); si falta, usa la columna edad.
    edades = []
    for p in participantes:
        edad = calcular_edad(p.get("fecha_nacimiento"))
        if edad is None:
            edad = p.get("edad")
        if edad is not None:
            edades.append(edad)

    # Grupos de edad que cubren tanto jóvenes como adultos.
    # El orden de esta lista define el orden en que se grafican.
    ORDEN_GRUPOS = ["< 18", "18–24", "25–34", "35–44", "45–54", "55–64", "65+"]

    def grupo_de(edad: int) -> str:
        if edad < 18:
            return "< 18"
        if edad <= 24:
            return "18–24"
        if edad <= 34:
            return "25–34"
        if edad <= 44:
            return "35–44"
        if edad <= 54:
            return "45–54"
        if edad <= 64:
            return "55–64"
        return "65+"

    conteo = Counter(grupo_de(edad) for edad in edades)
    # Emitir en orden lógico, omitiendo los grupos vacíos.
    grupos_edad = {g: conteo[g] for g in ORDEN_GRUPOS if conteo[g] > 0}

    return {
        "total": len(participantes),
        "por_sexo": dict(sexo_count),
        "por_grupo_edad": dict(grupos_edad),
        "por_municipio": dict(municipio_count.most_common(10)),
        "por_escuela": dict(escuela_count.most_common(10)),
        "por_estado_civil": dict(estado_civil_count),
        "por_grado_estudios": dict(grado_count),
        "por_estado_nacimiento": dict(estado_nac_count.most_common(15)),
    }


@router.get("/asistencia", summary="Estadísticas de asistencia")
def metricas_asistencia(
    programa_id: str | None = Query(None),
    actividad_id: str | None = Query(None),
    fecha_inicio: str | None = Query(None, description="Filtra actividades con fecha_inicio >= (YYYY-MM-DD)"),
    fecha_fin: str | None = Query(None, description="Filtra actividades con fecha_inicio <= (YYYY-MM-DD)"),
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    supabase = get_user_client(credentials.credentials)

    q = supabase.table("asistencias").select(
        "estatus, actividades(nombre, programa_id, fecha_inicio, programas(nombre))"
    )
    if actividad_id:
        q = q.eq("actividad_id", actividad_id)
    res = q.execute()

    rows = res.data

    def actividad(r):
        return r.get("actividades") or {}

    if programa_id:
        rows = [r for r in rows if actividad(r).get("programa_id") == programa_id]
    if fecha_inicio:
        rows = [r for r in rows if (actividad(r).get("fecha_inicio") or "") >= fecha_inicio]
    if fecha_fin:
        rows = [r for r in rows if (actividad(r).get("fecha_inicio") or "9999") <= fecha_fin]

    estatus_count = Counter(r.get("estatus") for r in rows)
    total = len(rows)
    asistio = estatus_count.get("asistio", 0)

    return {
        "total_registros": total,
        "por_estatus": dict(estatus_count),
        "tasa_asistencia": round(asistio / total * 100, 1) if total else 0,
    }


@router.get("/cuestionarios/{id}/resultados", summary="Resultados de un cuestionario")
def resultados_cuestionario(
    id: str,
    actividad_id: str | None = Query(None, description="Filtra respuestas por actividad"),
    fecha_inicio: str | None = Query(None, description="Respuestas con creado_en >= (YYYY-MM-DD)"),
    fecha_fin: str | None = Query(None, description="Respuestas con creado_en <= (YYYY-MM-DD)"),
    token: TokenPayload = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    """
    Agrega las respuestas por pregunta:
    - texto/fecha: cuenta total de respuestas
    - numero: min, max, promedio
    - opcion_multiple / si_no / likert_1_5: conteo por opción

    Filtros opcionales: actividad_id y rango de fechas sobre creado_en.
    """
    supabase = get_user_client(credentials.credentials)

    cuestionario = (
        supabase.table("cuestionarios")
        .select("nombre, tipo, preguntas(id, texto, tipo_respuesta, orden)")
        .eq("id", id)
        .maybe_single()
        .execute()
    )
    if not cuestionario.data:
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado")

    base = supabase.table("respuestas").select(
        "pregunta_id, opcion_id, participante_id, valor_texto, valor_num, valor_fecha, "
        "opciones_respuesta(etiqueta, valor), "
        "participantes(nombre, apellido_paterno, apellido_materno, correo)"
    ).eq("cuestionario_id", id)
    if actividad_id:
        base = base.eq("actividad_id", actividad_id)
    if fecha_inicio:
        base = base.gte("creado_en", fecha_inicio)
    if fecha_fin:
        # incluir todo el día indicado
        base = base.lte("creado_en", f"{fecha_fin}T23:59:59")
    respuestas = base.execute().data

    total_respondentes = len({r["participante_id"] for r in respuestas})

    preguntas = sorted(
        cuestionario.data.get("preguntas", []),
        key=lambda p: p.get("orden") or 999,
    )

    resultados = []
    for pregunta in preguntas:
        pid = pregunta["id"]
        tipo = pregunta["tipo_respuesta"]
        rs = [r for r in respuestas if r["pregunta_id"] == pid]

        if tipo in ("opcion_multiple", "si_no", "likert_1_5"):
            conteo: Counter = Counter()
            for r in rs:
                etiqueta = (r.get("opciones_respuesta") or {}).get("etiqueta", "sin_opcion")
                conteo[etiqueta] += 1
            resultados.append({
                "pregunta_id": pid,
                "texto": pregunta["texto"],
                "tipo": tipo,
                "total_respuestas": len(rs),
                "distribucion": dict(conteo),
            })

        elif tipo == "numero":
            nums = [r["valor_num"] for r in rs if r.get("valor_num") is not None]
            resultados.append({
                "pregunta_id": pid,
                "texto": pregunta["texto"],
                "tipo": tipo,
                "total_respuestas": len(nums),
                "promedio": round(sum(nums) / len(nums), 2) if nums else None,
                "minimo": min(nums) if nums else None,
                "maximo": max(nums) if nums else None,
            })

        else:  # texto, fecha
            valores = []
            for r in rs:
                val = r.get("valor_texto") if tipo == "texto" else r.get("valor_fecha")
                if not val:
                    continue
                p = r.get("participantes") or {}
                nombre = " ".join(
                    x for x in [p.get("nombre"), p.get("apellido_paterno"), p.get("apellido_materno")] if x
                ) or p.get("correo") or "—"
                valores.append({"participante": nombre, "valor": str(val)})
            resultados.append({
                "pregunta_id": pid,
                "texto": pregunta["texto"],
                "tipo": tipo,
                "total_respuestas": len(valores),
                "respuestas": valores,
            })

    return {
        "cuestionario": cuestionario.data["nombre"],
        "tipo": cuestionario.data["tipo"],
        "total_respondentes": total_respondentes,
        "preguntas": resultados,
    }
