"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Participante, Sexo, Actividad, Programa } from "@/types";
import { ESTADOS_MEXICO, ESTADOS_CIVILES, GRADOS_ESTUDIO } from "@/lib/catalogos";
import { exportarExcel } from "@/lib/export/excel";
import { exportarPDF, SeccionPDF } from "@/lib/export/pdf";
import Modal from "@/components/ui/Modal";
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  MapPin,
  X,
  Filter,
  Check,
  FileSpreadsheet,
  FileText,
} from "lucide-react";

const inputClass =
  "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition";
const labelClass = "block text-xs font-medium text-gray-500 mb-1";

// Asistencia de un participante con la actividad embebida.
interface AsistenciaParticipante {
  actividad_id: string;
  estatus: string;
  fecha_registro: string | null;
  actividades: {
    nombre: string;
    tipo: string | null;
    fecha_inicio: string | null;
    programas: { nombre: string } | null;
    sedes: { nombre: string } | null;
  } | null;
}

const ESTATUS_OPCIONES = [
  { value: "asistio", label: "Asistió" },
  { value: "registrado", label: "Registrado" },
  { value: "no_asistio", label: "No asistió" },
  { value: "cancelado", label: "Cancelado" },
];

const ESTATUS_BADGE: Record<string, { label: string; clase: string }> = {
  asistio: { label: "Asistió", clase: "bg-forest-50 text-forest-600" },
  registrado: { label: "Registrado", clase: "bg-brand-50 text-brand-700" },
  no_asistio: { label: "No asistió", clase: "bg-red-50 text-red-600" },
  cancelado: { label: "Cancelado", clase: "bg-gray-100 text-gray-500" },
};

const ESTATUS_LABEL: Record<string, string> = {
  asistio: "Asistió",
  registrado: "Registrado",
  no_asistio: "No asistió",
  cancelado: "Cancelado",
};

const SEXO_LABEL: Record<string, string> = {
  masculino: "Masculino",
  femenino: "Femenino",
  otro: "Otro",
  prefiero_no_decir: "Prefiero no decir",
};

/** Normaliza texto a un slug apto para nombre de archivo. */
function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function formatFecha(f: string | null) {
  if (!f) return null;
  return new Date(f + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface FormState {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  correo: string;
  fecha_nacimiento: string;
  sexo: string;
  curp: string;
  estado_nacimiento: string;
  municipio: string;
  estado_civil: string;
  grado_estudios: string;
  escuela: string;
  semestre: string;
  celular: string;
  es_menor_edad: boolean;
  consentimiento_tutor: boolean;
}

const emptyForm: FormState = {
  nombre: "",
  apellido_paterno: "",
  apellido_materno: "",
  correo: "",
  fecha_nacimiento: "",
  sexo: "",
  curp: "",
  estado_nacimiento: "",
  municipio: "",
  estado_civil: "",
  grado_estudios: "",
  escuela: "",
  semestre: "",
  celular: "",
  es_menor_edad: false,
  consentimiento_tutor: false,
};

/** Edad (años cumplidos) desde una fecha ISO yyyy-mm-dd. */
function edadDesde(iso: string): number | null {
  const m = iso.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (hoy.getMonth() + 1 < mo || (hoy.getMonth() + 1 === mo && hoy.getDate() < d)) edad--;
  return edad >= 0 && edad <= 120 ? edad : null;
}

export default function ParticipantesPage() {
  const supabase = createSupabaseBrowserClient();

  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Filtros para pasar lista
  const [programasCat, setProgramasCat] = useState<Programa[]>([]);
  const [programaFiltro, setProgramaFiltro] = useState("");
  const [actividadFiltro, setActividadFiltro] = useState("");
  const [mostrarTodos, setMostrarTodos] = useState(false);
  // participante_id -> estatus de asistencia en la actividad filtrada
  const [asistenciaMap, setAsistenciaMap] = useState<Record<string, string>>({});
  const [marcando, setMarcando] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Participante | null>(null);
  const [deleting, setDeleting] = useState<Participante | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal "ver actividades del participante"
  const [viendoActividades, setViendoActividades] = useState<Participante | null>(null);
  const [asistencias, setAsistencias] = useState<AsistenciaParticipante[]>([]);
  const [cargandoActividades, setCargandoActividades] = useState(false);
  const [actividadesCat, setActividadesCat] = useState<Actividad[]>([]);
  const [formAsis, setFormAsis] = useState({ actividad_id: "", estatus: "asistio" });
  const [registrando, setRegistrando] = useState(false);

  useEffect(() => {
    async function cargarCatalogos() {
      const [act, prog] = await Promise.all([
        supabase
          .from("actividades")
          .select("*, programas(nombre)")
          .order("fecha_inicio", { ascending: false, nullsFirst: false }),
        supabase.from("programas").select("*").order("nombre"),
      ]);
      setActividadesCat((act.data as Actividad[]) ?? []);
      setProgramasCat((prog.data as Programa[]) ?? []);
    }
    cargarCatalogos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actividades del programa filtrado (o todas si no hay programa).
  const actividadesDelFiltro = programaFiltro
    ? actividadesCat.filter((a) => a.programa_id === programaFiltro)
    : actividadesCat;

  async function cargarAsistencias(participanteId: string) {
    setCargandoActividades(true);
    const { data } = await supabase
      .from("asistencias")
      .select(
        "actividad_id, estatus, fecha_registro, actividades(nombre, tipo, fecha_inicio, programas(nombre), sedes(nombre))"
      )
      .eq("participante_id", participanteId)
      .order("fecha_registro", { ascending: false });
    setAsistencias((data as unknown as AsistenciaParticipante[]) ?? []);
    setCargandoActividades(false);
  }

  function verActividades(p: Participante) {
    setViendoActividades(p);
    setFormAsis({ actividad_id: "", estatus: "asistio" });
    setAsistencias([]);
    cargarAsistencias(p.id);
  }

  async function registrarAsistencia() {
    if (!viendoActividades || !formAsis.actividad_id) return;
    setRegistrando(true);
    await supabase.from("asistencias").upsert(
      {
        participante_id: viendoActividades.id,
        actividad_id: formAsis.actividad_id,
        estatus: formAsis.estatus,
      },
      { onConflict: "participante_id,actividad_id" }
    );
    setFormAsis({ actividad_id: "", estatus: "asistio" });
    await cargarAsistencias(viendoActividades.id);
    setRegistrando(false);
  }

  async function quitarAsistencia(actividadId: string) {
    if (!viendoActividades) return;
    await supabase
      .from("asistencias")
      .delete()
      .eq("participante_id", viendoActividades.id)
      .eq("actividad_id", actividadId);
    await cargarAsistencias(viendoActividades.id);
  }

  // Pasa lista: marca/actualiza el estatus de un participante en la actividad filtrada.
  async function marcarAsistencia(participanteId: string, estatus: string) {
    if (!actividadFiltro) return;
    setMarcando(participanteId);
    const anterior = asistenciaMap[participanteId];
    setAsistenciaMap((prev) => ({ ...prev, [participanteId]: estatus }));
    const { error: err } = await supabase.from("asistencias").upsert(
      {
        participante_id: participanteId,
        actividad_id: actividadFiltro,
        estatus,
      },
      { onConflict: "participante_id,actividad_id" }
    );
    if (err) {
      // revertir si falla
      setAsistenciaMap((prev) => {
        const next = { ...prev };
        if (anterior) next[participanteId] = anterior;
        else delete next[participanteId];
        return next;
      });
    }
    setMarcando(null);
  }

  // Contexto de exportación según el filtro activo (compartido por Excel y PDF).
  function contextoExport() {
    let slug = "total";
    let etiqueta = "Todos los participantes";
    let hoja = "Todos";

    if (actividadFiltro) {
      const act = actividadesCat.find((a) => a.id === actividadFiltro);
      const actNombre = act?.nombre ?? "actividad";
      // Programa: el del filtro, o el de la actividad seleccionada.
      const progNombre =
        (programaFiltro && programasCat.find((p) => p.id === programaFiltro)?.nombre) ||
        act?.programas?.nombre ||
        (act?.programa_id && programasCat.find((p) => p.id === act.programa_id)?.nombre) ||
        "";
      slug = progNombre ? `${slugify(progNombre)}-${slugify(actNombre)}` : slugify(actNombre);
      etiqueta = progNombre ? `${progNombre} — ${actNombre}` : actNombre;
      hoja = "Por actividad";
    } else if (programaFiltro) {
      const progNombre = programasCat.find((p) => p.id === programaFiltro)?.nombre ?? "programa";
      slug = slugify(progNombre);
      etiqueta = progNombre;
      hoja = "Por programa";
    }

    return { slug, etiqueta, hoja };
  }

  // Exporta la lista de participantes actualmente filtrada a Excel.
  // Se adapta al contexto: totales, por programa, o por actividad (con asistencia).
  function exportarExcelParticipantes() {
    const conAsistencia = Boolean(actividadFiltro);

    const filas = participantes.map((p) => {
      const fila: Record<string, unknown> = {
        "Nombre(s)": p.nombre ?? "",
        "Apellido Paterno": p.apellido_paterno ?? "",
        "Apellido Materno": p.apellido_materno ?? "",
        Correo: p.correo ?? "",
        Edad: p.edad ?? "",
        "Fecha de Nacimiento": p.fecha_nacimiento ?? "",
        Sexo: p.sexo ? SEXO_LABEL[p.sexo] ?? p.sexo : "",
        CURP: p.curp ?? "",
        "Estado de Nacimiento": p.estado_nacimiento ?? "",
        Municipio: p.municipio ?? "",
        "Estado Civil": p.estado_civil ?? "",
        "Grado de Estudios": p.grado_estudios ?? "",
        Escuela: p.escuela ?? "",
        Celular: p.celular ?? "",
      };
      if (conAsistencia) {
        const est = asistenciaMap[p.id];
        fila["Asistencia"] = est ? ESTATUS_LABEL[est] ?? est : "Sin registro";
      }
      return fila;
    });

    const { slug, hoja } = contextoExport();
    exportarExcel(
      [{ nombre: hoja, filas: filas.length ? filas : [{ Aviso: "Sin participantes" }] }],
      `participantes-${slug}`
    );
  }

  // Exporta la lista de participantes filtrada a PDF (formato de lista imprimible).
  function exportarPDFParticipantes() {
    const conAsistencia = Boolean(actividadFiltro);
    const { slug, etiqueta } = contextoExport();

    const columnas = ["#", "Nombre completo", "Correo", "Edad", "Municipio"];
    if (conAsistencia) columnas.push("Asistencia");

    const filas = participantes.map((p, i) => {
      const nombre = [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ");
      const fila: (string | number)[] = [
        i + 1,
        nombre || "—",
        p.correo ?? "—",
        p.edad ?? "—",
        p.municipio ?? "—",
      ];
      if (conAsistencia) {
        const est = asistenciaMap[p.id];
        fila.push(est ? ESTATUS_LABEL[est] ?? est : "Sin registro");
      }
      return fila;
    });

    const asistieron = conAsistencia
      ? participantes.filter((p) => asistenciaMap[p.id] === "asistio").length
      : null;

    const secciones: SeccionPDF[] = [
      {
        titulo: `${participantes.length} participante${participantes.length !== 1 ? "s" : ""}${
          asistieron !== null ? ` · ${asistieron} asistieron` : ""
        }`,
        columnas,
        filas,
      },
    ];

    exportarPDF({
      titulo: "Lista de participantes",
      subtitulo: etiqueta,
      secciones,
      nombreArchivo: `participantes-${slug}`,
    });
  }

  const cargar = useCallback(async () => {
    setLoading(true);

    // Determina el conjunto de participantes según los filtros (vía asistencias).
    // idsFiltro === null → sin restricción (todos).
    let idsFiltro: string[] | null = null;

    if (actividadFiltro) {
      // Cargar el mapa de asistencia de la actividad seleccionada.
      const { data: asis } = await supabase
        .from("asistencias")
        .select("participante_id, estatus")
        .eq("actividad_id", actividadFiltro);
      const map: Record<string, string> = {};
      (asis ?? []).forEach((a) => {
        map[(a as { participante_id: string }).participante_id] = (a as { estatus: string }).estatus;
      });
      setAsistenciaMap(map);
      // Solo la lista de la actividad, salvo que se pidan todos (para agregar a alguien).
      if (!mostrarTodos) idsFiltro = Object.keys(map);
    } else {
      setAsistenciaMap({});
      if (programaFiltro) {
        const actIds = actividadesCat
          .filter((a) => a.programa_id === programaFiltro)
          .map((a) => a.id);
        if (actIds.length === 0) {
          idsFiltro = [];
        } else {
          const { data: asis } = await supabase
            .from("asistencias")
            .select("participante_id")
            .in("actividad_id", actIds);
          idsFiltro = [...new Set((asis ?? []).map((a) => (a as { participante_id: string }).participante_id))];
        }
      }
    }

    // Si el filtro no arroja participantes, no consultes.
    if (idsFiltro !== null && idsFiltro.length === 0) {
      setParticipantes([]);
      setLoading(false);
      return;
    }

    let q = supabase.from("participantes").select("*").order("nombre").limit(500);
    if (idsFiltro !== null) q = q.in("id", idsFiltro);
    if (search.trim()) {
      q = q.or(`nombre.ilike.%${search.trim()}%,correo.ilike.%${search.trim()}%`);
    }
    const { data } = await q;
    setParticipantes(data ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, programaFiltro, actividadFiltro, mostrarTodos, actividadesCat]);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  function abrirCrear() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function abrirEditar(p: Participante) {
    setEditing(p);
    setForm({
      nombre: p.nombre,
      apellido_paterno: p.apellido_paterno ?? "",
      apellido_materno: p.apellido_materno ?? "",
      correo: p.correo ?? "",
      fecha_nacimiento: p.fecha_nacimiento ?? "",
      sexo: p.sexo ?? "",
      curp: p.curp ?? "",
      estado_nacimiento: p.estado_nacimiento ?? "",
      municipio: p.municipio ?? "",
      estado_civil: p.estado_civil ?? "",
      grado_estudios: p.grado_estudios ?? "",
      escuela: p.escuela ?? "",
      semestre: p.semestre ?? "",
      celular: p.celular ?? "",
      es_menor_edad: p.es_menor_edad,
      consentimiento_tutor: p.consentimiento_tutor,
    });
    setError(null);
    setModalOpen(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fnac = form.fecha_nacimiento || null;
    const edad = fnac ? edadDesde(fnac) : null;

    const payload = {
      nombre: form.nombre.trim(),
      apellido_paterno: form.apellido_paterno.trim() || null,
      apellido_materno: form.apellido_materno.trim() || null,
      correo: form.correo.trim().toLowerCase() || null,
      fecha_nacimiento: fnac,
      edad,
      sexo: (form.sexo || null) as Sexo | null,
      curp: form.curp.trim().toUpperCase() || null,
      estado_nacimiento: form.estado_nacimiento || null,
      municipio: form.municipio.trim() || null,
      estado_civil: form.estado_civil || null,
      grado_estudios: form.grado_estudios || null,
      escuela: form.escuela.trim() || null,
      semestre: form.semestre.trim() || null,
      celular: form.celular.trim() || null,
      es_menor_edad: edad !== null ? edad < 18 : form.es_menor_edad,
      consentimiento_tutor: form.consentimiento_tutor,
    };

    const { error: err } = editing
      ? await supabase.from("participantes").update(payload).eq("id", editing.id)
      : await supabase.from("participantes").insert(payload);

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
      .from("participantes")
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
            <Users size={20} className="text-brand-500" />
            Participantes
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Gestión de jóvenes registrados en los programas
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} />
          Nuevo participante
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o correo…"
          className={`${inputClass} pl-10 bg-white`}
        />
      </div>

      {/* Filtros / pasar lista */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-brand-500" />
            <h2 className="text-sm font-semibold text-gray-700">Filtrar y pasar lista</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400 hidden sm:inline">Exportar en:</span>
            <button
              onClick={exportarExcelParticipantes}
              disabled={loading || participantes.length === 0}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-forest-700 bg-forest-50 hover:bg-forest-100 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
              title={
                actividadFiltro
                  ? "Exportar lista de la actividad (con asistencia)"
                  : programaFiltro
                  ? "Exportar participantes del programa"
                  : "Exportar todos los participantes"
              }
            >
              <FileSpreadsheet size={14} />
              Excel
            </button>
            <button
              onClick={exportarPDFParticipantes}
              disabled={loading || participantes.length === 0}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
              title="Exportar lista imprimible en PDF"
            >
              <FileText size={14} />
              PDF
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <select
            value={programaFiltro}
            onChange={(e) => {
              setProgramaFiltro(e.target.value);
              setActividadFiltro("");
              setMostrarTodos(false);
            }}
            className={`${inputClass} bg-white`}
          >
            <option value="">Todos los programas</option>
            {programasCat.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>

          <select
            value={actividadFiltro}
            onChange={(e) => {
              setActividadFiltro(e.target.value);
              setMostrarTodos(false);
            }}
            className={`${inputClass} bg-white`}
          >
            <option value="">Todas las actividades</option>
            {actividadesDelFiltro.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
                {!programaFiltro && a.programas?.nombre ? ` · ${a.programas.nombre}` : ""}
              </option>
            ))}
          </select>

          {(programaFiltro || actividadFiltro) && (
            <button
              onClick={() => {
                setProgramaFiltro("");
                setActividadFiltro("");
                setMostrarTodos(false);
              }}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {actividadFiltro && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-50">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={mostrarTodos}
                onChange={(e) => setMostrarTodos(e.target.checked)}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-200"
              />
              Mostrar todos los participantes (para agregar a la lista)
            </label>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-forest-50 text-forest-700 font-semibold">
                <Check size={12} />
                {participantes.filter((p) => asistenciaMap[p.id] === "asistio").length} asistieron
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-500 font-medium">
                {participantes.length} en lista
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabla escritorio / tarjetas móvil */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-300 text-center py-12">Cargando…</p>
        ) : participantes.length === 0 ? (
          <p className="text-sm text-gray-300 text-center py-12">
            {search ? "Sin resultados para la búsqueda." : "Aún no hay participantes registrados."}
          </p>
        ) : (
          <>
            {/* Escritorio */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Nombre</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Correo</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Edad</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Municipio</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Escuela</th>
                  {actividadFiltro && (
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Asistencia
                    </th>
                  )}
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {participantes.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-gray-800">
                        {p.nombre} {p.apellido_paterno} {p.apellido_materno}
                      </span>
                      {p.es_menor_edad && (
                        <span className={`ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${p.consentimiento_tutor ? "bg-forest-50 text-forest-600" : "bg-amber-50 text-amber-600"}`}>
                          {p.consentimiento_tutor ? "menor · con consentimiento" : "menor · sin consentimiento"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{p.correo ?? "—"}</td>
                    <td className="px-5 py-3.5 text-gray-500">{p.edad ?? "—"}</td>
                    <td className="px-5 py-3.5 text-gray-500">{p.municipio ?? "—"}</td>
                    <td className="px-5 py-3.5 text-gray-500">{p.escuela ?? "—"}</td>
                    {actividadFiltro && (
                      <td className="px-5 py-3.5">
                        <AsistenciaToggle
                          estatus={asistenciaMap[p.id]}
                          disabled={marcando === p.id}
                          onMark={(est) => marcarAsistencia(p.id, est)}
                        />
                      </td>
                    )}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => verActividades(p)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-forest-50 hover:text-forest-600 transition-colors"
                          title="Ver actividades"
                        >
                          <CalendarCheck size={15} />
                        </button>
                        <button
                          onClick={() => abrirEditar(p)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleting(p)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Móvil */}
            <ul className="md:hidden divide-y divide-gray-50">
              {participantes.map((p) => (
                <li key={p.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {p.nombre} {p.apellido_paterno}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {p.correo ?? "Sin correo"}
                      {p.edad ? ` · ${p.edad} años` : ""}
                      {p.municipio ? ` · ${p.municipio}` : ""}
                    </p>
                    {p.es_menor_edad && (
                      <span className={`mt-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${p.consentimiento_tutor ? "bg-forest-50 text-forest-600" : "bg-amber-50 text-amber-600"}`}>
                        {p.consentimiento_tutor ? "menor · con consentimiento" : "menor · sin consentimiento"}
                      </span>
                    )}
                    {actividadFiltro && (
                      <div className="mt-2">
                        <AsistenciaToggle
                          estatus={asistenciaMap[p.id]}
                          disabled={marcando === p.id}
                          onMark={(est) => marcarAsistencia(p.id, est)}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => verActividades(p)}
                      className="p-2 rounded-lg text-gray-400 hover:bg-forest-50 hover:text-forest-600"
                    >
                      <CalendarCheck size={15} />
                    </button>
                    <button
                      onClick={() => abrirEditar(p)}
                      className="p-2 rounded-lg text-gray-400 hover:bg-brand-50 hover:text-brand-600"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleting(p)}
                      className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {!loading && participantes.length > 0 && (
        <p className="text-xs text-gray-300 mt-3 text-right">
          {participantes.length} participante{participantes.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Modal crear / editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar participante" : "Nuevo participante"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Nombre *</label>
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Apellido paterno</label>
              <input
                value={form.apellido_paterno}
                onChange={(e) => setForm({ ...form, apellido_paterno: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Apellido materno</label>
              <input
                value={form.apellido_materno}
                onChange={(e) => setForm({ ...form, apellido_materno: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Correo electrónico</label>
              <input
                type="email"
                value={form.correo}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Celular</label>
              <input
                value={form.celular}
                onChange={(e) => setForm({ ...form, celular: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Fecha de nacimiento</label>
              <input
                type="date"
                value={form.fecha_nacimiento}
                onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
                className={inputClass}
              />
              {form.fecha_nacimiento && edadDesde(form.fecha_nacimiento) !== null && (
                <p className="text-[10px] text-gray-400 mt-1">
                  {edadDesde(form.fecha_nacimiento)} años
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Género</label>
              <select
                value={form.sexo}
                onChange={(e) => setForm({ ...form, sexo: e.target.value })}
                className={inputClass}
              >
                <option value="">— Seleccionar —</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
                <option value="prefiero_no_decir">Prefiero no decir</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Estado civil</label>
              <select
                value={form.estado_civil}
                onChange={(e) => setForm({ ...form, estado_civil: e.target.value })}
                className={inputClass}
              >
                <option value="">— Seleccionar —</option>
                {ESTADOS_CIVILES.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>CURP</label>
              <input
                value={form.curp}
                onChange={(e) => setForm({ ...form, curp: e.target.value })}
                maxLength={18}
                className={`${inputClass} uppercase`}
                placeholder="18 caracteres"
              />
            </div>
            <div>
              <label className={labelClass}>Grado de estudios</label>
              <select
                value={form.grado_estudios}
                onChange={(e) => setForm({ ...form, grado_estudios: e.target.value })}
                className={inputClass}
              >
                <option value="">— Seleccionar —</option>
                {GRADOS_ESTUDIO.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Estado de nacimiento</label>
              <select
                value={form.estado_nacimiento}
                onChange={(e) => setForm({ ...form, estado_nacimiento: e.target.value })}
                className={inputClass}
              >
                <option value="">— Seleccionar —</option>
                {ESTADOS_MEXICO.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Municipio</label>
              <input
                value={form.municipio}
                onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Escuela</label>
              <input
                value={form.escuela}
                onChange={(e) => setForm({ ...form, escuela: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={form.es_menor_edad}
                onChange={(e) => setForm({ ...form, es_menor_edad: e.target.checked })}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-400"
              />
              Es menor de edad
            </label>
            {form.es_menor_edad && (
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={form.consentimiento_tutor}
                  onChange={(e) => setForm({ ...form, consentimiento_tutor: e.target.checked })}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-400"
                />
                Cuenta con consentimiento del tutor
              </label>
            )}
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
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear participante"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmación de eliminación */}
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Eliminar participante"
        maxWidth="max-w-md"
      >
        <div className="flex items-start gap-3">
          <div className="bg-red-50 p-2.5 rounded-xl shrink-0">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <p className="text-sm text-gray-600">
            ¿Seguro que deseas eliminar a{" "}
            <span className="font-semibold">
              {deleting?.nombre} {deleting?.apellido_paterno}
            </span>
            ? Se eliminarán también sus asistencias y respuestas. Esta acción no se puede deshacer.
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

      {/* Modal: actividades del participante */}
      <Modal
        open={viendoActividades !== null}
        onClose={() => setViendoActividades(null)}
        title={`Actividades — ${viendoActividades?.nombre ?? ""} ${viendoActividades?.apellido_paterno ?? ""}`}
        maxWidth="max-w-2xl"
      >
        {/* Formulario para registrar en una actividad */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <select
            value={formAsis.actividad_id}
            onChange={(e) => setFormAsis({ ...formAsis, actividad_id: e.target.value })}
            className={`${inputClass} bg-white flex-1`}
          >
            <option value="">— Registrar en actividad… —</option>
            {actividadesCat
              .filter((act) => !asistencias.some((a) => a.actividad_id === act.id))
              .map((act) => (
                <option key={act.id} value={act.id}>
                  {act.nombre}
                  {act.programas?.nombre ? ` · ${act.programas.nombre}` : ""}
                </option>
              ))}
          </select>
          <select
            value={formAsis.estatus}
            onChange={(e) => setFormAsis({ ...formAsis, estatus: e.target.value })}
            className={`${inputClass} bg-white sm:w-40`}
          >
            {ESTATUS_OPCIONES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={registrarAsistencia}
            disabled={!formAsis.actividad_id || registrando}
            className="inline-flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shrink-0"
          >
            <Plus size={15} />
            {registrando ? "…" : "Registrar"}
          </button>
        </div>

        {cargandoActividades ? (
          <p className="text-sm text-gray-300 text-center py-8">Cargando…</p>
        ) : asistencias.length === 0 ? (
          <p className="text-sm text-gray-300 text-center py-8">
            Este participante no tiene actividades registradas.
          </p>
        ) : (
          <ul className="space-y-2">
            {asistencias.map((a) => {
              const badge = ESTATUS_BADGE[a.estatus] ?? {
                label: a.estatus,
                clase: "bg-gray-100 text-gray-500",
              };
              return (
                <li key={a.actividad_id} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {a.actividades?.nombre ?? "Actividad eliminada"}
                      </p>
                      {a.actividades?.programas?.nombre && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {a.actividades.programas.nombre}
                          {a.actividades.tipo ? ` · ${a.actividades.tipo}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.clase}`}
                      >
                        {badge.label}
                      </span>
                      <button
                        onClick={() => quitarAsistencia(a.actividad_id)}
                        className="p-1 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Quitar registro"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-400">
                    {a.actividades?.fecha_inicio && (
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={12} className="text-gray-300" />
                        {formatFecha(a.actividades.fecha_inicio)}
                      </span>
                    )}
                    {a.actividades?.sedes?.nombre && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-gray-300" />
                        {a.actividades.sedes.nombre}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!cargandoActividades && asistencias.length > 0 && (
          <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
            {asistencias.length} actividad{asistencias.length !== 1 ? "es" : ""} ·{" "}
            {asistencias.filter((a) => a.estatus === "asistio").length} con asistencia confirmada
          </p>
        )}
      </Modal>
    </div>
  );
}

// Control rápido para pasar lista: marca al participante como Asistió o Faltó.
function AsistenciaToggle({
  estatus,
  disabled,
  onMark,
}: {
  estatus: string | undefined;
  disabled: boolean;
  onMark: (estatus: string) => void;
}) {
  const base =
    "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50";
  return (
    <div className="inline-flex gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onMark("asistio")}
        className={`${base} ${
          estatus === "asistio"
            ? "bg-forest-500 text-white"
            : "text-forest-700 bg-forest-50 hover:bg-forest-100"
        }`}
      >
        <Check size={13} />
        Asistió
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onMark("no_asistio")}
        className={`${base} ${
          estatus === "no_asistio"
            ? "bg-red-500 text-white"
            : "text-red-700 bg-red-50 hover:bg-red-100"
        }`}
      >
        <X size={13} />
        Faltó
      </button>
    </div>
  );
}
