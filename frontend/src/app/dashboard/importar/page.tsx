"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { parsearArchivo, automapear, normalizar, ArchivoParseado } from "@/lib/import/parse";
import { exportarExcel } from "@/lib/export/excel";
import { CAMPOS_DEMOGRAFICOS } from "@/lib/catalogos";
import {
  Actividad,
  Cuestionario,
  Participante,
  Programa,
  Sexo,
  TipoCuestionario,
  TipoRespuesta,
  TIPO_CUESTIONARIO_LABEL,
  TIPO_RESPUESTA_LABEL,
} from "@/types";
import {
  Upload,
  Users,
  CalendarCheck,
  ClipboardList,
  FilePlus2,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const inputClass =
  "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition";
const labelClass = "block text-xs font-medium text-gray-500 mb-1";

type Dataset = "participantes" | "asistencias" | "respuestas" | "cuestionario";

const SEXOS_VALIDOS = ["masculino", "femenino", "otro", "prefiero_no_decir"];
const ESTATUS_VALIDOS = ["registrado", "asistio", "no_asistio", "cancelado"];

const TIPOS_CUESTIONARIO = Object.keys(TIPO_CUESTIONARIO_LABEL) as TipoCuestionario[];
const TIPOS_RESPUESTA = Object.keys(TIPO_RESPUESTA_LABEL) as TipoRespuesta[];

// Opciones por defecto para preguntas cerradas estándar.
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

/** Detecta a qué campo demográfico del participante corresponde una columna del Forms.
 *  Elige el campo cuyo alias es el MÁS específico: coincidencia exacta gana sobre
 *  substring, y entre substrings gana el alias más largo. Esto evita que
 *  "Estado de Nacimiento" se confunda con `fecha_nacimiento` por contener "nacimiento".
 */
function detectarCampoDemografico(columna: string): string | null {
  const n = normalizar(columna);
  let mejor: { campo: string; score: number } | null = null;
  for (const { campo, alias } of CAMPOS_DEMOGRAFICOS) {
    for (const a of alias) {
      const na = normalizar(a);
      let score = 0;
      if (n === na) score = 1000 + na.length; // exacta: máxima prioridad
      else if (n.includes(na)) score = na.length; // substring: el alias más largo es más específico
      if (score > 0 && (!mejor || score > mejor.score)) mejor = { campo, score };
    }
  }
  return mejor?.campo ?? null;
}

/** Mapea el valor de "Género" del Forms al enum de sexo del sistema. */
function mapearGenero(val: string): Sexo | null {
  const n = normalizar(val);
  if (["masculino", "hombre", "m"].includes(n)) return "masculino";
  if (["femenino", "mujer", "f"].includes(n)) return "femenino";
  if (n.includes("prefiero")) return "prefiero_no_decir";
  if (n === "otro") return "otro";
  return null;
}

/** Calcula la edad (años cumplidos) desde una fecha ISO yyyy-mm-dd. */
function calcularEdad(iso: string): number | null {
  const m = iso.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const hoy = new Date();
  let edad = hoy.getFullYear() - y;
  if (hoy.getMonth() + 1 < mo || (hoy.getMonth() + 1 === mo && hoy.getDate() < d)) edad--;
  return edad >= 0 && edad <= 120 ? edad : null;
}

/** Normaliza una fecha de Forms a yyyy-mm-dd.
 *  Acepta: yyyy-mm-dd (ISO), M/D/YYYY o D/M/YYYY con año de 4 dígitos,
 *  y M/D/YY o D/M/YY con año de 2 dígitos (formato Google Forms).
 *  Cuando ambos valores son ≤ 12 y el año es de 2 dígitos, asume M/D (Google Forms).
 */
function normalizarFecha(val: string): string {
  const v = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; // ya ISO

  // 4-digit year: D/M/YYYY or M/D/YYYY
  const m4 = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m4) {
    const [, a, b, y] = m4;
    // b > 12 → must be day → M/D/YYYY (Google Forms)
    if (Number(b) > 12) return `${y}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
    // otherwise assume D/M/YYYY (manual entry)
    return `${y}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  }

  // 2-digit year: M/D/YY (Google Forms standard)
  const m2 = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/);
  if (m2) {
    const [, a, b, y2] = m2;
    const an = Number(a), bn = Number(b), yn = Number(y2);
    const fullYear = yn <= 30 ? 2000 + yn : 1900 + yn;
    if (bn > 12) return `${fullYear}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`; // M/D
    if (an > 12) return `${fullYear}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`; // D/M
    return `${fullYear}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`; // default M/D
  }

  return v;
}

/** Ejecuta `fn` sobre los items con concurrencia limitada (lotes). */
async function enLotes<T, R>(
  items: T[],
  limite: number,
  fn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const resultados: R[] = [];
  for (let i = 0; i < items.length; i += limite) {
    const lote = items.slice(i, i + limite);
    const r = await Promise.all(lote.map((it, j) => fn(it, i + j)));
    resultados.push(...r);
  }
  return resultados;
}

/** Infiere el tipo de respuesta de una pregunta a partir de los valores de su columna. */
function inferirTipo(valores: string[]): TipoRespuesta {
  const v = valores.map((s) => s.trim()).filter(Boolean);
  if (v.length === 0) return "texto";
  const norm = v.map(normalizar);
  const distintos = new Set(norm);

  if ([...distintos].every((x) => x === "si" || x === "no")) return "si_no";

  const numeros = v.map((x) => Number(x));
  const todosNumeros = numeros.every((n) => !Number.isNaN(n));
  if (todosNumeros && numeros.every((n) => Number.isInteger(n) && n >= 1 && n <= 5)) return "likert_1_5";
  if (todosNumeros) return "numero";

  if (v.every((x) => /^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(x) || /^\d{4}-\d{1,2}-\d{1,2}$/.test(x)))
    return "fecha";

  // Pocas categorías repetidas → opción múltiple
  if (distintos.size <= 8 && distintos.size < v.length) return "opcion_multiple";

  return "texto";
}

// Campos destino para participantes
const CAMPOS_PARTICIPANTE = [
  { key: "nombre", alias: ["nombres", "nombre completo"], requerido: true },
  { key: "apellido_paterno", alias: ["apellido paterno", "primer apellido"] },
  { key: "apellido_materno", alias: ["apellido materno", "segundo apellido"] },
  { key: "correo", alias: ["email", "e-mail", "correo electronico"] },
  { key: "edad", alias: ["años", "edad"] },
  { key: "sexo", alias: ["genero", "sexo"] },
  { key: "municipio", alias: ["ciudad", "municipio"] },
  { key: "escuela", alias: ["institucion", "escuela", "colegio"] },
  { key: "semestre", alias: ["grado", "semestre"] },
  { key: "celular", alias: ["telefono", "celular", "movil"] },
];

interface ResultadoImport {
  ok: number;
  errores: { fila: number; motivo: string }[];
  detalle?: string;
}

// Configuración por columna al importar un cuestionario desde Forms.
interface ColumnaPregunta {
  incluir: boolean;
  tipo: TipoRespuesta;
}

export default function ImportarPage() {
  const supabase = createSupabaseBrowserClient();
  const [dataset, setDataset] = useState<Dataset>("participantes");

  const [archivo, setArchivo] = useState<ArchivoParseado | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [mapa, setMapa] = useState<Record<string, string>>({});
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Catálogos para asistencias/respuestas/cuestionario
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [cuestionarios, setCuestionarios] = useState<Cuestionario[]>([]);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [cuestionarioSel, setCuestionarioSel] = useState<Cuestionario | null>(null);
  const [colParticipante, setColParticipante] = useState("");
  const [actividadFija, setActividadFija] = useState("");

  // Estado para importar un cuestionario desde Forms
  const [cuestForm, setCuestForm] = useState({
    nombre: "",
    programa_id: "",
    tipo: "pre" as TipoCuestionario,
    descripcion: "",
  });
  const [colConfig, setColConfig] = useState<Record<string, ColumnaPregunta>>({});
  // Columnas reconocidas como datos del participante: columna -> campo demográfico
  const [demogMap, setDemogMap] = useState<Record<string, string>>({});
  const [crearParticipantes, setCrearParticipantes] = useState(true);
  const [progreso, setProgreso] = useState<{ hecho: number; total: number } | null>(null);
  const [mostrarTipos, setMostrarTipos] = useState(false);

  useEffect(() => {
    async function cargar() {
      const [part, act, cuest, prog] = await Promise.all([
        supabase.from("participantes").select("*"),
        supabase.from("actividades").select("*, programas(nombre)"),
        api.get<Cuestionario[]>("/cuestionarios"),
        supabase.from("programas").select("*").eq("estatus", true).order("nombre"),
      ]);
      setParticipantes((part.data as Participante[]) ?? []);
      setActividades((act.data as Actividad[]) ?? []);
      setCuestionarios(cuest);
      setProgramas((prog.data as Programa[]) ?? []);
    }
    cargar().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetEstado() {
    setArchivo(null);
    setNombreArchivo("");
    setMapa({});
    setResultado(null);
    setError(null);
    setColParticipante("");
    setColConfig({});
    setDemogMap({});
  }

  // Reclasifica una columna detectada como dato del participante para tratarla como pregunta.
  function demograficoAPregunta(col: string) {
    setDemogMap((prev) => {
      const next = { ...prev };
      delete next[col];
      return next;
    });
    const valores = archivo?.filas.map((f) => f[col] ?? "") ?? [];
    setColConfig((prev) => ({ ...prev, [col]: { incluir: true, tipo: inferirTipo(valores) } }));
  }

  function cambiarDataset(d: Dataset) {
    setDataset(d);
    resetEstado();
    setCuestionarioSel(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResultado(null);
    try {
      const parsed = await parsearArchivo(file);
      if (parsed.filas.length === 0) {
        setError("El archivo está vacío o no tiene filas de datos.");
        return;
      }
      setArchivo(parsed);
      setNombreArchivo(file.name);

      // Automapeo según dataset
      if (dataset === "participantes") {
        setMapa(automapear(parsed.columnas, CAMPOS_PARTICIPANTE));
      } else if (dataset === "asistencias") {
        setMapa(
          automapear(parsed.columnas, [
            { key: "participante", alias: ["correo", "email", "nombre", "participante"] },
            { key: "actividad", alias: ["actividad", "evento", "taller"] },
            { key: "estatus", alias: ["estatus", "estado", "asistencia"] },
          ])
        );
      } else if (dataset === "respuestas") {
        // respuestas: sugerir columna participante
        const guess = parsed.columnas.find((c) =>
          ["correo", "email", "nombre"].some((a) => normalizar(c).includes(normalizar(a)))
        );
        setColParticipante(guess ?? "");
        setMapa({});
      } else {
        // cuestionario desde Forms: separar columnas demográficas (datos del participante)
        // de las preguntas de la encuesta.
        const demog: Record<string, string> = {};
        const config: Record<string, ColumnaPregunta> = {};
        for (const col of parsed.columnas) {
          const n = normalizar(col);
          if (n.includes("marca temporal".replace(/ /g, "")) || n.includes("timestamp") || n === "hora") {
            continue; // metadato: se ignora
          }
          const campo = detectarCampoDemografico(col);
          if (campo) {
            demog[col] = campo;
            continue;
          }
          const valores = parsed.filas.map((f) => f[col] ?? "");
          config[col] = { incluir: true, tipo: inferirTipo(valores) };
        }
        setDemogMap(demog);
        setColConfig(config);
        const correoCol = Object.entries(demog).find(([, c]) => c === "correo")?.[0];
        setColParticipante(correoCol ?? "");
        setMapa({});
      }
    } catch {
      setError("No se pudo leer el archivo. Verifica que sea .xlsx o .csv válido.");
    }
  }

  // Index de búsqueda de participantes por correo y por nombre normalizado
  const indexParticipantes = useMemo(() => {
    const porCorreo = new Map<string, string>();
    const porNombre = new Map<string, string>();
    for (const p of participantes) {
      if (p.correo) porCorreo.set(p.correo.toLowerCase().trim(), p.id);
      const full = normalizar([p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" "));
      if (full) porNombre.set(full, p.id);
    }
    return { porCorreo, porNombre };
  }, [participantes]);

  function resolverParticipante(valor: string): string | null {
    const v = valor.trim();
    if (!v) return null;
    if (v.includes("@")) {
      const id = indexParticipantes.porCorreo.get(v.toLowerCase());
      if (id) return id;
    }
    return indexParticipantes.porNombre.get(normalizar(v)) ?? null;
  }

  /**
   * Devuelve el id del participante; si no existe y crearParticipantes está activo,
   * lo crea (correo o nombre) y actualiza los índices para reusarlo en la misma corrida.
   */
  async function obtenerOCrearParticipante(valor: string): Promise<string | null> {
    const existente = resolverParticipante(valor);
    if (existente) return existente;
    if (!crearParticipantes) return null;

    const v = valor.trim();
    if (!v) return null;
    const correo = v.includes("@") ? v.toLowerCase() : null;
    const nombre = correo ? correo.split("@")[0] : v;

    const { data, error } = await supabase
      .from("participantes")
      .insert({ nombre, correo })
      .select("id")
      .single();
    if (error || !data) return null;

    const id = (data as { id: string }).id;
    if (correo) indexParticipantes.porCorreo.set(correo, id);
    indexParticipantes.porNombre.set(normalizar(nombre), id);
    return id;
  }

  /**
   * Construye el participante desde las columnas demográficas de una fila y hace upsert
   * por correo (crea o actualiza). Devuelve el id, o null si no se pudo.
   */
  async function upsertParticipanteDesdeFila(
    fila: Record<string, string>,
    identificador: string
  ): Promise<string | null> {
    const payload: Record<string, unknown> = {};
    for (const [col, campo] of Object.entries(demogMap)) {
      const val = (fila[col] ?? "").trim();
      if (!val) continue;
      if (campo === "correo") {
        payload.correo = val.toLowerCase();
      } else if (campo === "curp") {
        payload.curp = val.toUpperCase();
      } else if (campo === "sexo") {
        const s = mapearGenero(val);
        if (s) payload.sexo = s;
      } else if (campo === "fecha_nacimiento") {
        const iso = normalizarFecha(val);
        // Solo aceptar fechas que quedaron en formato ISO válido; ignorar el resto.
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
          payload.fecha_nacimiento = iso;
          const edad = calcularEdad(iso);
          if (edad !== null) {
            payload.edad = edad;
            payload.es_menor_edad = edad < 18;
          }
        }
      } else {
        payload[campo] = val;
      }
    }

    const correo =
      (payload.correo as string | undefined) ??
      (identificador.includes("@") ? identificador.toLowerCase() : undefined);
    if (correo) payload.correo = correo;
    if (!payload.nombre) {
      payload.nombre = correo ? correo.split("@")[0] : identificador;
    }

    if (correo) {
      if (!crearParticipantes && !resolverParticipante(correo)) return null;
      const { data, error } = await supabase
        .from("participantes")
        .upsert(payload, { onConflict: "correo" })
        .select("id")
        .single();
      if (error || !data) {
        console.error("[upsert participante]", correo, error?.message, payload);
        return null;
      }
      const id = (data as { id: string }).id;
      indexParticipantes.porCorreo.set(correo, id);
      return id;
    }

    // Sin correo: resolver por nombre o crear si está permitido
    const existente = resolverParticipante(identificador);
    if (existente) return existente;
    if (!crearParticipantes) return null;
    const { data, error } = await supabase
      .from("participantes")
      .insert(payload)
      .select("id")
      .single();
    if (error || !data) return null;
    return (data as { id: string }).id;
  }

  // ── Importadores ────────────────────────────────────────────────────────────

  async function importarParticipantes() {
    if (!archivo) return;
    const colNombre = mapa["nombre"];
    if (!colNombre) {
      setError("Debes mapear al menos la columna de Nombre.");
      return;
    }
    const errores: ResultadoImport["errores"] = [];
    const registros: Record<string, unknown>[] = [];

    archivo.filas.forEach((fila, i) => {
      const numFila = i + 2; // +1 header, +1 base-1
      const nombre = (fila[colNombre] ?? "").trim();
      if (!nombre) {
        errores.push({ fila: numFila, motivo: "Nombre vacío" });
        return;
      }
      const reg: Record<string, unknown> = { nombre };
      for (const campo of CAMPOS_PARTICIPANTE) {
        if (campo.key === "nombre") continue;
        const col = mapa[campo.key];
        if (!col) continue;
        const val = (fila[col] ?? "").trim();
        if (!val) continue;
        if (campo.key === "edad") {
          const edad = parseInt(val, 10);
          if (Number.isNaN(edad) || edad < 0 || edad > 120) {
            errores.push({ fila: numFila, motivo: `Edad inválida: "${val}"` });
            return;
          }
          reg.edad = edad;
        } else if (campo.key === "sexo") {
          const s = normalizar(val);
          const match = SEXOS_VALIDOS.find((x) => normalizar(x) === s || x.startsWith(s));
          if (!match) {
            errores.push({ fila: numFila, motivo: `Sexo inválido: "${val}"` });
            return;
          }
          reg.sexo = match;
        } else {
          reg[campo.key] = val;
        }
      }
      registros.push(reg);
    });

    if (registros.length) {
      const { error: err } = await supabase.from("participantes").insert(registros);
      if (err) {
        setError(`Error al insertar: ${err.message}`);
        return;
      }
    }
    setResultado({ ok: registros.length, errores });
  }

  async function importarAsistencias() {
    if (!archivo) return;
    const colPart = mapa["participante"];
    const colAct = mapa["actividad"];
    const colEst = mapa["estatus"];
    if (!colPart || !colAct) {
      setError("Debes mapear las columnas de Participante y Actividad.");
      return;
    }
    const indexAct = new Map<string, string>();
    for (const a of actividades) indexAct.set(normalizar(a.nombre), a.id);

    const errores: ResultadoImport["errores"] = [];
    const registros: Record<string, unknown>[] = [];

    archivo.filas.forEach((fila, i) => {
      const numFila = i + 2;
      const pid = resolverParticipante(fila[colPart] ?? "");
      if (!pid) {
        errores.push({ fila: numFila, motivo: `Participante no encontrado: "${fila[colPart]}"` });
        return;
      }
      const aid = indexAct.get(normalizar(fila[colAct] ?? ""));
      if (!aid) {
        errores.push({ fila: numFila, motivo: `Actividad no encontrada: "${fila[colAct]}"` });
        return;
      }
      let estatus = "asistio";
      if (colEst && fila[colEst]) {
        const s = normalizar(fila[colEst]);
        const match = ESTATUS_VALIDOS.find((x) => normalizar(x) === s);
        if (!match) {
          errores.push({ fila: numFila, motivo: `Estatus inválido: "${fila[colEst]}"` });
          return;
        }
        estatus = match;
      }
      registros.push({ participante_id: pid, actividad_id: aid, estatus });
    });

    if (registros.length) {
      // upsert para respetar el índice único (participante, actividad)
      const { error: err } = await supabase
        .from("asistencias")
        .upsert(registros, { onConflict: "participante_id,actividad_id" });
      if (err) {
        setError(`Error al insertar: ${err.message}`);
        return;
      }
    }
    setResultado({ ok: registros.length, errores });
  }

  async function importarRespuestas() {
    if (!archivo || !cuestionarioSel) return;
    if (!colParticipante) {
      setError("Selecciona la columna que identifica al participante.");
      return;
    }
    const preguntas = cuestionarioSel.preguntas ?? [];
    const preguntasMapeadas = preguntas.filter((p) => mapa[p.id]);
    if (preguntasMapeadas.length === 0) {
      setError("Mapea al menos una pregunta a una columna del archivo.");
      return;
    }

    const errores: ResultadoImport["errores"] = [];
    let ok = 0;

    for (let i = 0; i < archivo.filas.length; i++) {
      const fila = archivo.filas[i];
      const numFila = i + 2;
      const pid = resolverParticipante(fila[colParticipante] ?? "");
      if (!pid) {
        errores.push({ fila: numFila, motivo: `Participante no encontrado: "${fila[colParticipante]}"` });
        continue;
      }

      const items: Record<string, unknown>[] = [];
      for (const p of preguntasMapeadas) {
        const val = (fila[mapa[p.id]] ?? "").trim();
        if (!val) continue;
        const item: Record<string, unknown> = { pregunta_id: p.id };

        if (["likert_1_5", "opcion_multiple", "si_no"].includes(p.tipo_respuesta)) {
          const ops = p.opciones_respuesta ?? [];
          const op =
            ops.find((o) => normalizar(o.etiqueta) === normalizar(val)) ??
            ops.find((o) => String(o.valor ?? "") === val);
          if (!op) {
            errores.push({ fila: numFila, motivo: `Opción inválida en "${p.texto}": "${val}"` });
            continue;
          }
          item.opcion_id = op.id;
        } else if (p.tipo_respuesta === "numero") {
          const n = Number(val);
          if (Number.isNaN(n)) {
            errores.push({ fila: numFila, motivo: `Número inválido en "${p.texto}": "${val}"` });
            continue;
          }
          item.valor_num = n;
        } else if (p.tipo_respuesta === "fecha") {
          item.valor_fecha = val;
        } else {
          item.valor_texto = val;
        }
        items.push(item);
      }

      if (items.length === 0) continue;

      try {
        await api.post("/respuestas", {
          cuestionario_id: cuestionarioSel.id,
          participante_id: pid,
          actividad_id: actividadFija || null,
          respuestas: items,
        });
        ok++;
      } catch (e) {
        errores.push({ fila: numFila, motivo: e instanceof Error ? e.message : "Error al enviar" });
      }
    }

    setResultado({ ok, errores });
  }

  async function importarCuestionarioDesdeForms() {
    if (!archivo) return;
    if (!cuestForm.programa_id) {
      setError("Selecciona el programa del cuestionario.");
      return;
    }
    if (!cuestForm.nombre.trim()) {
      setError("Escribe el nombre del cuestionario.");
      return;
    }
    if (!colParticipante) {
      setError("Selecciona la columna que identifica al participante.");
      return;
    }
    const columnasPregunta = Object.entries(colConfig).filter(([, c]) => c.incluir);
    if (columnasPregunta.length === 0) {
      setError("Marca al menos una columna como pregunta.");
      return;
    }

    const errores: ResultadoImport["errores"] = [];

    // 1. Crear el cuestionario
    let cuest: Cuestionario;
    try {
      cuest = await api.post<Cuestionario>("/cuestionarios", {
        programa_id: cuestForm.programa_id,
        tipo: cuestForm.tipo,
        nombre: cuestForm.nombre.trim(),
        descripcion: cuestForm.descripcion.trim() || null,
      });
    } catch (e) {
      setError(`No se pudo crear el cuestionario: ${e instanceof Error ? e.message : ""}`);
      return;
    }

    // 2. Crear preguntas + opciones (en paralelo, por lotes)
    type PreguntaInfo = {
      col: string;
      preguntaId: string;
      tipo: TipoRespuesta;
      porEtiqueta: Map<string, string>;
      porValor: Map<number, string>;
    };

    setProgreso({ hecho: 0, total: columnasPregunta.length });
    let preguntasHechas = 0;

    const preguntasInfoRaw = await enLotes(columnasPregunta, 6, async ([col, cfg], idx) => {
      let pregunta: { id: string };
      try {
        pregunta = await api.post<{ id: string }>(`/cuestionarios/${cuest.id}/preguntas`, {
          texto: col,
          tipo_respuesta: cfg.tipo,
          orden: idx + 1,
          obligatoria: false,
        });
      } catch (e) {
        errores.push({ fila: 1, motivo: `No se pudo crear pregunta "${col}": ${e instanceof Error ? e.message : ""}` });
        return null;
      }

      // Determinar opciones
      let opciones = opcionesPorDefecto(cfg.tipo);
      if (cfg.tipo === "opcion_multiple") {
        const vistos = new Set<string>();
        const uniq: string[] = [];
        for (const fila of archivo.filas) {
          const val = (fila[col] ?? "").trim();
          if (val && !vistos.has(normalizar(val))) {
            vistos.add(normalizar(val));
            uniq.push(val);
          }
        }
        opciones = uniq.map((etq, i) => ({ etiqueta: etq, valor: i + 1, orden: i + 1 }));
      }

      const porEtiqueta = new Map<string, string>();
      const porValor = new Map<number, string>();
      await Promise.all(
        opciones.map(async (op) => {
          try {
            const creada = await api.post<{ id: string }>(`/preguntas/${pregunta.id}/opciones`, op);
            porEtiqueta.set(normalizar(op.etiqueta), creada.id);
            porValor.set(op.valor, creada.id);
          } catch {
            /* noop */
          }
        })
      );

      preguntasHechas++;
      setProgreso({ hecho: preguntasHechas, total: columnasPregunta.length });
      return { col, preguntaId: pregunta.id, tipo: cfg.tipo, porEtiqueta, porValor } as PreguntaInfo;
    });
    const preguntasInfo = preguntasInfoRaw.filter((p): p is PreguntaInfo => p !== null);

    // 3a. Crear/actualizar participantes con su demografía (secuencial, evita carreras).
    // Para cada identificador se usa la primera fila que lo contiene.
    const idsValores = [...new Set(archivo.filas.map((f) => (f[colParticipante] ?? "").trim()))];
    const pidPorValor = new Map<string, string | null>();
    for (const valor of idsValores) {
      const fila = archivo.filas.find((f) => (f[colParticipante] ?? "").trim() === valor);
      pidPorValor.set(
        valor,
        fila ? await upsertParticipanteDesdeFila(fila, valor) : await obtenerOCrearParticipante(valor)
      );
    }

    // 3b. Registrar asistencia en la actividad seleccionada. Sin esto, los
    // participantes importados no aparecen en los filtros por programa/actividad
    // (que se basan en la tabla asistencias).
    if (actividadFija) {
      const pids = [...new Set([...pidPorValor.values()].filter((x): x is string => Boolean(x)))];
      if (pids.length) {
        const { error: errAsis } = await supabase.from("asistencias").upsert(
          pids.map((pid) => ({
            participante_id: pid,
            actividad_id: actividadFija,
            estatus: "asistio",
          })),
          { onConflict: "participante_id,actividad_id" }
        );
        if (errAsis) {
          errores.push({ fila: 1, motivo: `No se pudo registrar la asistencia: ${errAsis.message}` });
        }
      }
    }

    // 3c. Cargar respuestas por fila (en paralelo, por lotes)
    let okResp = 0;
    const total = archivo.filas.length;
    setProgreso({ hecho: 0, total });
    let respHechas = 0;

    await enLotes(archivo.filas, 8, async (fila, i) => {
      const numFila = i + 2;
      const pid = pidPorValor.get((fila[colParticipante] ?? "").trim()) ?? null;
      if (!pid) {
        errores.push({ fila: numFila, motivo: `Participante no encontrado: "${fila[colParticipante]}"` });
        respHechas++;
        setProgreso({ hecho: respHechas, total });
        return;
      }

      const items: Record<string, unknown>[] = [];
      for (const p of preguntasInfo) {
        const val = (fila[p.col] ?? "").trim();
        if (!val) continue;
        const item: Record<string, unknown> = { pregunta_id: p.preguntaId };

        if (["likert_1_5", "opcion_multiple", "si_no"].includes(p.tipo)) {
          const oid =
            p.porEtiqueta.get(normalizar(val)) ??
            (p.tipo === "likert_1_5" ? p.porValor.get(Number(val)) : undefined);
          if (!oid) {
            errores.push({ fila: numFila, motivo: `Opción inválida en "${p.col}": "${val}"` });
            continue;
          }
          item.opcion_id = oid;
        } else if (p.tipo === "numero") {
          const n = Number(val);
          if (Number.isNaN(n)) {
            errores.push({ fila: numFila, motivo: `Número inválido en "${p.col}": "${val}"` });
            continue;
          }
          item.valor_num = n;
        } else if (p.tipo === "fecha") {
          item.valor_fecha = normalizarFecha(val);
        } else {
          item.valor_texto = val;
        }
        items.push(item);
      }

      if (items.length > 0) {
        try {
          await api.post("/respuestas", {
            cuestionario_id: cuest.id,
            participante_id: pid,
            actividad_id: actividadFija || null,
            respuestas: items,
          });
          okResp++;
        } catch (e) {
          errores.push({ fila: numFila, motivo: e instanceof Error ? e.message : "Error al enviar" });
        }
      }
      respHechas++;
      setProgreso({ hecho: respHechas, total });
    });

    setResultado({
      ok: okResp,
      errores,
      detalle:
        `Cuestionario "${cuestForm.nombre.trim()}" creado con ${preguntasInfo.length} preguntas. ` +
        `${okResp} respuestas cargadas.` +
        (actividadFija
          ? " Se registró la asistencia de los participantes en la actividad."
          : " Sin actividad seleccionada: los participantes no quedan ligados a la actividad/programa en los filtros."),
    });
  }

  async function importar() {
    setProcesando(true);
    setError(null);
    setResultado(null);
    try {
      if (dataset === "participantes") await importarParticipantes();
      else if (dataset === "asistencias") await importarAsistencias();
      else if (dataset === "respuestas") await importarRespuestas();
      else await importarCuestionarioDesdeForms();
    } finally {
      setProcesando(false);
      setProgreso(null);
    }
  }

  // Plantillas descargables
  function descargarPlantilla() {
    if (dataset === "participantes") {
      exportarExcel(
        [
          {
            nombre: "participantes",
            filas: [
              {
                nombre: "Ana",
                apellido_paterno: "López",
                apellido_materno: "Ruiz",
                correo: "ana@example.com",
                edad: 17,
                sexo: "femenino",
                municipio: "Cozumel",
                escuela: "Prepa 1",
                semestre: "3",
                celular: "9870000000",
              },
            ],
          },
        ],
        "plantilla-participantes"
      );
    } else if (dataset === "asistencias") {
      exportarExcel(
        [
          {
            nombre: "asistencias",
            filas: [{ correo: "ana@example.com", actividad: "Taller de liderazgo", estatus: "asistio" }],
          },
        ],
        "plantilla-asistencias"
      );
    } else if (dataset === "respuestas" && cuestionarioSel) {
      const fila: Record<string, string> = { correo: "ana@example.com" };
      (cuestionarioSel.preguntas ?? []).forEach((p) => {
        fila[p.texto] = "";
      });
      exportarExcel([{ nombre: "respuestas", filas: [fila] }], "plantilla-respuestas");
    } else if (dataset === "cuestionario") {
      exportarExcel(
        [
          {
            nombre: "forms",
            filas: [
              {
                "Marca temporal": "2025/06/19 10:30:00",
                "Dirección de correo electrónico": "ana@example.com",
                "Nombre(s)": "Ana",
                "Apellido Paterno": "López",
                "Apellido Materno": "Ruiz",
                "CURP": "LORA050101MQRPZN09",
                "Fecha de Nacimiento": "01/01/2005",
                "Estado de Nacimiento": "Quintana Roo",
                "Municipio": "Cozumel",
                "Estado Civil": "Soltero/a",
                "Género": "Femenino",
                "Número de Celular": "9870000000",
                "Grado de Estudios": "Preparatoria",
                "Escuela": "Prepa 1",
                "Me siento capaz de liderar un equipo": "4",
                "¿Habías participado antes?": "Sí",
                "Comentarios": "Me gustó mucho",
              },
            ],
          },
        ],
        "plantilla-forms-homologada"
      );
    }
  }

  const datasets: { key: Dataset; label: string; icon: React.ElementType }[] = [
    { key: "participantes", label: "Participantes", icon: Users },
    { key: "asistencias", label: "Asistencias", icon: CalendarCheck },
    { key: "respuestas", label: "Respuestas / Google Forms", icon: ClipboardList },
    { key: "cuestionario", label: "Cuestionario desde Forms", icon: FilePlus2 },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Upload size={20} className="text-brand-500" />
          Importar datos
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Carga histórica desde Excel (.xlsx) o CSV — incluye exportaciones de Google Forms
        </p>
      </div>

      {/* Selector de dataset */}
      <div className="flex flex-wrap gap-2 mb-5">
        {datasets.map((d) => (
          <button
            key={d.key}
            onClick={() => cambiarDataset(d.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              dataset === d.key
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <d.icon size={15} />
            {d.label}
          </button>
        ))}
      </div>

      {/* Selección de cuestionario (solo respuestas) */}
      {dataset === "respuestas" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Cuestionario destino *</label>
              <select
                value={cuestionarioSel?.id ?? ""}
                onChange={async (e) => {
                  const id = e.target.value;
                  if (!id) return setCuestionarioSel(null);
                  const det = await api.get<Cuestionario>(`/cuestionarios/${id}`);
                  setCuestionarioSel(det);
                  setMapa({});
                }}
                className={inputClass}
              >
                <option value="">— Seleccionar —</option>
                {cuestionarios.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} · {TIPO_CUESTIONARIO_LABEL[c.tipo]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Actividad (opcional)</label>
              <select
                value={actividadFija}
                onChange={(e) => setActividadFija(e.target.value)}
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
      )}

      {/* Datos del nuevo cuestionario (solo dataset cuestionario) */}
      {dataset === "cuestionario" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 space-y-4">
          <p className="text-xs text-gray-400">
            Se creará un cuestionario nuevo usando las columnas del archivo como preguntas, y se
            cargarán las respuestas de cada fila.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nombre del cuestionario *</label>
              <input
                value={cuestForm.nombre}
                onChange={(e) => setCuestForm({ ...cuestForm, nombre: e.target.value })}
                className={inputClass}
                placeholder="Ej. Encuesta de salida — Liderazgo"
              />
            </div>
            <div>
              <label className={labelClass}>Programa *</label>
              <select
                value={cuestForm.programa_id}
                onChange={(e) => setCuestForm({ ...cuestForm, programa_id: e.target.value })}
                className={inputClass}
              >
                <option value="">— Seleccionar —</option>
                {programas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Tipo *</label>
              <select
                value={cuestForm.tipo}
                onChange={(e) => setCuestForm({ ...cuestForm, tipo: e.target.value as TipoCuestionario })}
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
              <label className={labelClass}>Actividad (opcional)</label>
              <select
                value={actividadFija}
                onChange={(e) => setActividadFija(e.target.value)}
                className={inputClass}
              >
                <option value="">— Sin actividad —</option>
                {actividades.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">
                Si eliges actividad, se registra la asistencia de cada participante y podrás
                filtrarlos por programa/actividad.
              </p>
            </div>
          </div>
          <div>
            <label className={labelClass}>Descripción</label>
            <input
              value={cuestForm.descripcion}
              onChange={(e) => setCuestForm({ ...cuestForm, descripcion: e.target.value })}
              className={inputClass}
              placeholder="Opcional"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={crearParticipantes}
              onChange={(e) => setCrearParticipantes(e.target.checked)}
              className="rounded border-gray-300 text-brand-500 focus:ring-brand-200"
            />
            Crear automáticamente a los participantes que no existan (por correo)
          </label>
        </div>
      )}

      {/* Carga de archivo */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <span className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 hover:bg-brand-100 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
              <FileSpreadsheet size={16} />
              Elegir archivo
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onFile}
              className="hidden"
              disabled={dataset === "respuestas" && !cuestionarioSel}
            />
            {nombreArchivo && <span className="text-sm text-gray-500">{nombreArchivo}</span>}
          </label>
          <button
            onClick={descargarPlantilla}
            disabled={dataset === "respuestas" && !cuestionarioSel}
            className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-40"
          >
            <Download size={14} />
            Descargar plantilla
          </button>
        </div>
        {dataset === "respuestas" && !cuestionarioSel && (
          <p className="text-xs text-amber-600 mt-3">
            Selecciona primero el cuestionario destino para habilitar la carga.
          </p>
        )}
      </div>

      {/* Mapeo de columnas */}
      {archivo && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Mapeo de columnas</h2>

          {dataset === "participantes" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CAMPOS_PARTICIPANTE.map((campo) => (
                <div key={campo.key}>
                  <label className={labelClass}>
                    {campo.key}
                    {campo.requerido && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  <select
                    value={mapa[campo.key] ?? ""}
                    onChange={(e) => setMapa({ ...mapa, [campo.key]: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">— Ignorar —</option>
                    {archivo.columnas.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {dataset === "asistencias" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: "participante", label: "Participante (correo o nombre) *" },
                { key: "actividad", label: "Actividad (nombre) *" },
                { key: "estatus", label: "Estatus" },
              ].map((f) => (
                <div key={f.key}>
                  <label className={labelClass}>{f.label}</label>
                  <select
                    value={mapa[f.key] ?? ""}
                    onChange={(e) => setMapa({ ...mapa, [f.key]: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">— Ignorar —</option>
                    {archivo.columnas.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {dataset === "respuestas" && cuestionarioSel && (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Columna que identifica al participante (correo o nombre) *</label>
                <select
                  value={colParticipante}
                  onChange={(e) => setColParticipante(e.target.value)}
                  className={inputClass}
                >
                  <option value="">— Seleccionar —</option>
                  {archivo.columnas.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">
                Preguntas → columnas
              </p>
              {(cuestionarioSel.preguntas ?? []).map((p) => (
                <div key={p.id}>
                  <label className={labelClass}>{p.texto}</label>
                  <select
                    value={mapa[p.id] ?? ""}
                    onChange={(e) => setMapa({ ...mapa, [p.id]: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">— Ignorar —</option>
                    {archivo.columnas.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {dataset === "cuestionario" &&
            (() => {
              const demogCols = Object.keys(demogMap);
              const preguntaCols = archivo.columnas.filter(
                (c) => !demogMap[c] && colConfig[c]?.incluir
              );
              const conteo: Record<string, number> = {};
              for (const c of preguntaCols) {
                const t = colConfig[c].tipo;
                conteo[t] = (conteo[t] || 0) + 1;
              }
              const resumenTipos = Object.entries(conteo)
                .map(([t, n]) => `${n} ${TIPO_RESPUESTA_LABEL[t as TipoRespuesta]}`)
                .join(", ");

              return (
                <div className="space-y-3">
                  {/* Resumen de detección automática */}
                  <div className="flex items-start gap-2 bg-forest-50/60 border border-forest-100 rounded-xl px-3 py-2.5">
                    <Sparkles size={15} className="text-forest-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-600">
                      Se reconocieron <b>{demogCols.length} datos del participante</b> y{" "}
                      <b>{preguntaCols.length} preguntas</b>
                      {resumenTipos ? (
                        <>
                          {" "}
                          (<span className="text-gray-500">{resumenTipos}</span>)
                        </>
                      ) : null}
                      . La marca temporal se omite.
                    </p>
                  </div>

                  {!colParticipante && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      No se detectó la columna de correo. Selecciónala abajo en
                      &ldquo;Ajustar…&rdquo; para identificar a los participantes.
                    </p>
                  )}

                  {/* Ajustes (colapsable) */}
                  <button
                    type="button"
                    onClick={() => setMostrarTipos((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {mostrarTipos ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Ajustar datos, preguntas y tipos (opcional)
                  </button>

                  {mostrarTipos && (
                    <div className="space-y-4 pt-1">
                      {/* Identificador del participante */}
                      <div>
                        <label className={labelClass}>
                          Columna que identifica al participante (correo) *
                        </label>
                        <select
                          value={colParticipante}
                          onChange={(e) => setColParticipante(e.target.value)}
                          className={inputClass}
                        >
                          <option value="">— Seleccionar —</option>
                          {archivo.columnas.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Datos del participante reconocidos */}
                      {demogCols.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Datos del participante
                          </p>
                          <div className="space-y-1.5">
                            {demogCols.map((c) => (
                              <div
                                key={c}
                                className="flex items-center gap-3 p-2.5 rounded-xl border border-forest-100 bg-forest-50/40"
                              >
                                <span className="flex-1 text-sm text-gray-700 truncate" title={c}>
                                  {c}
                                </span>
                                <span className="text-[10px] font-semibold text-forest-600 bg-white border border-forest-100 rounded-full px-2 py-0.5">
                                  {demogMap[c]}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => demograficoAPregunta(c)}
                                  className="text-[10px] font-medium text-gray-400 hover:text-brand-600"
                                  title="Tratar como pregunta de la encuesta"
                                >
                                  Es pregunta
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Preguntas de la encuesta */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Preguntas de la encuesta
                        </p>
                        <div className="space-y-2">
                          {archivo.columnas
                            .filter((c) => !demogMap[c])
                            .map((c) => {
                              const cfg = colConfig[c] ?? {
                                incluir: false,
                                tipo: "texto" as TipoRespuesta,
                              };
                              return (
                                <div
                                  key={c}
                                  className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                                    cfg.incluir ? "border-brand-200 bg-brand-50/40" : "border-gray-100"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={cfg.incluir}
                                    onChange={(e) =>
                                      setColConfig({
                                        ...colConfig,
                                        [c]: { ...cfg, incluir: e.target.checked },
                                      })
                                    }
                                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-200 shrink-0"
                                  />
                                  <span className="flex-1 text-sm text-gray-700 truncate" title={c}>
                                    {c}
                                  </span>
                                  <select
                                    value={cfg.tipo}
                                    disabled={!cfg.incluir}
                                    onChange={(e) =>
                                      setColConfig({
                                        ...colConfig,
                                        [c]: { ...cfg, tipo: e.target.value as TipoRespuesta },
                                      })
                                    }
                                    className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-brand-400 disabled:opacity-40 shrink-0"
                                  >
                                    {TIPOS_RESPUESTA.map((t) => (
                                      <option key={t} value={t}>
                                        {TIPO_RESPUESTA_LABEL[t]}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          {/* Previsualización */}
          <div className="mt-5">
            <p className="text-xs text-gray-400 mb-2">
              Vista previa ({archivo.filas.length} filas en total, mostrando primeras 5)
            </p>
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {archivo.columnas.map((c) => (
                      <th key={c} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {archivo.filas.slice(0, 5).map((fila, i) => (
                    <tr key={i} className="border-t border-gray-50">
                      {archivo.columnas.map((c) => (
                        <td key={c} className="px-3 py-1.5 text-gray-600 whitespace-nowrap">
                          {fila[c]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end mt-5">
            <button
              onClick={importar}
              disabled={procesando}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Upload size={15} />
              {procesando
                ? progreso
                  ? `Importando… ${progreso.hecho}/${progreso.total}`
                  : "Importando…"
                : `Importar ${archivo.filas.length} filas`}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={18} className="text-forest-500" />
            <h2 className="text-sm font-semibold text-gray-700">
              {resultado.ok} registros importados
              {resultado.errores.length > 0 && ` · ${resultado.errores.length} con error`}
            </h2>
          </div>
          {resultado.detalle && (
            <p className="text-xs text-gray-500 mb-3">{resultado.detalle}</p>
          )}
          {resultado.errores.length > 0 && (
            <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
              {resultado.errores.map((e, i) => (
                <p
                  key={i}
                  className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5 flex items-center gap-2"
                >
                  <AlertTriangle size={12} className="shrink-0" />
                  Fila {e.fila}: {e.motivo}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
