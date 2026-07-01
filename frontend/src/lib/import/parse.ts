import * as XLSX from "xlsx";

export interface ArchivoParseado {
  columnas: string[];
  filas: Record<string, string>[];
}

/**
 * Lee un archivo .xlsx o .csv y devuelve columnas + filas como strings.
 * Toma la primera hoja del libro.
 */
export async function parsearArchivo(file: File): Promise<ArchivoParseado> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const primeraHoja = wb.SheetNames[0];
  if (!primeraHoja) return { columnas: [], filas: [] };

  const ws = wb.Sheets[primeraHoja];
  // defval "" para mantener columnas vacías; raw false para formatear fechas/números a texto
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: false,
  });

  const filas = json.map((r: Record<string, unknown>) => {
    const fila: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      fila[k.trim()] = v == null ? "" : String(v).trim();
    }
    return fila;
  });

  const columnas = filas.length ? Object.keys(filas[0]) : [];
  return { columnas, filas };
}

/** Normaliza un encabezado para comparaciones flexibles (sin acentos, minúsculas). */
// Rango de marcas diacríticas combinantes (U+0300–U+036F), sin caracteres literales.
const DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Intenta sugerir, para cada campo destino, la columna del archivo más parecida.
 * Devuelve un mapa campoDestino -> nombreColumna (o "" si no hay coincidencia).
 */
export function automapear(
  columnas: string[],
  campos: { key: string; alias: string[] }[]
): Record<string, string> {
  const norm = columnas.map((c) => ({ original: c, n: normalizar(c) }));
  const mapa: Record<string, string> = {};
  for (const campo of campos) {
    const objetivos = [campo.key, ...campo.alias].map(normalizar);
    const match = norm.find((c) => objetivos.some((o) => c.n === o || c.n.includes(o)));
    mapa[campo.key] = match?.original ?? "";
  }
  return mapa;
}
