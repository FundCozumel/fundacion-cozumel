"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import {
  Actividad,
  Cuestionario,
  MetricasAsistencia,
  MetricasParticipantes,
  Programa,
  ResultadosCuestionario,
  TipoCuestionario,
  TIPO_CUESTIONARIO_LABEL,
} from "@/types";
import { exportarExcel, distribucionAFilas } from "@/lib/export/excel";
import { exportarPDF, capturarGraficas, SeccionPDF } from "@/lib/export/pdf";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Filter, FileSpreadsheet, FileText, BarChart3 } from "lucide-react";

const inputClass =
  "w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition";

const PALETA = ["#0d9488", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981", "#ef4444", "#6366f1"];

const SEXO_LABEL: Record<string, string> = {
  masculino: "Masculino",
  femenino: "Femenino",
  otro: "Otro",
  prefiero_no_decir: "Prefiere no decir",
  no_especificado: "No especificado",
};

const ESTATUS_LABEL: Record<string, string> = {
  registrado: "Registrado",
  asistio: "Asistió",
  no_asistio: "No asistió",
  cancelado: "Cancelado",
};

const TIPOS_CUESTIONARIO = Object.keys(TIPO_CUESTIONARIO_LABEL) as TipoCuestionario[];

function ChartCard({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 chart-capture" data-chart-title={title}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

export default function DashboardCharts() {
  const supabase = createSupabaseBrowserClient();

  // Catálogos
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [cuestionarios, setCuestionarios] = useState<Cuestionario[]>([]);

  // Filtros
  const [programaId, setProgramaId] = useState("");
  const [actividadId, setActividadId] = useState("");
  const [tipoCuest, setTipoCuest] = useState<TipoCuestionario | "">("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [cuestionarioId, setCuestionarioId] = useState("");

  // Datos
  const [participantes, setParticipantes] = useState<MetricasParticipantes | null>(null);
  const [asistencia, setAsistencia] = useState<MetricasAsistencia | null>(null);
  const [resultados, setResultados] = useState<ResultadosCuestionario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  // Contenedor de las gráficas, para capturarlas en el PDF.
  const graficasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function cargarCatalogos() {
      const [prog, act, cuest] = await Promise.all([
        supabase.from("programas").select("*").order("nombre"),
        supabase
          .from("actividades")
          .select("*, programas(nombre)")
          .order("fecha_inicio", { ascending: false, nullsFirst: false }),
        api.get<Cuestionario[]>("/cuestionarios"),
      ]);
      setProgramas((prog.data as Programa[]) ?? []);
      setActividades((act.data as Actividad[]) ?? []);
      setCuestionarios(cuest);
    }
    cargarCatalogos().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actividades visibles según programa
  const actividadesFiltradas = useMemo(
    () => (programaId ? actividades.filter((a) => a.programa_id === programaId) : actividades),
    [actividades, programaId]
  );

  // Cuestionarios visibles según programa y tipo
  const cuestionariosFiltrados = useMemo(
    () =>
      cuestionarios.filter(
        (c) =>
          (!programaId || c.programa_id === programaId) && (!tipoCuest || c.tipo === tipoCuest)
      ),
    [cuestionarios, programaId, tipoCuest]
  );

  const cargarMetricas = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [part, asis] = await Promise.all([
        api.get<MetricasParticipantes>(`/metricas/participantes${api.qs({ programa_id: programaId })}`),
        api.get<MetricasAsistencia>(
          `/metricas/asistencia${api.qs({
            programa_id: programaId,
            actividad_id: actividadId,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
          })}`
        ),
      ]);
      setParticipantes(part);
      setAsistencia(asis);

      if (cuestionarioId) {
        const res = await api.get<ResultadosCuestionario>(
          `/metricas/cuestionarios/${cuestionarioId}/resultados${api.qs({
            actividad_id: actividadId,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
          })}`
        );
        setResultados(res);
      } else {
        setResultados(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las métricas.");
    } finally {
      setCargando(false);
    }
  }, [programaId, actividadId, fechaInicio, fechaFin, cuestionarioId]);

  useEffect(() => {
    cargarMetricas();
  }, [cargarMetricas]);

  // Datasets para gráficas
  const dataSexo = useMemo(
    () =>
      Object.entries(participantes?.por_sexo ?? {}).map(([k, v]) => ({
        name: SEXO_LABEL[k] ?? k,
        value: v,
      })),
    [participantes]
  );

  const dataEdad = useMemo(
    () =>
      Object.entries(participantes?.por_grupo_edad ?? {}).map(([k, v]) => ({
        grupo: k,
        total: v,
      })),
    [participantes]
  );

  const dataEstatus = useMemo(
    () =>
      Object.entries(asistencia?.por_estatus ?? {}).map(([k, v]) => ({
        estatus: ESTATUS_LABEL[k] ?? k,
        total: v,
      })),
    [asistencia]
  );

  function limpiarFiltros() {
    setProgramaId("");
    setActividadId("");
    setTipoCuest("");
    setFechaInicio("");
    setFechaFin("");
    setCuestionarioId("");
  }

  // Nombre de archivo, título y subtítulo (filtros) compartidos por Excel y PDF.
  function contextoExport() {
    const programaNombre = programaId
      ? programas.find((p) => p.id === programaId)?.nombre ?? null
      : null;
    const actividadNombre = actividadId
      ? actividades.find((a) => a.id === actividadId)?.nombre ?? null
      : null;
    const tipoNombre = tipoCuest ? TIPO_CUESTIONARIO_LABEL[tipoCuest] : null;
    const cuestNombre = cuestionarioId
      ? cuestionarios.find((c) => c.id === cuestionarioId)?.nombre ?? null
      : null;

    const partes = [
      programaNombre ? `Programa: ${programaNombre}` : "Todos los programas",
      actividadNombre ? `Actividad: ${actividadNombre}` : null,
      tipoNombre ? `Tipo: ${tipoNombre}` : null,
      cuestNombre ? `Cuestionario: ${cuestNombre}` : null,
      fechaInicio ? `Desde: ${fechaInicio}` : null,
      fechaFin ? `Hasta: ${fechaFin}` : null,
    ].filter(Boolean) as string[];

    const slug = (s: string) =>
      s
        .normalize("NFD")
        .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);

    const nombreArchivo = programaNombre
      ? `reporte-${slug(programaNombre)}`
      : "reporte-dashboard";
    const titulo = programaNombre ? `Reporte — ${programaNombre}` : "Reporte del Dashboard";

    return { nombreArchivo, titulo, subtitulo: `Filtros: ${partes.join(" · ")}` };
  }

  function exportarExcelDashboard() {
    const { nombreArchivo } = contextoExport();
    const hojas: { nombre: string; filas: Record<string, unknown>[] }[] = [];
    if (participantes) {
      hojas.push({
        nombre: "Participantes por sexo",
        filas: distribucionAFilas(participantes.por_sexo, "Sexo", "Cantidad"),
      });
      hojas.push({
        nombre: "Participantes por edad",
        filas: distribucionAFilas(participantes.por_grupo_edad, "Grupo de edad", "Cantidad"),
      });
      hojas.push({
        nombre: "Por municipio",
        filas: distribucionAFilas(participantes.por_municipio, "Municipio", "Cantidad"),
      });
      hojas.push({
        nombre: "Por estado civil",
        filas: distribucionAFilas(participantes.por_estado_civil, "Estado civil", "Cantidad"),
      });
      hojas.push({
        nombre: "Por grado de estudios",
        filas: distribucionAFilas(participantes.por_grado_estudios, "Grado", "Cantidad"),
      });
      hojas.push({
        nombre: "Por estado de nacimiento",
        filas: distribucionAFilas(participantes.por_estado_nacimiento, "Estado", "Cantidad"),
      });
    }
    if (asistencia) {
      hojas.push({
        nombre: "Asistencia",
        filas: distribucionAFilas(asistencia.por_estatus, "Estatus", "Cantidad"),
      });
    }
    if (resultados) {
      hojas.push({
        nombre: "Resultados cuestionario",
        filas: resultados.preguntas.flatMap((p): Record<string, unknown>[] =>
          p.distribucion
            ? Object.entries(p.distribucion).map(([etq, n]) => ({
                Pregunta: p.texto,
                Opción: etq,
                Respuestas: n,
              }))
            : [
                {
                  Pregunta: p.texto,
                  Promedio: p.promedio ?? "",
                  Total: p.total_respuestas,
                },
              ]
        ),
      });
    }
    exportarExcel(hojas.length ? hojas : [{ nombre: "Sin datos", filas: [] }], nombreArchivo);
  }

  async function exportarPDFDashboard() {
    setExportando(true);
    try {
      const { nombreArchivo, titulo, subtitulo } = contextoExport();

      // 1. Capturar las gráficas visibles como imágenes.
      const graficas = graficasRef.current
        ? await capturarGraficas(graficasRef.current)
        : [];

      // 2. Tablas de datos como respaldo/detalle.
      const tablas: SeccionPDF[] = [];
      if (participantes) {
        tablas.push({
          titulo: `Participantes por sexo (total: ${participantes.total})`,
          columnas: ["Sexo", "Cantidad"],
          filas: Object.entries(participantes.por_sexo).map(([k, v]) => [SEXO_LABEL[k] ?? k, v]),
        });
        tablas.push({
          titulo: "Por grupo de edad",
          columnas: ["Grupo", "Cantidad"],
          filas: Object.entries(participantes.por_grupo_edad).map(([k, v]) => [k, v]),
        });
      }
      if (asistencia) {
        tablas.push({
          titulo: `Asistencia (tasa: ${asistencia.tasa_asistencia}%)`,
          columnas: ["Estatus", "Cantidad"],
          filas: Object.entries(asistencia.por_estatus).map(([k, v]) => [ESTATUS_LABEL[k] ?? k, v]),
        });
      }
      if (resultados) {
        for (const p of resultados.preguntas) {
          if (p.distribucion) {
            tablas.push({
              titulo: p.texto,
              columnas: ["Opción", "Respuestas"],
              filas: Object.entries(p.distribucion).map(([k, v]) => [k, v]),
            });
          }
        }
      }

      const secciones = [...graficas, ...tablas];
      exportarPDF({
        titulo,
        subtitulo,
        secciones: secciones.length
          ? secciones
          : [{ titulo: "Sin datos", columnas: ["—"], filas: [] }],
        nombreArchivo,
      });
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="mt-8 space-y-5">
      {/* Filtros */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-brand-500" />
            <h2 className="text-sm font-semibold text-gray-700">Filtros</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400">Exportar en:</span>
            <button
              onClick={exportarExcelDashboard}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-forest-700 bg-forest-50 hover:bg-forest-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <FileSpreadsheet size={14} />
              Excel
            </button>
            <button
              onClick={exportarPDFDashboard}
              disabled={exportando || cargando}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <FileText size={14} />
              {exportando ? "Generando…" : "PDF"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <select
            value={programaId}
            onChange={(e) => {
              setProgramaId(e.target.value);
              setActividadId("");
              setCuestionarioId("");
            }}
            className={inputClass}
          >
            <option value="">Todos los programas</option>
            {programas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>

          <select
            value={actividadId}
            onChange={(e) => setActividadId(e.target.value)}
            className={inputClass}
          >
            <option value="">Todas las actividades</option>
            {actividadesFiltradas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>

          <select
            value={tipoCuest}
            onChange={(e) => {
              setTipoCuest(e.target.value as TipoCuestionario | "");
              setCuestionarioId("");
            }}
            className={inputClass}
          >
            <option value="">Todos los tipos</option>
            {TIPOS_CUESTIONARIO.map((t) => (
              <option key={t} value={t}>
                {TIPO_CUESTIONARIO_LABEL[t]}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className={inputClass}
              title="Fecha inicio"
            />
            <span className="text-gray-300 text-xs">a</span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className={inputClass}
              title="Fecha fin"
            />
          </div>

          <select
            value={cuestionarioId}
            onChange={(e) => setCuestionarioId(e.target.value)}
            className={inputClass}
          >
            <option value="">— Resultados de cuestionario —</option>
            {cuestionariosFiltrados.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} · {TIPO_CUESTIONARIO_LABEL[c.tipo]}
              </option>
            ))}
          </select>

          <button
            onClick={limpiarFiltros}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {cargando ? (
        <p className="text-sm text-gray-300 text-center py-12">Cargando métricas…</p>
      ) : (
        <div ref={graficasRef} className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Participantes por sexo */}
            <ChartCard title="Participantes por sexo">
              {dataSexo.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={dataSexo}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(e: { name?: string; value?: number }) => `${e.name}: ${e.value}`}
                    >
                      {dataSexo.map((_, i) => (
                        <Cell key={i} fill={PALETA[i % PALETA.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Participantes por grupo de edad */}
            <ChartCard title="Participantes por grupo de edad">
              {dataEdad.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dataEdad}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="grupo" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#0d9488" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Asistencia por estatus */}
            <ChartCard
              title="Asistencia por estatus"
              right={
                asistencia ? (
                  <span className="text-xs font-semibold text-forest-600 bg-forest-50 px-2.5 py-1 rounded-full">
                    Tasa: {asistencia.tasa_asistencia}%
                  </span>
                ) : null
              }
            >
              {dataEstatus.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dataEstatus}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="estatus" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Top municipios */}
            <ChartCard title="Participantes por municipio (top 10)">
              {!participantes || Object.keys(participantes.por_municipio).length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    layout="vertical"
                    data={Object.entries(participantes.por_municipio).map(([k, v]) => ({
                      municipio: k,
                      total: v,
                    }))}
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <YAxis
                      type="category"
                      dataKey="municipio"
                      width={100}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                    />
                    <Tooltip />
                    <Bar dataKey="total" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Estado civil */}
            <ChartCard title="Participantes por estado civil">
              {!participantes || Object.keys(participantes.por_estado_civil).length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={Object.entries(participantes.por_estado_civil).map(([k, v]) => ({
                      cat: k,
                      total: v,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="cat" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#ec4899" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Grado de estudios */}
            <ChartCard title="Participantes por grado de estudios">
              {!participantes || Object.keys(participantes.por_grado_estudios).length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={Object.entries(participantes.por_grado_estudios).map(([k, v]) => ({
                      cat: k,
                      total: v,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="cat" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Estado de nacimiento */}
            <ChartCard title="Participantes por estado de nacimiento (top 15)">
              {!participantes || Object.keys(participantes.por_estado_nacimiento).length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    layout="vertical"
                    data={Object.entries(participantes.por_estado_nacimiento).map(([k, v]) => ({
                      estado: k,
                      total: v,
                    }))}
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <YAxis
                      type="category"
                      dataKey="estado"
                      width={110}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                    />
                    <Tooltip />
                    <Bar dataKey="total" fill="#6366f1" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Resultados de cuestionario */}
          {cuestionarioId && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={16} className="text-brand-500" />
                <h2 className="text-sm font-semibold text-gray-700">
                  Resultados — {resultados?.cuestionario ?? ""}
                </h2>
                {resultados && (
                  <span className="text-xs text-gray-400">
                    {resultados.total_respondentes} respondentes
                  </span>
                )}
              </div>

              {!resultados || resultados.preguntas.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {resultados.preguntas.map((p) =>
                    p.distribucion ? (
                      <div
                        key={p.pregunta_id}
                        className="border border-gray-100 rounded-xl p-4 chart-capture"
                        data-chart-title={p.texto}
                      >
                        <p className="text-xs font-medium text-gray-600 mb-3">{p.texto}</p>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={Object.entries(p.distribucion).map(([etq, n]) => ({
                              opcion: etq,
                              total: n,
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                              dataKey="opcion"
                              tick={{ fontSize: 10, fill: "#94a3b8" }}
                              interval={0}
                              angle={-15}
                              textAnchor="end"
                              height={50}
                            />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                            <Tooltip />
                            <Bar dataKey="total" fill="#0d9488" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div
                        key={p.pregunta_id}
                        className="border border-gray-100 rounded-xl p-4 flex flex-col justify-center"
                      >
                        <p className="text-xs font-medium text-gray-600 mb-2">{p.texto}</p>
                        {p.tipo === "numero" ? (
                          <div className="flex gap-4 text-sm">
                            <span className="text-gray-500">
                              Prom: <b className="text-gray-800">{p.promedio ?? "—"}</b>
                            </span>
                            <span className="text-gray-500">
                              Mín: <b className="text-gray-800">{p.minimo ?? "—"}</b>
                            </span>
                            <span className="text-gray-500">
                              Máx: <b className="text-gray-800">{p.maximo ?? "—"}</b>
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">
                            {p.total_respuestas} respuestas (texto abierto / fecha)
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[200px] flex items-center justify-center">
      <p className="text-sm text-gray-300">Sin datos para los filtros seleccionados</p>
    </div>
  );
}
