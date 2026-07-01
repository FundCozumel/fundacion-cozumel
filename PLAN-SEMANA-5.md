# Plan — Semana 5: Frontend Parte 2

Sistema de Autoevaluación · Fundación Comunitaria Cozumel, IAP

## Objetivos de la semana

| # | Entregable | Estado meta |
|---|------------|-------------|
| 1 | Módulo de captura de encuestas (Likert y demás tipos) | Funcional end-to-end |
| 2 | Dashboard con gráficas (Recharts) | Dashboard visual completo |
| 3 | Filtros por actividad, fecha y tipo | Integrados al dashboard |
| 4 | Importación de datos desde Excel/CSV | Datos históricos cargables |
| 5 | Exportación de reportes a PDF y Excel | Reportes descargables |

---

## Análisis del estado actual

**Ya construido (reutilizable):**
- Backend `metricas.py`: `/metricas/resumen`, `/metricas/participantes`, `/metricas/asistencia`, `/metricas/cuestionarios/{id}/resultados` (agrega Likert/opción/número por pregunta — **lógica pesada ya hecha**).
- Backend `respuestas.py`: `POST /respuestas` (inserción atómica de un set de respuestas) y `GET /respuestas`.
- Backend `cuestionarios.py`: CRUD completo de cuestionarios, preguntas y opciones.
- Frontend: patrón establecido de CRUD con Supabase directo, componente `Modal`, estilos `inputClass`/`labelClass`, paleta `brand-*`/`forest-*`, íconos `lucide-react`.

**Brechas a resolver:**
1. El frontend no consume el backend (no hay cliente HTTP ni uso de `NEXT_PUBLIC_API_URL`).
2. No existe página `/dashboard/cuestionarios` (el Sidebar ya la enlaza). Sin cuestionarios no hay captura ni gráficas.
3. Sin librerías: Recharts, parser Excel/CSV (`xlsx`), exportación PDF (`jspdf` + `jspdf-autotable`).
4. `/metricas/*` no filtra por fecha ni por tipo de cuestionario.

---

## Decisiones técnicas (recomendadas)

1. **Alimentación de gráficas → cliente API que consume el backend.**
   Crear `frontend/src/lib/api.ts` que adjunta el JWT de Supabase y llama a `/metricas/*`. Reutiliza la agregación ya hecha y la mantiene del lado servidor. Las gráficas simples (participantes por sexo/edad) pueden ir por Supabase directo si se prefiere, pero la de resultados de cuestionario debe usar el backend.

2. **Captura → `POST /respuestas` vía el mismo `lib/api.ts`.**
   El render dinámico del formulario se hace en cliente; el envío usa el endpoint atómico existente.

3. **Excel/CSV → `xlsx` (SheetJS).** Lee `.xlsx` y `.csv` con una sola librería. Importación con asistente: subir → parsear → previsualizar/mapear → validar → insertar por lotes con Supabase.

4. **Exportación → `xlsx` (Excel) + `jspdf` con `jspdf-autotable` (PDF).** Ligero, 100% cliente, sin servidor de render.

**Dependencias a instalar (frontend):**
```bash
cd frontend
npm install recharts xlsx jspdf jspdf-autotable
```

**Prerequisito bloqueante (DECISIÓN TOMADA):** se construirá la **página de cuestionarios** (`/dashboard/cuestionarios`) con crear cuestionario + agregar preguntas/opciones, usando el CRUD de backend ya existente. Habilita pruebas reales y completa el enlace del Sidebar.

**Google Forms (DECISIÓN TOMADA — Nivel 1 + 2):**
- **Nivel 1:** la captura de encuestas se hace dentro del sistema (entregable 2); los datos entran directo a la tabla `respuestas` y alimentan los dashboards.
- **Nivel 2:** se admite distribuir cuestionarios por Google Forms en campo y reincorporar las respuestas vía el **importador CSV** (entregable 4), aceptando el formato de exportación de Google Forms. No requiere OAuth ni sincronización en vivo.
- **Fuera de alcance:** integración con la Google Forms API (creación automática de formularios y sync de respuestas en vivo). Queda como mejora futura por el costo de OAuth + pipeline de sincronización.

---

## Plan por entregable

### 1. Cliente API + página de cuestionarios (prerequisito)
**Archivos:** `frontend/src/lib/api.ts` (nuevo), `frontend/src/app/dashboard/cuestionarios/page.tsx` (nuevo).
- `api.ts`: helper `apiFetch(path, options)` que obtiene `session.access_token` del cliente Supabase y lo pone en `Authorization: Bearer`, con base `NEXT_PUBLIC_API_URL`.
- Página cuestionarios: listar/crear cuestionario (programa, tipo, nombre); dentro, agregar preguntas (tipo_respuesta) y opciones (para `likert_1_5` precargar 1–5).
- Tipos nuevos en `frontend/src/types/index.ts`: `Cuestionario`, `Pregunta`, `OpcionRespuesta`.

### 2. Módulo de captura de encuestas (Likert)
**Archivos:** `frontend/src/app/dashboard/captura/page.tsx` (nuevo), componentes en `frontend/src/components/captura/`.
- Selección: cuestionario activo → participante → actividad (opcional).
- Render dinámico por `tipo_respuesta`:
  - `texto` → textarea; `numero` → input number; `fecha` → date.
  - `opcion_multiple` / `si_no` → radios desde `opciones_respuesta`.
  - `likert_1_5` → escala 1–5 (botones/escala visual; etiquetas de opciones).
- Validación de preguntas `obligatoria`.
- Envío: arma `RespuestasBulk` (`cuestionario_id`, `participante_id`, `actividad_id?`, `respuestas[]`) y hace `POST /respuestas` con `lib/api.ts`.
- Estados: guardando, éxito (toast/confirmación), error.

### 3. Dashboard con gráficas (Recharts) + filtros
**Archivos:** `frontend/src/app/dashboard/page.tsx` (ampliar), `frontend/src/components/dashboard/charts/*` (nuevos), `frontend/src/components/dashboard/FiltrosDashboard.tsx`.
- Convertir la sección de gráficas a un Client Component (Recharts requiere cliente) que lee de `/metricas/*`.
- Gráficas:
  - Participantes por sexo → PieChart.
  - Participantes por grupo de edad → BarChart.
  - Tasa de asistencia / por estatus → BarChart o donut.
  - Resultados de cuestionario (Likert) → BarChart de distribución por pregunta (selector de cuestionario).
  - (Opcional) Comparativa pre/post.
- **Filtros (entregable 3):** programa, actividad, rango de fechas, tipo de cuestionario. Programa/actividad ya soportados en backend; **extender `metricas.py`** para aceptar `fecha_inicio`/`fecha_fin` y `tipo`. Los filtros recargan las gráficas.
- Wrapper de estilo coherente: tarjetas `bg-white rounded-2xl border border-gray-100`.

### 4. Importación de datos Excel/CSV
**Archivos:** `frontend/src/app/dashboard/importar/page.tsx` (nuevo), `frontend/src/lib/import/*`.
- Alcance (DECISIÓN TOMADA): **participantes**, **asistencias** y **respuestas de encuestas** históricas.
- Flujo común: subir archivo → `xlsx` parsea a JSON → previsualización en tabla → mapeo de columnas a campos → validación → inserción por lotes, reportando filas OK/errores.
- **Participantes**: validar `sexo` permitido, `edad` 0–120, duplicados por correo.
- **Asistencias**: resolver `participante_id` + `actividad_id` (por nombre/identificador del archivo), validar `estatus` permitido y el índice único (participante, actividad).
- **Respuestas** (el más complejo): el archivo debe mapear a `cuestionario` + `participante` + `pregunta` + valor/opción; resolver IDs por texto y, para `likert_1_5`/`opcion_multiple`/`si_no`, mapear la etiqueta a `opcion_id`. Enviar por lotes vía `POST /respuestas` por participante para mantener atomicidad. Conviene una plantilla por tipo de pregunta.
- **Compatibilidad con Google Forms (Nivel 2):** el importador de respuestas debe aceptar el CSV que exporta Google Forms (formato "ancho": una fila por respondente, una columna por pregunta). Soportar mapeo de columnas para reconciliar los encabezados de Google con las preguntas del cuestionario. Así se habilita el flujo: distribuir en campo con Google Forms → exportar CSV → importar al sistema, sin necesidad de la API de Google.
- Plantillas descargables (`.xlsx`) con encabezados esperados, una por dataset.
- Agregar item "Importar" al `Sidebar`.

### 5. Exportación de reportes (PDF + Excel)
**Archivos:** `frontend/src/lib/export/excel.ts`, `frontend/src/lib/export/pdf.ts`, botones en dashboard y en resultados de cuestionario.
- Excel (`xlsx`): exportar datasets (participantes, asistencias, resultados de cuestionario, métricas del dashboard) a `.xlsx` multi-hoja.
- PDF (`jspdf` + `jspdf-autotable`): reporte con encabezado (logo/título), tablas de métricas y resumen; respetando los filtros activos.
- Botones "Exportar Excel" / "Exportar PDF" reutilizables en dashboard y vista de resultados.

---

## Cronograma sugerido (5 días)

| Día | Foco |
|-----|------|
| 1 | `lib/api.ts`, tipos, página de cuestionarios (prerequisito) + seed de prueba |
| 2 | Módulo de captura de encuestas (render dinámico + Likert + envío) |
| 3 | Dashboard con gráficas Recharts + extender `metricas.py` con filtros |
| 4 | Filtros integrados al dashboard + importación de participantes y asistencias |
| 5 | Importación de respuestas (mapeo pregunta/opción) + exportación PDF/Excel + pruebas end-to-end |

---

## Riesgos y notas

- **Prerequisito de cuestionarios** (sección 1) es bloqueante para captura y para la gráfica de resultados — atacar primero.
- **CORS/JWT**: el backend solo acepta `FRONTEND_URL`; verificar que `lib/api.ts` mande el `Bearer` correcto y que las RLS permitan las lecturas de métricas al rol del usuario.
- **Filtros por fecha/tipo** requieren tocar el backend (`metricas.py`); no son solo frontend.
- **Importación**: validar contra constraints de la BD (`participantes_sexo_check`, `edad_check`, índice único de asistencias) para evitar fallos de inserción.
- **Recharts** debe renderizarse en Client Components; mantener la página `dashboard` como server y delegar gráficas a un hijo cliente.
- Páginas `programas` y `sedes` enlazadas en el Sidebar tampoco existen aún (fuera de alcance de Semana 5, pero conviene anotarlo).

## Criterios de aceptación

- [ ] Se puede capturar un cuestionario completo (incluyendo Likert 1–5) y queda persistido vía `POST /respuestas`.
- [ ] Dashboard muestra ≥4 gráficas con datos reales.
- [ ] Filtros por actividad, fecha y tipo recalculan las gráficas.
- [ ] Se importa un archivo Excel/CSV de participantes/asistencias con previsualización y reporte de errores.
- [ ] Se exporta un reporte a PDF y a Excel respetando filtros.
