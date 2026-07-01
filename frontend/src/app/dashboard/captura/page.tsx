"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import {
  Actividad,
  Cuestionario,
  Participante,
  Pregunta,
  TIPO_CUESTIONARIO_LABEL,
} from "@/types";
import { ClipboardCheck, CheckCircle2, Send } from "lucide-react";

const inputClass =
  "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition";
const labelClass = "block text-xs font-medium text-gray-500 mb-1";

// Valor capturado por pregunta: opcion_id (cerradas) o valor crudo (abiertas).
type Respuesta = {
  opcion_id?: string;
  valor_texto?: string;
  valor_num?: number;
  valor_fecha?: string;
};

function nombreCompleto(p: { nombre: string; apellido_paterno: string | null; apellido_materno: string | null }) {
  return [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ");
}

export default function CapturaPage() {
  const supabase = createSupabaseBrowserClient();

  const [cuestionarios, setCuestionarios] = useState<Cuestionario[]>([]);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);

  const [cuestionarioId, setCuestionarioId] = useState("");
  const [participanteId, setParticipanteId] = useState("");
  const [actividadId, setActividadId] = useState("");

  const [detalle, setDetalle] = useState<Cuestionario | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, Respuesta>>({});

  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  // Catálogos
  useEffect(() => {
    async function cargar() {
      const [cuest, part, act] = await Promise.all([
        api.get<Cuestionario[]>(`/cuestionarios${api.qs({ activo: true })}`),
        supabase.from("participantes").select("*").order("nombre"),
        supabase
          .from("actividades")
          .select("*, programas(nombre)")
          .order("fecha_inicio", { ascending: false, nullsFirst: false }),
      ]);
      setCuestionarios(cuest);
      setParticipantes((part.data as Participante[]) ?? []);
      setActividades((act.data as Actividad[]) ?? []);
    }
    cargar().catch((e) =>
      setError(e instanceof Error ? e.message : "No se pudieron cargar los catálogos.")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDetalle = useCallback(async (id: string) => {
    if (!id) {
      setDetalle(null);
      return;
    }
    setCargandoDetalle(true);
    setError(null);
    try {
      const data = await api.get<Cuestionario>(`/cuestionarios/${id}`);
      setDetalle(data);
      setRespuestas({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el cuestionario.");
    } finally {
      setCargandoDetalle(false);
    }
  }, []);

  useEffect(() => {
    cargarDetalle(cuestionarioId);
  }, [cuestionarioId, cargarDetalle]);

  const preguntas = useMemo(
    () =>
      (detalle?.preguntas ?? [])
        .slice()
        .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999)),
    [detalle]
  );

  function setResp(preguntaId: string, value: Respuesta) {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: value }));
  }

  function tieneValor(r: Respuesta | undefined) {
    if (!r) return false;
    return (
      r.opcion_id !== undefined ||
      (r.valor_texto !== undefined && r.valor_texto !== "") ||
      r.valor_num !== undefined ||
      (r.valor_fecha !== undefined && r.valor_fecha !== "")
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!participanteId) {
      setError("Selecciona un participante.");
      return;
    }

    // Validar obligatorias
    const faltante = preguntas.find((p) => p.obligatoria && !tieneValor(respuestas[p.id]));
    if (faltante) {
      setError(`Falta responder una pregunta obligatoria: "${faltante.texto}".`);
      return;
    }

    const items = preguntas
      .map((p) => {
        const r = respuestas[p.id];
        if (!tieneValor(r)) return null;
        return {
          pregunta_id: p.id,
          opcion_id: r?.opcion_id ?? null,
          valor_texto: r?.valor_texto ?? null,
          valor_num: r?.valor_num ?? null,
          valor_fecha: r?.valor_fecha ?? null,
        };
      })
      .filter(Boolean);

    if (items.length === 0) {
      setError("No hay respuestas para enviar.");
      return;
    }

    setEnviando(true);
    try {
      await api.post("/respuestas", {
        cuestionario_id: cuestionarioId,
        participante_id: participanteId,
        actividad_id: actividadId || null,
        respuestas: items,
      });
      setExito(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron enviar las respuestas.");
    } finally {
      setEnviando(false);
    }
  }

  function nuevaCaptura() {
    setExito(false);
    setParticipanteId("");
    setRespuestas({});
  }

  // Pantalla de éxito
  if (exito) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-forest-50 mb-4">
            <CheckCircle2 size={28} className="text-forest-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Respuestas registradas</h2>
          <p className="text-sm text-gray-400 mt-1">
            La captura se guardó correctamente.
          </p>
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={nuevaCaptura}
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Capturar otra respuesta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardCheck size={20} className="text-brand-500" />
          Captura de encuestas
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Registra las respuestas de un participante a un cuestionario
        </p>
      </div>

      <form onSubmit={enviar} className="space-y-5">
        {/* Selección de contexto */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div>
            <label className={labelClass}>Cuestionario *</label>
            <select
              required
              value={cuestionarioId}
              onChange={(e) => setCuestionarioId(e.target.value)}
              className={inputClass}
            >
              <option value="">— Seleccionar cuestionario —</option>
              {cuestionarios.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} · {TIPO_CUESTIONARIO_LABEL[c.tipo]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Participante *</label>
              <select
                required
                value={participanteId}
                onChange={(e) => setParticipanteId(e.target.value)}
                className={inputClass}
              >
                <option value="">— Seleccionar participante —</option>
                {participantes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {nombreCompleto(p)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Actividad (opcional)</label>
              <select
                value={actividadId}
                onChange={(e) => setActividadId(e.target.value)}
                className={inputClass}
              >
                <option value="">— Sin actividad —</option>
                {actividades.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Preguntas */}
        {cargandoDetalle ? (
          <p className="text-sm text-gray-300 text-center py-8">Cargando preguntas…</p>
        ) : detalle && preguntas.length > 0 ? (
          <div className="space-y-3">
            {preguntas.map((p, idx) => (
              <PreguntaInput
                key={p.id}
                index={idx}
                pregunta={p}
                value={respuestas[p.id]}
                onChange={(v) => setResp(p.id, v)}
              />
            ))}
          </div>
        ) : detalle ? (
          <p className="text-sm text-gray-300 text-center py-8 bg-white rounded-2xl border border-gray-100">
            Este cuestionario no tiene preguntas. Agrégalas en la sección Cuestionarios.
          </p>
        ) : null}

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {detalle && preguntas.length > 0 && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={enviando}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Send size={15} />
              {enviando ? "Enviando…" : "Enviar respuestas"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

// ── Render dinámico por tipo de pregunta ─────────────────────────────────────

function PreguntaInput({
  index,
  pregunta,
  value,
  onChange,
}: {
  index: number;
  pregunta: Pregunta;
  value: Respuesta | undefined;
  onChange: (v: Respuesta) => void;
}) {
  const opciones = (pregunta.opciones_respuesta ?? [])
    .slice()
    .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-sm font-medium text-gray-800 mb-3">
        <span className="text-gray-400 mr-1">{index + 1}.</span>
        {pregunta.texto}
        {pregunta.obligatoria && <span className="text-red-400 ml-1">*</span>}
      </p>

      {pregunta.tipo_respuesta === "texto" && (
        <textarea
          rows={3}
          className={inputClass}
          value={value?.valor_texto ?? ""}
          onChange={(e) => onChange({ valor_texto: e.target.value })}
          placeholder="Escribe la respuesta…"
        />
      )}

      {pregunta.tipo_respuesta === "numero" && (
        <input
          type="number"
          className={inputClass}
          value={value?.valor_num ?? ""}
          onChange={(e) =>
            onChange({ valor_num: e.target.value === "" ? undefined : Number(e.target.value) })
          }
        />
      )}

      {pregunta.tipo_respuesta === "fecha" && (
        <input
          type="date"
          className={inputClass}
          value={value?.valor_fecha ?? ""}
          onChange={(e) => onChange({ valor_fecha: e.target.value })}
        />
      )}

      {(pregunta.tipo_respuesta === "opcion_multiple" || pregunta.tipo_respuesta === "si_no") && (
        <div className="space-y-2">
          {opciones.map((op) => (
            <label
              key={op.id}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
                value?.opcion_id === op.id
                  ? "border-brand-400 bg-brand-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name={pregunta.id}
                checked={value?.opcion_id === op.id}
                onChange={() => onChange({ opcion_id: op.id })}
                className="text-brand-500 focus:ring-brand-200"
              />
              <span className="text-sm text-gray-700">{op.etiqueta}</span>
            </label>
          ))}
        </div>
      )}

      {pregunta.tipo_respuesta === "likert_1_5" && (
        <div className="flex flex-wrap gap-2">
          {opciones.map((op) => {
            const seleccionada = value?.opcion_id === op.id;
            return (
              <button
                key={op.id}
                type="button"
                onClick={() => onChange({ opcion_id: op.id })}
                title={op.etiqueta}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-center min-w-[64px] transition-colors ${
                  seleccionada
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="text-base font-bold leading-none">
                  {op.valor ?? "?"}
                </span>
                <span
                  className={`text-[10px] leading-tight ${
                    seleccionada ? "text-white/90" : "text-gray-400"
                  }`}
                >
                  {op.etiqueta}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
