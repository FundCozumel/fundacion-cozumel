"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Actividad, Programa, Sede } from "@/types";
import Modal from "@/components/ui/Modal";
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  MapPin,
  User,
} from "lucide-react";

const inputClass =
  "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition";
const labelClass = "block text-xs font-medium text-gray-500 mb-1";

interface FormState {
  programa_id: string;
  sede_id: string;
  nombre: string;
  tipo: string;
  facilitador: string;
  fecha_inicio: string;
  fecha_fin: string;
}

const emptyForm: FormState = {
  programa_id: "",
  sede_id: "",
  nombre: "",
  tipo: "",
  facilitador: "",
  fecha_inicio: "",
  fecha_fin: "",
};

function formatFecha(f: string | null) {
  if (!f) return null;
  return new Date(f + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ActividadesPage() {
  const supabase = createSupabaseBrowserClient();

  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [filtroPrograma, setFiltroPrograma] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Actividad | null>(null);
  const [deleting, setDeleting] = useState<Actividad | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("actividades")
      .select("*, programas(nombre), sedes(nombre)")
      .order("fecha_inicio", { ascending: false, nullsFirst: false });
    if (filtroPrograma) {
      q = q.eq("programa_id", filtroPrograma);
    }
    const { data } = await q;
    setActividades((data as Actividad[]) ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroPrograma]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    async function cargarCatalogos() {
      const [progRes, sedeRes] = await Promise.all([
        supabase.from("programas").select("*").eq("estatus", true).order("nombre"),
        supabase.from("sedes").select("*").order("nombre"),
      ]);
      setProgramas((progRes.data as Programa[]) ?? []);
      setSedes((sedeRes.data as Sede[]) ?? []);
    }
    cargarCatalogos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirCrear() {
    setEditing(null);
    setForm({ ...emptyForm, programa_id: filtroPrograma || "" });
    setError(null);
    setModalOpen(true);
  }

  function abrirEditar(a: Actividad) {
    setEditing(a);
    setForm({
      programa_id: a.programa_id,
      sede_id: a.sede_id ?? "",
      nombre: a.nombre,
      tipo: a.tipo ?? "",
      facilitador: a.facilitador ?? "",
      fecha_inicio: a.fecha_inicio ?? "",
      fecha_fin: a.fecha_fin ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      programa_id: form.programa_id,
      sede_id: form.sede_id || null,
      nombre: form.nombre.trim(),
      tipo: form.tipo.trim() || null,
      facilitador: form.facilitador.trim() || null,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
    };

    const { error: err } = editing
      ? await supabase.from("actividades").update(payload).eq("id", editing.id)
      : await supabase.from("actividades").insert(payload);

    setSaving(false);
    if (err) {
      setError("No se pudo guardar. Verifica los datos e intenta de nuevo.");
      return;
    }
    setModalOpen(false);
    cargar();
  }

  async function eliminar() {
    if (!deleting) return;
    setSaving(true);
    const { error: err } = await supabase
      .from("actividades")
      .delete()
      .eq("id", deleting.id);
    setSaving(false);
    setDeleting(null);
    if (!err) cargar();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays size={20} className="text-brand-500" />
            Actividades
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Talleres, sesiones y eventos de los programas
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} />
          Nueva actividad
        </button>
      </div>

      {/* Filtro por programa */}
      <div className="mb-5">
        <select
          value={filtroPrograma}
          onChange={(e) => setFiltroPrograma(e.target.value)}
          className={`${inputClass} bg-white sm:max-w-xs`}
        >
          <option value="">Todos los programas</option>
          {programas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} {p.edicion ? `(${p.edicion})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de actividades */}
      {loading ? (
        <p className="text-sm text-gray-300 text-center py-12">Cargando…</p>
      ) : actividades.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-12">
          <p className="text-sm text-gray-300 text-center">
            {filtroPrograma
              ? "No hay actividades en este programa."
              : "Aún no hay actividades registradas."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {actividades.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 mb-2">
                    {a.programas?.nombre ?? "Sin programa"}
                  </span>
                  <h3 className="text-sm font-semibold text-gray-800 leading-snug">
                    {a.nombre}
                  </h3>
                  {a.tipo && (
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{a.tipo}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    onClick={() => abrirEditar(a)}
                    className="p-1.5 rounded-lg text-gray-300 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleting(a)}
                    className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5 text-xs text-gray-400">
                {(a.fecha_inicio || a.fecha_fin) && (
                  <p className="flex items-center gap-1.5">
                    <CalendarDays size={13} className="text-gray-300 shrink-0" />
                    {formatFecha(a.fecha_inicio)}
                    {a.fecha_fin && a.fecha_fin !== a.fecha_inicio
                      ? ` — ${formatFecha(a.fecha_fin)}`
                      : ""}
                  </p>
                )}
                {a.sedes?.nombre && (
                  <p className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-gray-300 shrink-0" />
                    {a.sedes.nombre}
                  </p>
                )}
                {a.facilitador && (
                  <p className="flex items-center gap-1.5">
                    <User size={13} className="text-gray-300 shrink-0" />
                    {a.facilitador}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && actividades.length > 0 && (
        <p className="text-xs text-gray-300 mt-4 text-right">
          {actividades.length} actividad{actividades.length !== 1 ? "es" : ""}
        </p>
      )}

      {/* Modal crear / editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar actividad" : "Nueva actividad"}
        maxWidth="max-w-xl"
      >
        <form onSubmit={guardar} className="space-y-4">
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

          <div>
            <label className={labelClass}>Nombre de la actividad *</label>
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className={inputClass}
              placeholder="Ej. Taller de comunicación efectiva"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tipo</label>
              <input
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className={inputClass}
                placeholder="taller, conferencia, sesión…"
              />
            </div>
            <div>
              <label className={labelClass}>Facilitador</label>
              <input
                value={form.facilitador}
                onChange={(e) => setForm({ ...form, facilitador: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Sede</label>
            <select
              value={form.sede_id}
              onChange={(e) => setForm({ ...form, sede_id: e.target.value })}
              className={inputClass}
            >
              <option value="">— Sin sede —</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} {s.municipio ? `· ${s.municipio}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Fecha de inicio</label>
              <input
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha de fin</label>
              <input
                type="date"
                value={form.fecha_fin}
                min={form.fecha_inicio || undefined}
                onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                className={inputClass}
              />
            </div>
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
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear actividad"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmación de eliminación */}
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Eliminar actividad"
        maxWidth="max-w-md"
      >
        <div className="flex items-start gap-3">
          <div className="bg-red-50 p-2.5 rounded-xl shrink-0">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <p className="text-sm text-gray-600">
            ¿Seguro que deseas eliminar{" "}
            <span className="font-semibold">{deleting?.nombre}</span>? Se
            eliminarán también las asistencias registradas. Esta acción no se
            puede deshacer.
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
    </div>
  );
}
