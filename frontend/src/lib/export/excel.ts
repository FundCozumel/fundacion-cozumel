import * as XLSX from "xlsx";

export interface HojaExcel {
  nombre: string;
  filas: Record<string, unknown>[];
}

/**
 * Exporta una o varias hojas a un archivo .xlsx y dispara la descarga.
 */
export function exportarExcel(hojas: HojaExcel[], nombreArchivo: string) {
  const wb = XLSX.utils.book_new();
  for (const hoja of hojas) {
    const ws = XLSX.utils.json_to_sheet(hoja.filas);
    // Nombre de hoja: máximo 31 caracteres, sin caracteres inválidos
    const safe = hoja.nombre.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Hoja";
    XLSX.utils.book_append_sheet(wb, ws, safe);
  }
  XLSX.writeFile(wb, nombreArchivo.endsWith(".xlsx") ? nombreArchivo : `${nombreArchivo}.xlsx`);
}

/** Convierte un objeto {clave: valor} en filas etiqueta/valor para exportar. */
export function distribucionAFilas(
  dist: Record<string, number>,
  etiquetaCol = "Categoría",
  valorCol = "Cantidad"
): Record<string, unknown>[] {
  return Object.entries(dist).map(([k, v]) => ({ [etiquetaCol]: k, [valorCol]: v }));
}
