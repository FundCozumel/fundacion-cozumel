"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import {
  Cuestionario,
  Pregunta,
  Programa,
  ResultadosCuestionario,
  TipoCuestionario,
  TipoRespuesta,
  TIPO_CUESTIONARIO_LABEL,
  TIPO_RESPUESTA_LABEL,
} from "@/types";
import Modal from "@/components/ui/Modal";
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  ListChecks,
  GripVertical,
  Power,
  BarChart3,
  CalendarCheck,
  Users,
  MessageSquare,
} from "lucide-react";

const inputClass =
  "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition";
const labelClass = "block text-xs font-medium text-gray-500 mb-1";

const TIPOS_CUESTIONARIO = Object.keys(TIPO_CUESTIONARIO_LABEL) as TipoCuestionario[];
const TIPOS_RESPUESTA = Object.keys(TIPO_RESPUESTA_LABEL) as TipoRespuesta[];

const TIPO_BADGE: Record<TipoCuestionario, string> = {
  registro: "bg-gray-100 text-gray-600",
  pre: "bg-brand-50 text-brand-700",
  post: "bg-forest-50 text-forest-700",
  evaluacion_modulo: "bg-amber-50 text-amber-700",
  evaluacion_evento: "bg-violet-50 text-violet-700",
};

// Opciones por defecto para preguntas cerradas que no son de opción múltiple libre.
function opcionesPorDefecto(tipo: TipoRespuesta): { etiqueta: string; valor: number; orden: number }[] {
  if (tipo === "likert_1_5") {
    return [
      { etiqueta: "Totalmente en desacuerdo", valor: 1, orden: 1 },
      { etiqueta: "En desacuerdo", valor: 2, orden: 2 },
      { etiqueta: "Neutral", valor: 3, orden: 3 },
      { etiqueta: "De acuerdo", valor: 4, orden: 4 },
      { etiqueta: "Totalmente de acuerdo", valor: 5, orden: 5 },
    ];
  }
  if (tipo === "si_no") {
    return [
      { etiqueta: "Sí", valor: 1, orden: 1 },
      { etiqueta: "No", valor: 0, orden: 2 },
    ];
  }
  return [];
}

export default function CuestionariosPage() {
  const supabase = createSupabaseBrowserClient();

  const [cuestionarios, setCuestionarios] = useState<Cuestionario[]>([]);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal crear/editar cuestionario
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cuestionario | null>(null);
  const [form, setForm] = useState({
    programa_id: "",
    tipo: "pre" as TipoCuestionario,
    nombre: "",
    descripcion: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Cuestionario | null>(null);

  // Panel de preguntas
  const [preguntasDe, setPreguntasDe] = useState<Cuestionario | null>(null);
  // Panel de respuestas/resultados
  const [resultadosDe, setResultadosDe] = useState<Cuestionario | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Cuestionario[]>("/cuestionarios");
      setCuestionarios(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los cuestionarios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    async function cargarProgramas() {
      const { data } = await supabase
        .from("programas")
        .select("*")
        .eq("estatus", true)
        .order("nombre");
      setProgramas((data as Programa[]) ?? []);
    }
    cargarProgramas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirCrear() {
    setEditing(null);
    setForm({
      programa_id: programas[0]?.id ?? "",
      tipo: "pre",
      nombre: "",
      descripcion: "",
    });
    setError(null);
    setModalOpen(true);
  }

  function abrirEditar(c: Cuestionario) {
    setEditing(c);
    setForm({
      programa_id: c.programa_id,
      tipo: c.tipo,
      nombre: c.nombre,
      descripcion: c.descripcion ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.put(`/cuestionarios/${editing.id}`, {
          tipo: form.tipo,
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || null,
        });
      } else {
        await api.post("/cuestionarios", {
          programa_id: form.programa_id,
          tipo: form.tipo,
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || null,
        });
      }
      setModalOpen(false);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el cuestionario.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivo(c: Cuestionario) {
    try {
      await api.put(`/cuestionarios/${c.id}`, { activo: !c.activo });
      setCuestionarios((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, activo: !x.activo } : x))
      );
    } catch {
      /* noop */
    }
  }

  async function eliminar() {
    if (!deleting) return;
    setSaving(true);
    try {
      await api.delete(`/cuestionarios/${deleting.id}`);
      setDeleting(null);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList size={20} className="text-brand-500" />
            Cuestionarios
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Diseña encuestas de registro, pre/post y evaluación
          </p>
        </div>
        <button
          onClick={abrirCrear}
          disabled={programas.length === 0}
          className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} />
          Nuevo cuestionario
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-300 text-center py-12">Cargando…</p>
      ) : cuestionarios.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-12">
          <p className="text-sm text-gray-300 text-center">
            Aún no hay cuestionarios. Crea el primero para empezar a capturar respuestas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cuestionarios.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2 ${TIPO_BADGE[c.tipo]}`}
                  >
                    {TIPO_CUESTIONARIO_LABEL[c.tipo]}
                  </span>
                  <h3 className="text-sm font-semibold text-gray-800 leading-snug">{c.nombre}</h3>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <ClipboardList size={11} className="shrink-0" />
                      {c.programas?.nombre ?? "Sin programa"}
                    </span>
                    {c.actividades?.nombre && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <CalendarCheck size={11} className="shrink-0" />
                        {c.actividades.nombre}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    onClick={() => toggleActivo(c)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      c.activo
                        ? "text-forest-500 hover:bg-forest-50"
                        : "text-gray-300 hover:bg-gray-50"
                    }`}
                    title={c.activo ? "Activo (clic para desactivar)" : "Inactivo (clic para activar)"}
                  >
                    <Power size={14} />
                  </button>
                  <button
                    onClick={() => abrirEditar(c)}
                    className="p-1.5 rounded-lg text-gray-300 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleting(c)}
                    className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {c.descripcion && (
                <p className="text-xs text-gray-400 mt-3 line-clamp-2">{c.descripcion}</p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPreguntasDe(c)}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl py-2 transition-colors"
                >
                  <ListChecks size={14} />
                  Preguntas
                </button>
                <button
                  onClick={() => setResultadosDe(c)}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-forest-700 bg-forest-50 hover:bg-forest-100 rounded-xl py-2 transition-colors"
                >
                  <BarChart3 size={14} />
                  Ver respuestas
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear / editar cuestionario */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar cuestionario" : "Nuevo cuestionario"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={guardar} className="space-y-4">
          {!editing && (
            <div>
              <label className={labelClass}>Programa *</label>
              <select
                required
                value={form.programa_id}
                onChange={(e) => setForm({ ...form, programa_id: e.target.value })}
                className={inputClass}
              >
                <option value="">— Seleccionar programa —</option>
                {programas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.edicion ? `(${p.edicion})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={labelClass}>Tipo *</label>
            <select
              required
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoCuestionario })}
              className={inputClass}
            >
              {TIPOS_CUESTIONARIO.map((t) => (
                <option key={t} value={t}>
                  {TIPO_CUESTIONARIO_LABEL[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Nombre *</label>
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className={inputClass}
              placeholder="Ej. Encuesta de entrada — Liderazgo juvenil"
            />
          </div>

          <div>
            <label className={labelClass}>Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className={inputClass}
              rows={2}
              placeholder="Instrucciones u objetivo del cuestionario"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear cuestionario"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmación de eliminación */}
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Eliminar cuestionario"
        maxWidth="max-w-md"
      >
        <div className="flex items-start gap-3">
          <div className="bg-red-50 p-2.5 rounded-xl shrink-0">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <p className="text-sm text-gray-600">
            ¿Seguro que deseas eliminar{" "}
            <span className="font-semibold">{deleting?.nombre}</span>? Se eliminarán también sus
            preguntas y respuestas. Esta acción no se puede deshacer.
          </p>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={() => setDeleting(null)}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={eliminar}
            disabled={saving}
            className="px-5 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {saving ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </Modal>

      {/* Panel de preguntas */}
      {preguntasDe && (
        <PreguntasPanel
          cuestionario={preguntasDe}
          onClose={() => setPreguntasDe(null)}
        />
      )}

      {/* Panel de respuestas/resultados */}
      {resultadosDe && (
        <ResultadosPanel
          cuestionario={resultadosDe}
          onClose={() => setResultadosDe(null)}
        />
      )}
    </div>
  );
}

// ── Panel de gestión de preguntas ───────────────────────────────────────────

function PreguntasPanel({
  cuestionario,
  onClose,
}: {
  cuestionario: Cuestionario;
  onClose: () => void;
}) {
  const [detalle, setDetalle] = useState<Cuestionario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nuevaPregunta, setNuevaPregunta] = useState({
    texto: "",
    tipo_respuesta: "likert_1_5" as TipoRespuesta,
    obligatoria: true,
  });
  const [opcionesLibres, setOpcionesLibres] = useState<string[]>(["", ""]);
  const [agregando, setAgregando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Cuestionario>(`/cuestionarios/${cuestionario.id}`);
      setDetalle(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las preguntas.");
    } finally {
      setLoading(false);
    }
  }, [cuestionario.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const preguntas = (detalle?.preguntas ?? [])
    .slice()
    .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));

  const requiereOpcionesLibres = nuevaPregunta.tipo_respuesta === "opcion_multiple";

  async function agregarPregunta(e: React.FormEvent) {
    e.preventDefault();
    setAgregando(true);
    setError(null);
    try {
      const orden = (preguntas[preguntas.length - 1]?.orden ?? preguntas.length) + 1;
      const pregunta = await api.post<Pregunta>(
        `/cuestionarios/${cuestionario.id}/preguntas`,
        {
          texto: nuevaPregunta.texto.trim(),
          tipo_respuesta: nuevaPregunta.tipo_respuesta,
          orden,
          obligatoria: nuevaPregunta.obligatoria,
        }
      );

      // Crear opciones: por defecto (Likert/Sí-No) o las capturadas (opción múltiple).
      const opciones = requiereOpcionesLibres
        ? opcionesLibres
            .map((etq, i) => ({ etiqueta: etq.trim(), valor: i + 1, orden: i + 1 }))
            .filter((o) => o.etiqueta)
        : opcionesPorDefecto(nuevaPregunta.tipo_respuesta);

      for (const op of opciones) {
        await api.post(`/preguntas/${pregunta.id}/opciones`, op);
      }

      setNuevaPregunta({ texto: "", tipo_respuesta: nuevaPregunta.tipo_respuesta, obligatoria: true });
      setOpcionesLibres(["", ""]);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agregar la pregunta.");
    } finally {
      setAgregando(false);
    }
  }

  async function eliminarPregunta(id: string) {
    try {
      await api.delete(`/preguntas/${id}`);
      cargar();
    } catch {
      /* noop */
    }
  }

  return (
    <Modal open onClose={onClose} title={`Preguntas — ${cuestionario.nombre}`} maxWidth="max-w-2xl">
      {loading ? (
        <p className="text-sm text-gray-300 text-center py-8">Cargando preguntas…</p>
      ) : (
        <div className="space-y-5">
          {/* Lista de preguntas existentes */}
          {preguntas.length === 0 ? (
            <p className="text-sm text-gray-300 text-center py-4">
              Este cuestionario aún no tiene preguntas.
            </p>
          ) : (
            <ol className="space-y-2">
              {preguntas.map((p, idx) => (
                <li
                  key={p.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  <GripVertical size={14} className="text-gray-300 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="text-gray-400 mr-1">{idx + 1}.</span>
                      {p.texto}
                      {p.obligatoria && <span className="text-red-400 ml-1">*</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white text-gray-500 border border-gray-200">
                        {TIPO_RESPUESTA_LABEL[p.tipo_respuesta]}
                      </span>
                      {p.opciones_respuesta && p.opciones_respuesta.length > 0 && (
                        <span className="text-[10px] text-gray-400">
                          {p.opciones_respuesta.length} opciones
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => eliminarPregunta(p.id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                    title="Eliminar pregunta"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ol>
          )}

          {/* Formulario nueva pregunta */}
          <form onSubmit={agregarPregunta} className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Agregar pregunta
            </p>
            <div>
              <label className={labelClass}>Texto de la pregunta *</label>
              <input
                required
                value={nuevaPregunta.texto}
                onChange={(e) => setNuevaPregunta({ ...nuevaPregunta, texto: e.target.value })}
                className={inputClass}
                placeholder="Ej. Me siento capaz de liderar un equipo"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Tipo de respuesta *</label>
                <select
                  value={nuevaPregunta.tipo_respuesta}
                  onChange={(e) =>
                    setNuevaPregunta({
                      ...nuevaPregunta,
                      tipo_respuesta: e.target.value as TipoRespuesta,
                    })
                  }
                  className={inputClass}
                >
                  {TIPOS_RESPUESTA.map((t) => (
                    <option key={t} value={t}>
                      {TIPO_RESPUESTA_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 sm:mt-6">
                <input
                  type="checkbox"
                  checked={nuevaPregunta.obligatoria}
                  onChange={(e) =>
                    setNuevaPregunta({ ...nuevaPregunta, obligatoria: e.target.checked })
                  }
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-200"
                />
                Obligatoria
              </label>
            </div>

            {requiereOpcionesLibres && (
              <div className="space-y-2">
                <label className={labelClass}>Opciones</label>
                {opcionesLibres.map((op, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={op}
                      onChange={(e) => {
                        const next = [...opcionesLibres];
                        next[i] = e.target.value;
                        setOpcionesLibres(next);
                      }}
                      className={inputClass}
                      placeholder={`Opción ${i + 1}`}
                    />
                    {opcionesLibres.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setOpcionesLibres(opcionesLibres.filter((_, j) => j !== i))}
                        className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setOpcionesLibres([...opcionesLibres, ""])}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  + Agregar opción
                </button>
              </div>
            )}

            {(nuevaPregunta.tipo_respuesta === "likert_1_5" ||
              nuevaPregunta.tipo_respuesta === "si_no") && (
              <p className="text-[11px] text-gray-400">
                Se crearán automáticamente las opciones{" "}
                {nuevaPregunta.tipo_respuesta === "likert_1_5"
                  ? "de la escala Likert (1 a 5)."
                  : "Sí / No."}
              </p>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={agregando}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Plus size={15} />
                {agregando ? "Agregando…" : "Agregar pregunta"}
              </button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}

// ── Panel de respuestas / resultados ──────────────────────────────────────────

function ResultadosPanel({
  cuestionario,
  onClose,
}: {
  cuestionario: Cuestionario;
  onClose: () => void;
}) {
  const [resultados, setResultados] = useState<ResultadosCuestionario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<ResultadosCuestionario>(
          `/metricas/cuestionarios/${cuestionario.id}/resultados`
        );
        if (activo) setResultados(data);
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : "No se pudieron cargar las respuestas.");
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [cuestionario.id]);

  return (
    <Modal open onClose={onClose} title={`Respuestas — ${cuestionario.nombre}`} maxWidth="max-w-2xl">
      {loading ? (
        <p className="text-sm text-gray-300 text-center py-8">Cargando respuestas…</p>
      ) : error ? (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      ) : !resultados || resultados.preguntas.length === 0 ? (
        <p className="text-sm text-gray-300 text-center py-8">
          Este cuestionario aún no tiene preguntas ni respuestas.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-forest-50/60 border border-forest-100 rounded-xl px-3 py-2.5">
            <Users size={15} className="text-forest-500 shrink-0" />
            <span>
              <b>{resultados.total_respondentes}</b>{" "}
              {resultados.total_respondentes === 1 ? "participante respondió" : "participantes respondieron"}{" "}
              este cuestionario.
            </span>
          </div>

          {resultados.total_respondentes === 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Todavía no hay respuestas cargadas. Captura o importa respuestas para verlas aquí.
            </p>
          )}

          {/* Una sección por pregunta */}
          {resultados.preguntas.map((p, idx) => (
            <div key={p.pregunta_id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-xs font-semibold text-gray-300 mt-0.5">{idx + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{p.texto}</p>
                  <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
                    {TIPO_RESPUESTA_LABEL[p.tipo]} · {p.total_respuestas}{" "}
                    {p.total_respuestas === 1 ? "respuesta" : "respuestas"}
                  </span>
                </div>
              </div>

              {/* Distribución (opción múltiple / sí-no / Likert) */}
              {p.distribucion && Object.keys(p.distribucion).length > 0 && (
                <DistribucionBarras distribucion={p.distribucion} total={p.total_respuestas} />
              )}

              {/* Numérica: promedio / mín / máx */}
              {p.tipo === "numero" && (
                <div className="flex flex-wrap gap-2">
                  <Estadistica etiqueta="Promedio" valor={p.promedio ?? "—"} />
                  <Estadistica etiqueta="Mínimo" valor={p.minimo ?? "—"} />
                  <Estadistica etiqueta="Máximo" valor={p.maximo ?? "—"} />
                </div>
              )}

              {/* Texto / fecha: respuestas individuales */}
              {(p.tipo === "texto" || p.tipo === "fecha") &&
                (p.respuestas && p.respuestas.length > 0 ? (
                  <ul className="space-y-1.5 max-h-52 overflow-y-auto">
                    {p.respuestas.map((r, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2"
                      >
                        <MessageSquare size={12} className="text-gray-300 mt-1 shrink-0" />
                        <div className="min-w-0">
                          <p className="break-words">{r.valor}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{r.participante}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-300">Sin respuestas.</p>
                ))}

              {/* Cerrada sin respuestas aún */}
              {["opcion_multiple", "si_no", "likert_1_5"].includes(p.tipo) &&
                (!p.distribucion || Object.keys(p.distribucion).length === 0) && (
                  <p className="text-xs text-gray-300">Sin respuestas.</p>
                )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function DistribucionBarras({
  distribucion,
  total,
}: {
  distribucion: Record<string, number>;
  total: number;
}) {
  const entradas = Object.entries(distribucion).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-2">
      {entradas.map(([etiqueta, n]) => {
        const pct = total > 0 ? Math.round((n / total) * 100) : 0;
        return (
          <div key={etiqueta}>
            <div className="flex items-center justify-between text-xs text-gray-600 mb-0.5">
              <span className="truncate pr-2">{etiqueta}</span>
              <span className="shrink-0 text-gray-400">
                {n} · {pct}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-400 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Estadistica({ etiqueta, valor }: { etiqueta: string; valor: number | string }) {
  return (
    <div className="flex-1 min-w-[80px] bg-gray-50 rounded-xl px-3 py-2 text-center">
      <p className="text-base font-semibold text-gray-800">{valor}</p>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{etiqueta}</p>
    </div>
  );
}
