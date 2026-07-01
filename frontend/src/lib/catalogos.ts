// Catálogos compartidos para datos demográficos de participantes.

export const ESTADOS_MEXICO = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de México",
  "Coahuila",
  "Colima",
  "Durango",
  "Estado de México",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas",
];

export const GRADOS_ESTUDIO = [
  "Secundaria",
  "Preparatoria",
  "Universidad",
  "Posgrado",
  "Otro",
];

export const ESTADOS_CIVILES = [
  "Soltero/a",
  "Casado/a",
  "Unión libre",
  "Divorciado/a",
  "Viudo/a",
];

// Campos demográficos del participante y los alias de columna (Forms) que los identifican.
// El importador normaliza el título de cada columna y lo compara contra estos alias.
export interface CampoDemografico {
  campo: string; // columna en la tabla participantes
  alias: string[]; // variantes de título aceptadas en el Forms
}

export const CAMPOS_DEMOGRAFICOS: CampoDemografico[] = [
  { campo: "correo", alias: ["correo", "email", "correo electronico", "direccion de correo electronico"] },
  { campo: "nombre", alias: ["nombre(s)", "nombres", "nombre s", "primer nombre"] },
  { campo: "apellido_paterno", alias: ["apellido paterno", "primer apellido"] },
  { campo: "apellido_materno", alias: ["apellido materno", "segundo apellido"] },
  { campo: "curp", alias: ["curp"] },
  { campo: "fecha_nacimiento", alias: ["fecha de nacimiento", "fecha nacimiento", "nacimiento"] },
  { campo: "estado_nacimiento", alias: ["estado de nacimiento", "estado nacimiento", "entidad de nacimiento"] },
  { campo: "municipio", alias: ["municipio"] },
  { campo: "estado_civil", alias: ["estado civil"] },
  { campo: "sexo", alias: ["genero", "sexo"] },
  { campo: "celular", alias: ["numero de celular", "celular", "telefono", "movil", "numero celular"] },
  { campo: "grado_estudios", alias: ["grado de estudios", "escolaridad", "nivel de estudios", "grado de estudio"] },
  { campo: "escuela", alias: ["escuela", "institucion", "colegio"] },
];
