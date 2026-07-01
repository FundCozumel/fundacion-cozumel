# Plantilla homologada para Google Forms

Sistema de Autoevaluación · Fundación Comunitaria Cozumel, IAP

Guía para crear cualquier Google Form de manera que el sistema **reconozca automáticamente** los datos del participante al importar el CSV/Excel. Copia los títulos **tal cual** (el sistema también acepta variantes comunes, pero lo más seguro es usar estos).

---

## Antes de empezar (configuración del Form)

1. En el Form, ⚙️ **Configuración → Respuestas**, activa **"Recopilar direcciones de correo electrónico"**. Esto genera la columna *"Dirección de correo electrónico"* (clave para identificar al participante).
2. Para **Fecha de Nacimiento** usa el tipo de pregunta **Fecha** de Google Forms.
3. Marca como **obligatorias** las preguntas indicadas abajo.
4. El **bloque demográfico va primero**; las preguntas de la encuesta (Likert, etc.) van **después**.

---

## Bloque 1 — Datos del participante (homologado)

Pon estas preguntas en este orden. La columna "Tipo" es el tipo de pregunta en Google Forms.

| # | Título EXACTO de la pregunta | Tipo en Forms | Obligatoria | Opciones / formato |
|---|------------------------------|---------------|:-----------:|--------------------|
| 1 | *(correo automático)* | Recopilar correo (Configuración) | ✅ | — |
| 2 | **Nombre(s)** | Respuesta corta | ✅ | texto |
| 3 | **Apellido Paterno** | Respuesta corta | ✅ | texto |
| 4 | **Apellido Materno** | Respuesta corta | ✅ | texto |
| 5 | **CURP** | Respuesta corta | ⬜ | 18 caracteres |
| 6 | **Fecha de Nacimiento** | **Fecha** | ✅ | dd/mm/aaaa |
| 7 | **Estado de Nacimiento** | Desplegable | ✅ | (lista de 32 estados, abajo) |
| 8 | **Municipio** | Respuesta corta | ⬜ | texto |
| 9 | **Estado Civil** | Opción múltiple | ⬜ | Soltero/a · Casado/a · Unión libre · Divorciado/a · Viudo/a |
| 10 | **Género** | Opción múltiple | ✅ | Masculino · Femenino · Otro · Prefiero no decir |
| 11 | **Número de Celular** | Respuesta corta | ✅ | 10 dígitos |
| 12 | **Grado de Estudios** | Desplegable | ✅ | Secundaria · Preparatoria · Universidad · Posgrado · Otro |
| 13 | **Escuela** | Respuesta corta | ⬜ | texto |

> ⬜ = opcional en el Form; si viene, el sistema igual lo guarda.

### Valores para los desplegables

**Estado Civil (opción múltiple):**
Soltero/a · Casado/a · Unión libre · Divorciado/a · Viudo/a

**Género (opción múltiple):**
Masculino · Femenino · Otro · Prefiero no decir

**Grado de Estudios (desplegable):**
Secundaria · Preparatoria · Universidad · Posgrado · Otro

**Estado de Nacimiento (desplegable) — 32 estados:**
Aguascalientes, Baja California, Baja California Sur, Campeche, Chiapas, Chihuahua, Ciudad de México, Coahuila, Colima, Durango, Estado de México, Guanajuato, Guerrero, Hidalgo, Jalisco, Michoacán, Morelos, Nayarit, Nuevo León, Oaxaca, Puebla, Querétaro, Quintana Roo, San Luis Potosí, Sinaloa, Sonora, Tabasco, Tamaulipas, Tlaxcala, Veracruz, Yucatán, Zacatecas

---

## Bloque 2 — Preguntas de la encuesta

Después del bloque demográfico, agrega las preguntas propias de la encuesta. El sistema **detecta el tipo automáticamente** según las respuestas:

| Tipo de pregunta que quieres medir | Cómo hacerla en Forms | El sistema la detecta como |
|------------------------------------|-----------------------|----------------------------|
| Escala de acuerdo (1 a 5) | Escala lineal **1–5** | Likert (gráfica de distribución + promedio) |
| Sí / No | Opción múltiple: **Sí**, **No** | Sí/No |
| Selección de opciones | Opción múltiple / Desplegable | Opción múltiple (distribución) |
| Número | Respuesta corta (numérica) | Número (promedio, mín, máx) |
| Texto abierto | Párrafo / Respuesta corta | Texto (conteo) |
| Fecha | Fecha | Fecha |

> Para Likert, usa **Escala lineal de 1 a 5** en Forms; opcionalmente etiqueta 1 = "Totalmente en desacuerdo" y 5 = "Totalmente de acuerdo".

---

## Al importar (recordatorio)

1. En el sistema: **Importar → Cuestionario desde Forms**.
2. Llena nombre del cuestionario, programa, tipo y (opcional) actividad.
3. Sube el CSV/Excel exportado del Form (Respuestas → ⋮ → Descargar como .csv, o vía Google Sheets).
4. El sistema reconoce los datos del participante, crea/actualiza a cada persona por su correo, calcula la edad, y carga las respuestas. Las gráficas demográficas (género, edad, estado civil, grado de estudios, estado de nacimiento) quedan disponibles por programa.

> Tip: puedes descargar una **plantilla de ejemplo** desde el botón "Descargar plantilla" en esa misma pantalla, con todas las columnas ya nombradas.
