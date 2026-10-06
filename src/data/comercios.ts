import { metodosPagoIniciales, type MetodoPago } from "./metodos-pago";
import type { TipoPersona } from "./clientes";

export type EstadoGeneral =
  "Activado" | "Desactivado" | "Pendiente de aprobación" | "Rechazado" | "Suspendido";

export type NivelComercio =
  "Pequeño" | "Mediano" | "Grande" | "Premium" | "Estándar" | "Básico" | "Enterprise";

export type PuntoVenta = {
  nombre: string;
  estado: "Activado" | "Desactivado";
  fechaCreacion: string;
};

export type LinkPagoEstado = "Activado" | "Pendiente de aprobación" | "Suspendido" | "No asociado";

export type Comercio = {
  id: number;
  /** Identificador interno del cliente dueño del comercio (LPF/LPJ + CUIT, sin guiones). */
  legajo: string;
  tipoPersona: TipoPersona;
  cuit: string;
  usuario: string;
  nombre: string;
  categoria: string;
  descripcionCategoria: string;
  nivel: NivelComercio;
  estado: EstadoGeneral;
  fechaRegistro: string;
  horaRegistro: string;
  pctHabilitado: boolean;
  pctPuntosDeVenta: PuntoVenta[];
  linkPagoHabilitado: boolean;
  linkPagoEstado: LinkPagoEstado;
  linkPagoMetodos: MetodoPago[];
};

const metodosPorId = (ids: number[]): MetodoPago[] =>
  ids
    .map((id) => metodosPagoIniciales.find((m) => m.id === id))
    .filter((m): m is MetodoPago => Boolean(m));

export const comerciosIniciales: Comercio[] = [
  {
    id: 1,
    legajo: "LPF-27234567890",
    tipoPersona: "fisica",
    cuit: "27-23456789-0",
    usuario: "maria.lopez@email.com",
    nombre: "Vivero Centro",
    categoria: "780",
    descripcionCategoria: "Paisajismo y cultura",
    nivel: "Pequeño",
    estado: "Activado",
    fechaRegistro: "14/01/2025",
    horaRegistro: "09:15",
    pctHabilitado: true,
    pctPuntosDeVenta: [
      { nombre: "Vivero Centro", estado: "Activado", fechaCreacion: "14/01/2025" },
      { nombre: "Vivero Norte", estado: "Desactivado", fechaCreacion: "15/01/2025" },
      { nombre: "Sucursal Parque", estado: "Activado", fechaCreacion: "20/01/2025" },
      { nombre: "Local Mercado Central", estado: "Desactivado", fechaCreacion: "02/02/2025" },
    ],
    linkPagoHabilitado: true,
    linkPagoEstado: "Activado",
    linkPagoMetodos: metodosPorId([1, 4, 7]),
  },
  {
    id: 2,
    legajo: "LPF-20123456789",
    tipoPersona: "fisica",
    cuit: "20-12345678-9",
    usuario: "juan.perez@email.com",
    nombre: "Limpiezas Sur",
    categoria: "763",
    descripcionCategoria: "Limpieza y desinfección",
    nivel: "Mediano",
    estado: "Suspendido",
    fechaRegistro: "13/01/2025",
    horaRegistro: "08:30",
    pctHabilitado: true,
    pctPuntosDeVenta: [
      { nombre: "Limpiezas Sur", estado: "Desactivado", fechaCreacion: "13/01/2025" },
    ],
    linkPagoHabilitado: true,
    linkPagoEstado: "Pendiente de aprobación",
    linkPagoMetodos: metodosPorId([2, 5]),
  },
  {
    id: 3,
    legajo: "LPJ-30678901234",
    tipoPersona: "juridica",
    cuit: "30-67890123-4",
    usuario: "empresa.srl@email.com",
    nombre: "Bar Central",
    categoria: "742",
    descripcionCategoria: "Restaurantes y bares",
    nivel: "Grande",
    estado: "Activado",
    fechaRegistro: "12/01/2025",
    horaRegistro: "11:00",
    pctHabilitado: true,
    pctPuntosDeVenta: [
      { nombre: "Bar Central", estado: "Activado", fechaCreacion: "12/01/2025" },
      { nombre: "Parrilla del Este", estado: "Activado", fechaCreacion: "18/01/2025" },
      { nombre: "Food Truck Oeste", estado: "Desactivado", fechaCreacion: "25/01/2025" },
      { nombre: "Terraza Costanera", estado: "Activado", fechaCreacion: "30/01/2025" },
      { nombre: "Local Aeropuerto", estado: "Desactivado", fechaCreacion: "05/02/2025" },
    ],
    linkPagoHabilitado: true,
    linkPagoEstado: "Activado",
    linkPagoMetodos: metodosPorId([1, 2, 4, 5, 7, 8]),
  },
  {
    id: 4,
    legajo: "LPJ-30789012345",
    tipoPersona: "juridica",
    cuit: "30-78901234-5",
    usuario: "consorcio@email.com",
    nombre: "Mensajería Express",
    categoria: "4829",
    descripcionCategoria: "Servicios postales y mensajería",
    nivel: "Premium",
    estado: "Pendiente de aprobación",
    fechaRegistro: "10/01/2025",
    horaRegistro: "17:45",
    pctHabilitado: true,
    pctPuntosDeVenta: [
      { nombre: "Mensajería Express", estado: "Activado", fechaCreacion: "10/01/2025" },
      { nombre: "Sucursal Norte", estado: "Desactivado", fechaCreacion: "22/01/2025" },
      { nombre: "Centro de distribución", estado: "Activado", fechaCreacion: "01/02/2025" },
    ],
    linkPagoHabilitado: true,
    linkPagoEstado: "Activado",
    linkPagoMetodos: metodosPorId([4, 5]),
  },
  {
    id: 5,
    legajo: "LPF-20334455667",
    tipoPersona: "fisica",
    cuit: "20-33445566-7",
    usuario: "minimarket@email.com",
    nombre: "Minimarket del barrio",
    categoria: "5411",
    descripcionCategoria: "Supermercados y almacenes",
    nivel: "Estándar",
    estado: "Rechazado",
    fechaRegistro: "09/01/2025",
    horaRegistro: "14:20",
    pctHabilitado: true,
    pctPuntosDeVenta: [],
    linkPagoHabilitado: true,
    linkPagoEstado: "Pendiente de aprobación",
    linkPagoMetodos: metodosPorId([1, 4]),
  },
  {
    id: 6,
    legajo: "LPF-27400012345",
    tipoPersona: "fisica",
    cuit: "27-40001234-5",
    usuario: "electro@email.com",
    nombre: "Electro Hogar",
    categoria: "5732",
    descripcionCategoria: "Electrodomésticos y hogar",
    nivel: "Básico",
    estado: "Activado",
    fechaRegistro: "08/01/2025",
    horaRegistro: "10:10",
    pctHabilitado: true,
    pctPuntosDeVenta: [
      { nombre: "Electro Hogar", estado: "Activado", fechaCreacion: "08/01/2025" },
    ],
    linkPagoHabilitado: true,
    linkPagoEstado: "Activado",
    linkPagoMetodos: metodosPorId([1, 7]),
  },
  {
    id: 7,
    legajo: "LPF-20500056789",
    tipoPersona: "fisica",
    cuit: "20-50005678-9",
    usuario: "gimnasio.fit@email.com",
    nombre: "Gym Fit",
    categoria: "7997",
    descripcionCategoria: "Clubes, gimnasios y deportes",
    nivel: "Pequeño",
    estado: "Desactivado",
    fechaRegistro: "07/01/2025",
    horaRegistro: "09:00",
    pctHabilitado: true,
    pctPuntosDeVenta: [
      { nombre: "Gym Fit", estado: "Activado", fechaCreacion: "07/01/2025" },
      { nombre: "CrossFit Centro", estado: "Desactivado", fechaCreacion: "12/01/2025" },
      { nombre: "Gym Barrio Norte", estado: "Activado", fechaCreacion: "28/01/2025" },
      { nombre: "Box Zona Sur", estado: "Desactivado", fechaCreacion: "03/02/2025" },
      { nombre: "Entrenamiento Este", estado: "Activado", fechaCreacion: "06/02/2025" },
    ],
    linkPagoHabilitado: true,
    linkPagoEstado: "Pendiente de aprobación",
    linkPagoMetodos: metodosPorId([2, 3, 6]),
  },
  {
    id: 8,
    legajo: "LPJ-30890123456",
    tipoPersona: "juridica",
    cuit: "30-89012345-6",
    usuario: "clinica.sur@email.com",
    nombre: "Consultorio Central",
    categoria: "8071",
    descripcionCategoria: "Servicios médicos y odontológicos",
    nivel: "Enterprise",
    estado: "Activado",
    fechaRegistro: "06/01/2025",
    horaRegistro: "16:30",
    pctHabilitado: true,
    pctPuntosDeVenta: [
      { nombre: "Consultorio Central", estado: "Activado", fechaCreacion: "06/01/2025" },
      { nombre: "Sucursal Los Olivos", estado: "Desactivado", fechaCreacion: "11/01/2025" },
      { nombre: "Sucursal Roca", estado: "Activado", fechaCreacion: "19/01/2025" },
      { nombre: "Diagnóstico por imágenes", estado: "Activado", fechaCreacion: "27/01/2025" },
      { nombre: "Laboratorio Central", estado: "Desactivado", fechaCreacion: "02/02/2025" },
      { nombre: "Consultorio Oeste", estado: "Activado", fechaCreacion: "04/02/2025" },
    ],
    linkPagoHabilitado: true,
    linkPagoEstado: "Activado",
    linkPagoMetodos: metodosPorId([1, 2, 4, 5, 7]),
  },
  {
    id: 9,
    legajo: "LPJ-30901234567",
    tipoPersona: "juridica",
    cuit: "30-90123456-7",
    usuario: "burgers@email.com",
    nombre: "Burgers Centro",
    categoria: "5814",
    descripcionCategoria: "Comida rápida",
    nivel: "Mediano",
    estado: "Pendiente de aprobación",
    fechaRegistro: "05/01/2025",
    horaRegistro: "12:15",
    pctHabilitado: true,
    pctPuntosDeVenta: [
      { nombre: "Burgers Centro", estado: "Activado", fechaCreacion: "05/01/2025" },
    ],
    linkPagoHabilitado: false,
    linkPagoEstado: "No asociado",
    linkPagoMetodos: [],
  },
  {
    id: 10,
    legajo: "LPJ-30012345678",
    tipoPersona: "juridica",
    cuit: "30-01234567-8",
    usuario: "software.digital@email.com",
    nombre: "Software Digital",
    categoria: "5734",
    descripcionCategoria: "Software y productos digitales",
    nivel: "Estándar",
    estado: "Activado",
    fechaRegistro: "04/01/2025",
    horaRegistro: "18:00",
    pctHabilitado: true,
    pctPuntosDeVenta: [],
    linkPagoHabilitado: false,
    linkPagoEstado: "No asociado",
    linkPagoMetodos: [],
  },
];
