"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Sede } from "@/types";
import Modal from "@/components/ui/Modal";
import { MapPin, Plus, Pencil, Trash2, AlertTriangle, Building2 } from "lucide-react";

const inputClass =
  "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition";
const labelClass = "block text-xs font-medium text-gray-500 mb-1";

interface FormState {
  nombre: string;
  municipio: string;
  direccion: string;
}

const emptyForm: FormState = { nombre: "", municipio: "", direccion: "" };

export default function SedesPage() {
  const supabase = createSupabaseBrowserClient();

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Sede | null>(null);
  const [deleting, setDeleting] = useState<Sede | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("sedes").select("*").order("nombre");
    setSedes((data as Sede[]) ?? []);
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

  function abrirEditar(s: Sede) {
    setEditing(s);
    setForm({
      nombre: s.nombre,
      municipio: s.municipio ?? "",
      direccion: s.direccion ?? "",
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
      municipio: form.municipio.trim() || null,
      direccion: form.direccion.trim() || null,
    };

    const { error: err } = editing
      ? await supabase.from("sedes").update(payload).eq("id", editing.id)
      : await supabase.from("sedes").insert(payload);

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
    const { error: err } = await supabase.from("sedes").delete().eq("id", deleting.id);
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
            <MapPin size={20} className="text-brand-500" />
            Sedes
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Lugares físicos donde se realizan las actividades
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} />
          Nueva sede
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-gray-300 text-center py-12">Cargando…</p>
      ) : sedes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-12">
          <p className="text-sm text-gray-300 text-center">Aún no hay sedes registradas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sedes.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="bg-brand-50 p-2 rounded-xl shrink-0">
                    <Building2 size={16} className="text-brand-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-800 leading-snug">{s.nombre}</h3>
                    {s.municipio && (
                      <p className="text-xs text-gray-400 mt-0.5">{s.municipio}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    onClick={() => abrirEditar(s)}
                    className="p-1.5 rounded-lg text-gray-300 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleting(s)}
                    className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {s.direccion && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <p className="flex items-start gap-1.5 text-xs text-gray-400">
                    <MapPin size={13} className="text-gray-300 shrink-0 mt-0.5" />
                    <span>{s.direccion}</span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && sedes.length > 0 && (
        <p className="text-xs text-gray-300 mt-4 text-right">
          {sedes.length} sede{sedes.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Modal crear / editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar sede" : "Nueva sede"}
        maxWidth="max-w-xl"
      >
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className={labelClass}>Nombre de la sede *</label>
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className={inputClass}
              placeholder="Ej. Casa de la Cultura"
            />
          </div>

          <div>
            <label className={labelClass}>Municipio</label>
            <input
              value={form.municipio}
              onChange={(e) => setForm({ ...form, municipio: e.target.value })}
              className={inputClass}
              placeholder="Ej. Cozumel"
            />
          </div>

          <div>
            <label className={labelClass}>Dirección</label>
            <textarea
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className={inputClass}
              rows={2}
              placeholder="Calle, número, colonia"
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
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear sede"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmación de eliminación */}
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Eliminar sede"
        maxWidth="max-w-md"
      >
        <div className="flex items-start gap-3">
          <div className="bg-red-50 p-2.5 rounded-xl shrink-0">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <p className="text-sm text-gray-600">
            ¿Seguro que deseas eliminar{" "}
            <span className="font-semibold">{deleting?.nombre}</span>? Las actividades que la usen
            quedarán sin sede asignada. Esta acción no se puede deshacer.
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
