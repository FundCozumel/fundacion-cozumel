export type Rol = "administrador" | "coordinador";

export interface UsuarioPerfil {
  id: string;
  auth_user_id: string;
  nombre: string;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  correo: string;
  rol_id: string;
  estatus: boolean;
  created_at: string;
  updated_at: string;
  roles: {
    nombre: Rol;
  };
}

export interface DashboardStats {
  programas_activos: number;
  total_participantes: number;
  actividades_del_mes: number;
  total_usuarios: number | null;
}

export type Sexo = "masculino" | "femenino" | "otro" | "prefiero_no_decir";

export interface Participante {
  id: string;
  nombre: string;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  correo: string | null;
  edad: number | null;
  sexo: Sexo | null;
  municipio: string | null;
  escuela: string | null;
  semestre: string | null;
  celular: string | null;
  curp: string | null;
  fecha_nacimiento: string | null;
  estado_nacimiento: string | null;
  estado_civil: string | null;
  grado_estudios: string | null;
  es_menor_edad: boolean;
  consentimiento_tutor: boolean;
  created_at: string;
  updated_at: string;
}

export interface Programa {
  id: string;
  nombre: string;
  edicion: string | null;
  anio: number | null;
  objetivo: string | null;
  estatus: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sede {
  id: string;
  nombre: string;
  municipio: string | null;
  direccion: string | null;
}

export interface Actividad {
  id: string;
  programa_id: string;
  sede_id: string | null;
  nombre: string;
  tipo: string | null;
  facilitador: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  created_at: string;
  updated_at: string;
  programas?: { nombre: string } | null;
  sedes?: { nombre: string } | null;
}

// ── Cuestionarios ───────────────────────────────────────────────────────────

export type TipoCuestionario =
  | "registro"
  | "pre"
  | "post"
  | "evaluacion_modulo"
  | "evaluacion_evento";

export type TipoRespuesta =
  | "texto"
  | "numero"
  | "opcion_multiple"
  | "si_no"
  | "likert_1_5"
  | "fecha";

export const TIPO_CUESTIONARIO_LABEL: Record<TipoCuestionario, string> = {
  registro: "Registro",
  pre: "Pre",
  post: "Post",
  evaluacion_modulo: "Evaluación de módulo",
  evaluacion_evento: "Evaluación de evento",
};

export const TIPO_RESPUESTA_LABEL: Record<TipoRespuesta, string> = {
  texto: "Texto abierto",
  numero: "Número",
  opcion_multiple: "Opción múltiple",
  si_no: "Sí / No",
  likert_1_5: "Escala Likert (1–5)",
  fecha: "Fecha",
};

export interface OpcionRespuesta {
  id: string;
  pregunta_id: string;
  etiqueta: string;
  valor: number | null;
  orden: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Pregunta {
  id: string;
  cuestionario_id: string;
  texto: string;
  tipo_respuesta: TipoRespuesta;
  orden: number | null;
  obligatoria: boolean;
  opciones_respuesta?: OpcionRespuesta[];
  created_at?: string;
  updated_at?: string;
}

export interface Cuestionario {
  id: string;
  programa_id: string;
  actividad_id: string | null;
  tipo: TipoCuestionario;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  programas?: { nombre: string } | null;
  actividades?: { nombre: string } | null;
  preguntas?: Pregunta[];
}

// ── Métricas (respuestas del backend) ─────────────────────────────────────────

export interface ResultadoPregunta {
  pregunta_id: string;
  texto: string;
  tipo: TipoRespuesta;
  total_respuestas: number;
  distribucion?: Record<string, number>;
  promedio?: number | null;
  minimo?: number | null;
  maximo?: number | null;
  respuestas?: { participante: string; valor: string }[];
}

export interface ResultadosCuestionario {
  cuestionario: string;
  tipo: TipoCuestionario;
  total_respondentes: number;
  preguntas: ResultadoPregunta[];
}

export interface MetricasParticipantes {
  total: number;
  por_sexo: Record<string, number>;
  por_grupo_edad: Record<string, number>;
  por_municipio: Record<string, number>;
  por_escuela: Record<string, number>;
  por_estado_civil: Record<string, number>;
  por_grado_estudios: Record<string, number>;
  por_estado_nacimiento: Record<string, number>;
}

export interface MetricasAsistencia {
  total_registros: number;
  por_estatus: Record<string, number>;
  tasa_asistencia: number;
}

export interface ResumenMetricas {
  programas_activos: number;
  total_participantes: number;
  total_actividades: number;
  cuestionarios_activos: number;
  asistencias_confirmadas: number;
}
