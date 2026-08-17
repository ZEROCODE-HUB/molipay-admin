export type EstadoGeneral =
  | "Activado"
  | "Desactivado"
  | "Pendiente de aprobación"
  | "Rechazado"
  | "Suspendido";

export type NivelComercio =
  | "Pequeño"
  | "Mediano"
  | "Grande"
  | "Premium"
  | "Estándar"
  | "Básico"
  | "Enterprise";

export type PuntoVenta = {
  nombre: string;
  estado: "Activado" | "Desactivado";
  fechaCreacion: string;
};

export type LinkPagoEstado = "Activado" | "Pendiente de aprobación" | "Suspendido" | "No asociado";

export type Comercio = {
  id: number;
  legajo: string;
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
};

export const comerciosIniciales: Comercio[] = [
  {
    id: 1,
    legajo: "COM-1001",
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
  },
  {
    id: 2,
    legajo: "COM-1002",
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
  },
  {
    id: 3,
    legajo: "COM-1003",
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
  },
  {
    id: 4,
    legajo: "COM-1004",
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
  },
  {
    id: 5,
    legajo: "COM-1005",
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
  },
  {
    id: 6,
    legajo: "COM-1006",
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
  },
  {
    id: 7,
    legajo: "COM-1007",
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
  },
  {
    id: 8,
    legajo: "COM-1008",
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
  },
  {
    id: 9,
    legajo: "COM-1009",
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
  },
  {
    id: 10,
    legajo: "COM-1010",
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
  },
];