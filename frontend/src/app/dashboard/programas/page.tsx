"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Programa, Actividad, Cuestionario, TIPO_CUESTIONARIO_LABEL } from "@/types";
import Modal from "@/components/ui/Modal";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Calendar,
  Target,
  CalendarDays,
  MapPin,
  User,
  ListChecks,
  ClipboardList,
  CalendarCheck,
  ArrowRight,
} from "lucide-react";

function formatFecha(f: string | null) {
  if (!f) return null;
  return new Date(f + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const inputClass =
  "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition";
const labelClass = "block text-xs font-medium text-gray-500 mb-1";

interface FormState {
  nombre: string;
  edicion: string;
  anio: string;
  objetivo: string;
  estatus: boolean;
}

const emptyForm: FormState = {
  nombre: "",
  edicion: "",
  anio: "",
  objetivo: "",
  estatus: true,
};

export default function ProgramasPage() {
  const supabase = createSupabaseBrowserClient();

  const [programas, setProgramas] = useState<Programa[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Programa | null>(null);
  const [deleting, setDeleting] = useState<Programa | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal "ver actividades"
  const [viendoActividades, setViendoActividades] = useState<Programa | null>(null);
  const [actividadesPrograma, setActividadesPrograma] = useState<Actividad[]>([]);
  const [cargandoActividades, setCargandoActividades] = useState(false);

  // Modal "ver cuestionarios"
  const [viendoCuestionarios, setViendoCuestionarios] = useState<Programa | null>(null);
  const [cuestionariosPrograma, setCuestionariosPrograma] = useState<Cuestionario[]>([]);
  const [cargandoCuestionarios, setCargandoCuestionarios] = useState(false);

  async function verActividades(p: Programa) {
    setViendoActividades(p);
    setCargandoActividades(true);
    const { data } = await supabase
      .from("actividades")
      .select("*, sedes(nombre)")
      .eq("programa_id", p.id)
      .order("fecha_inicio", { ascending: false, nullsFirst: false });
    setActividadesPrograma((data as Actividad[]) ?? []);
    setCargandoActividades(false);
  }

  async function verCuestionarios(p: Programa) {
    setViendoCuestionarios(p);
    setCargandoCuestionarios(true);
    const { data } = await supabase
      .from("cuestionarios")
      .select("*, actividades(nombre)")
      .eq("programa_id", p.id)
      .order("nombre");
    setCuestionariosPrograma((data as Cuestionario[]) ?? []);
    setCargandoCuestionarios(false);
  }

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("programas")
      .select("*")
      .order("anio", { ascending: false, nullsFirst: false })
      .order("nombre");
    setProgramas((data as Programa[]) ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function abrirCrear() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function abrirEditar(p: Programa) {
    setEditing(p);
    setForm({
      nombre: p.nombre,
      edicion: p.edicion ?? "",
      anio: p.anio != null ? String(p.anio) : "",
      objetivo: p.objetivo ?? "",
      estatus: p.estatus,
    });
    setError(null);
    setModalOpen(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      nombre: form.nombre.trim(),
      edicion: form.edicion.trim() || null,
      anio: form.anio ? parseInt(form.anio, 10) : null,
      objetivo: form.objetivo.trim() || null,
      estatus: form.estatus,
    };

    const { error: err } = editing
      ? await supabase.from("programas").update(payload).eq("id", editing.id)
      : await supabase.from("programas").insert(payload);

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
    const { error: err } = await supabase.from("programas").delete().eq("id", deleting.id);
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
            <BookOpen size={20} className="text-brand-500" />
            Programas
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Programas que agrupan actividades y cuestionarios
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} />
          Nuevo programa
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-gray-300 text-center py-12">Cargando…</p>
      ) : programas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-12">
          <p className="text-sm text-gray-300 text-center">Aún no hay programas registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {programas.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2 ${
                      p.estatus
                        ? "bg-forest-50 text-forest-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {p.estatus ? "Activo" : "Inactivo"}
                  </span>
                  <h3 className="text-sm font-semibold text-gray-800 leading-snug">{p.nombre}</h3>
                  {p.edicion && (
                    <p className="text-xs text-gray-400 mt-0.5">{p.edicion}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    onClick={() => abrirEditar(p)}
                    className="p-1.5 rounded-lg text-gray-300 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleting(p)}
                    className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5 text-xs text-gray-400">
                {p.anio != null && (
                  <p className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-gray-300 shrink-0" />
                    {p.anio}
                  </p>
                )}
                {p.objetivo && (
                  <p className="flex items-start gap-1.5">
                    <Target size={13} className="text-gray-300 shrink-0 mt-0.5" />
                    <span className="line-clamp-3">{p.objetivo}</span>
                  </p>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => verActividades(p)}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl py-2 transition-colors"
                >
                  <ListChecks size={14} />
                  Actividades
                </button>
                <button
                  onClick={() => verCuestionarios(p)}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-forest-700 bg-forest-50 hover:bg-forest-100 rounded-xl py-2 transition-colors"
                >
                  <ClipboardList size={14} />
                  Cuestionarios
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && programas.length > 0 && (
        <p className="text-xs text-gray-300 mt-4 text-right">
          {programas.length} programa{programas.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Modal crear / editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar programa" : "Nuevo programa"}
        maxWidth="max-w-xl"
      >
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className={labelClass}>Nombre del programa *</label>
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className={inputClass}
              placeholder="Ej. Liderazgo Juvenil"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Edición</label>
              <input
                value={form.edicion}
                onChange={(e) => setForm({ ...form, edicion: e.target.value })}
                className={inputClass}
                placeholder="Ej. 2025-A, Primavera 2025"
              />
            </div>
            <div>
              <label className={labelClass}>Año</label>
              <input
                type="number"
                value={form.anio}
                onChange={(e) => setForm({ ...form, anio: e.target.value })}
                className={inputClass}
                placeholder="2025"
                min={2000}
                max={2100}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Objetivo</label>
            <textarea
              value={form.objetivo}
              onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
              className={inputClass}
              rows={3}
              placeholder="Describe el objetivo del programa"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.estatus}
              onChange={(e) => setForm({ ...form, estatus: e.target.checked })}
              className="rounded border-gray-300 text-brand-500 focus:ring-brand-200"
            />
            Programa activo
          </label>

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
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear programa"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmación de eliminación */}
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Eliminar programa"
        maxWidth="max-w-md"
      >
        <div className="flex items-start gap-3">
          <div className="bg-red-50 p-2.5 rounded-xl shrink-0">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <p className="text-sm text-gray-600">
            ¿Seguro que deseas eliminar{" "}
            <span className="font-semibold">{deleting?.nombre}</span>? Se eliminarán también sus
            actividades, cuestionarios y datos asociados. Esta acción no se puede deshacer.
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

      {/* Modal: actividades del programa */}
      <Modal
        open={viendoActividades !== null}
        onClose={() => setViendoActividades(null)}
        title={`Actividades — ${viendoActividades?.nombre ?? ""}`}
        maxWidth="max-w-2xl"
      >
        {cargandoActividades ? (
          <p className="text-sm text-gray-300 text-center py-8">Cargando…</p>
        ) : actividadesPrograma.length === 0 ? (
          <p className="text-sm text-gray-300 text-center py-8">
            Este programa aún no tiene actividades.
          </p>
        ) : (
          <ul className="space-y-2">
            {actividadesPrograma.map((a) => (
              <li key={a.id} className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800">{a.nombre}</p>
                  {a.tipo && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white text-gray-500 border border-gray-200 capitalize shrink-0">
                      {a.tipo}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-400">
                  {(a.fecha_inicio || a.fecha_fin) && (
                    <span className="flex items-center gap-1.5">
                      <CalendarDays size={12} className="text-gray-300" />
                      {formatFecha(a.fecha_inicio)}
                      {a.fecha_fin && a.fecha_fin !== a.fecha_inicio
                        ? ` — ${formatFecha(a.fecha_fin)}`
                        : ""}
                    </span>
                  )}
                  {a.sedes?.nombre && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-gray-300" />
                      {a.sedes.nombre}
                    </span>
                  )}
                  {a.facilitador && (
                    <span className="flex items-center gap-1.5">
                      <User size={12} className="text-gray-300" />
                      {a.facilitador}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {actividadesPrograma.length} actividad
            {actividadesPrograma.length !== 1 ? "es" : ""}
          </span>
          <Link
            href="/dashboard/actividades"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-800"
          >
            Gestionar actividades
            <ArrowRight size={13} />
          </Link>
        </div>
      </Modal>

      {/* Modal: cuestionarios del programa */}
      <Modal
        open={viendoCuestionarios !== null}
        onClose={() => setViendoCuestionarios(null)}
        title={`Cuestionarios — ${viendoCuestionarios?.nombre ?? ""}`}
        maxWidth="max-w-2xl"
      >
        {cargandoCuestionarios ? (
          <p className="text-sm text-gray-300 text-center py-8">Cargando…</p>
        ) : cuestionariosPrograma.length === 0 ? (
          <p className="text-sm text-gray-300 text-center py-8">
            Este programa aún no tiene cuestionarios.
          </p>
        ) : (
          <ul className="space-y-2">
            {cuestionariosPrograma.map((c) => (
              <li key={c.id} className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800">{c.nombre}</p>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white text-gray-500 border border-gray-200 shrink-0">
                    {TIPO_CUESTIONARIO_LABEL[c.tipo]}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-400">
                  {c.actividades?.nombre && (
                    <span className="flex items-center gap-1.5">
                      <CalendarCheck size={12} className="text-gray-300" />
                      {c.actividades.nombre}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1.5 ${
                      c.activo ? "text-forest-600" : "text-gray-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        c.activo ? "bg-forest-500" : "bg-gray-300"
                      }`}
                    />
                    {c.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                {c.descripcion && (
                  <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{c.descripcion}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {cuestionariosPrograma.length} cuestionario
            {cuestionariosPrograma.length !== 1 ? "s" : ""}
          </span>
          <Link
            href="/dashboard/cuestionarios"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-800"
          >
            Gestionar cuestionarios
            <ArrowRight size={13} />
          </Link>
        </div>
      </Modal>
    </div>
  );
}
