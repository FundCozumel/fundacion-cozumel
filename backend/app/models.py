from pydantic import BaseModel
from typing import Optional, Literal, List
from datetime import date
from uuid import UUID

SexoType = Optional[Literal["masculino", "femenino", "otro", "prefiero_no_decir"]]
AsistenciaEstatusType = Literal["registrado", "asistio", "no_asistio", "cancelado"]
CuestionarioTipoType = Literal["registro", "pre", "post", "evaluacion_modulo", "evaluacion_evento"]
TipoRespuestaType = Literal["texto", "numero", "opcion_multiple", "si_no", "likert_1_5", "fecha"]


# ── Programas ──────────────────────────────────────────────────────────────────

class ProgramaCreate(BaseModel):
    nombre: str
    edicion: Optional[str] = None
    anio: Optional[int] = None
    objetivo: Optional[str] = None
    estatus: bool = True


class ProgramaUpdate(BaseModel):
    nombre: Optional[str] = None
    edicion: Optional[str] = None
    anio: Optional[int] = None
    objetivo: Optional[str] = None
    estatus: Optional[bool] = None


# ── Participantes ──────────────────────────────────────────────────────────────

class ParticipanteCreate(BaseModel):
    nombre: str
    apellido_paterno: Optional[str] = None
    apellido_materno: Optional[str] = None
    correo: Optional[str] = None
    edad: Optional[int] = None
    sexo: SexoType = None
    municipio: Optional[str] = None
    escuela: Optional[str] = None
    semestre: Optional[str] = None
    celular: Optional[str] = None
    curp: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    estado_nacimiento: Optional[str] = None
    estado_civil: Optional[str] = None
    grado_estudios: Optional[str] = None
    es_menor_edad: bool = False
    consentimiento_tutor: bool = False


class ParticipanteUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido_paterno: Optional[str] = None
    apellido_materno: Optional[str] = None
    correo: Optional[str] = None
    edad: Optional[int] = None
    sexo: SexoType = None
    municipio: Optional[str] = None
    escuela: Optional[str] = None
    semestre: Optional[str] = None
    celular: Optional[str] = None
    curp: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    estado_nacimiento: Optional[str] = None
    estado_civil: Optional[str] = None
    grado_estudios: Optional[str] = None
    es_menor_edad: Optional[bool] = None
    consentimiento_tutor: Optional[bool] = None


# ── Actividades ────────────────────────────────────────────────────────────────

class ActividadCreate(BaseModel):
    programa_id: UUID
    sede_id: Optional[UUID] = None
    nombre: str
    tipo: Optional[str] = None
    facilitador: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None


class ActividadUpdate(BaseModel):
    sede_id: Optional[UUID] = None
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    facilitador: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None


# ── Asistencias ────────────────────────────────────────────────────────────────

class AsistenciaCreate(BaseModel):
    participante_id: UUID
    estatus: AsistenciaEstatusType = "registrado"


class AsistenciaUpdate(BaseModel):
    estatus: AsistenciaEstatusType


# ── Cuestionarios ──────────────────────────────────────────────────────────────

class CuestionarioCreate(BaseModel):
    programa_id: UUID
    actividad_id: Optional[UUID] = None
    tipo: CuestionarioTipoType
    nombre: str
    descripcion: Optional[str] = None
    activo: bool = True


class CuestionarioUpdate(BaseModel):
    actividad_id: Optional[UUID] = None
    tipo: Optional[CuestionarioTipoType] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


# ── Preguntas ──────────────────────────────────────────────────────────────────

class PreguntaCreate(BaseModel):
    texto: str
    tipo_respuesta: TipoRespuestaType
    orden: Optional[int] = None
    obligatoria: bool = False


class PreguntaUpdate(BaseModel):
    texto: Optional[str] = None
    tipo_respuesta: Optional[TipoRespuestaType] = None
    orden: Optional[int] = None
    obligatoria: Optional[bool] = None


# ── Opciones de respuesta ──────────────────────────────────────────────────────

class OpcionCreate(BaseModel):
    etiqueta: str
    valor: Optional[float] = None
    orden: Optional[int] = None


# ── Respuestas ─────────────────────────────────────────────────────────────────

class RespuestaItem(BaseModel):
    pregunta_id: UUID
    opcion_id: Optional[UUID] = None
    valor_texto: Optional[str] = None
    valor_num: Optional[float] = None
    valor_fecha: Optional[date] = None


class RespuestasBulk(BaseModel):
    cuestionario_id: UUID
    participante_id: UUID
    actividad_id: Optional[UUID] = None
    respuestas: List[RespuestaItem]
