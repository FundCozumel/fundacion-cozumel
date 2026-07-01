import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface ImagenPDF {
  dataUrl: string;
  width: number; // ancho original en px
  height: number; // alto original en px
}

export interface SeccionPDF {
  titulo: string;
  columnas?: string[];
  filas?: (string | number)[][];
  imagen?: ImagenPDF; // si viene, se dibuja la imagen en lugar de una tabla
}

interface OpcionesPDF {
  titulo: string;
  subtitulo?: string;
  secciones: SeccionPDF[];
  nombreArchivo: string;
}

const BRAND: [number, number, number] = [13, 148, 136]; // teal-ish (brand)

/** Lee la posición Y final de la última tabla dibujada por el plugin. */
function finalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0;
}

/**
 * Genera un reporte PDF con encabezado y una sección por bloque (tabla o gráfica),
 * con salto de página automático, y dispara la descarga.
 */
export function exportarPDF({ titulo, subtitulo, secciones, nombreArchivo }: OpcionesPDF) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  doc.setFontSize(16);
  doc.setTextColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.text("Fundación Comunitaria Cozumel, IAP", margin, y);
  y += 22;

  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text(titulo, margin, y);
  y += 16;

  doc.setFontSize(9);
  doc.setTextColor(130, 130, 130);
  const fecha = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());
  doc.text(`Generado: ${fecha}`, margin, y);
  if (subtitulo) {
    y += 12;
    // El subtítulo (filtros) puede ser largo: se parte en varias líneas.
    const lineas = doc.splitTextToSize(subtitulo, contentWidth);
    doc.text(lineas, margin, y);
    y += (Array.isArray(lineas) ? lineas.length - 1 : 0) * 11;
  }
  y += 14;

  function asegurarEspacio(alto: number) {
    if (y + alto > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  for (const seccion of secciones) {
    if (seccion.imagen) {
      // Escalar la imagen para que quepa en el ancho de contenido.
      const escala = contentWidth / seccion.imagen.width;
      const w = contentWidth;
      const h = seccion.imagen.height * escala;

      asegurarEspacio(h + 24);

      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text(seccion.titulo, margin, y + 4);
      doc.setFont("helvetica", "normal");
      y += 12;

      doc.addImage(seccion.imagen.dataUrl, "PNG", margin, y, w, h);
      y += h + 16;
      continue;
    }

    // Sección de tabla
    asegurarEspacio(60);
    autoTable(doc, {
      startY: y + 6,
      head: [[seccion.titulo]],
      body: [],
      theme: "plain",
      headStyles: { fontStyle: "bold", textColor: 40, fontSize: 11 },
      margin: { left: margin, right: margin },
    });
    y = finalY(doc);

    autoTable(doc, {
      startY: y + 2,
      head: [seccion.columnas ?? []],
      body: seccion.filas ?? [],
      theme: "striped",
      headStyles: { fillColor: BRAND, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: 50 },
      margin: { left: margin, right: margin },
    });
    y = finalY(doc) + 10;
  }

  doc.save(nombreArchivo.endsWith(".pdf") ? nombreArchivo : `${nombreArchivo}.pdf`);
}

/**
 * Convierte un elemento <svg> (p. ej. una gráfica de Recharts) a una imagen PNG
 * usando el canvas nativo del navegador. No requiere dependencias externas.
 */
export function svgAPng(svg: SVGSVGElement, escala = 2): Promise<ImagenPDF> {
  const rect = svg.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const data = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w * escala;
      canvas.height = h * escala;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return reject(new Error("No se pudo crear el contexto de canvas"));
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(escala, escala);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: canvas.toDataURL("image/png"), width: w, height: h });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo renderizar el SVG"));
    };
    img.src = url;
  });
}

/**
 * Captura todas las gráficas dentro de un contenedor. Cada gráfica debe estar
 * envuelta en un elemento con clase `.chart-capture` y atributo `data-chart-title`.
 */
export async function capturarGraficas(contenedor: HTMLElement): Promise<SeccionPDF[]> {
  const tarjetas = Array.from(contenedor.querySelectorAll<HTMLElement>(".chart-capture"));
  const secciones: SeccionPDF[] = [];
  for (const tarjeta of tarjetas) {
    const svg = tarjeta.querySelector("svg");
    if (!svg) continue;
    try {
      const imagen = await svgAPng(svg as SVGSVGElement);
      secciones.push({
        titulo: tarjeta.dataset.chartTitle ?? "Gráfica",
        imagen,
      });
    } catch {
      /* si una gráfica falla, se omite y continúa */
    }
  }
  return secciones;
}
