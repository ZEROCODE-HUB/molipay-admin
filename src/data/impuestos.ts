export type Estatus = "Activo" | "Inactivo";

export type Tasa = {
  codigo: string;
  tasa: string;
  descripcion: string;
  estado: Estatus;
};

export type Impuesto = {
  id: number;
  nombre: string;
  descripcion: string;
  tipoImpuesto: "Porcentaje" | "Fijo" | "Otro";
  estado: Estatus;
  fechaCreacion: string;
  fechaActualizacion: string;
  tasas: Tasa[];
};

export const impuestosIniciales: Impuesto[] = [
  {
    id: 1,
    nombre: "Ganancias",
    descripcion: "Impuesto a las ganancias anual de la plataforma.",
    tipoImpuesto: "Porcentaje",
    estado: "Activo",
    fechaCreacion: "2026-01-12",
    fechaActualizacion: "2026-06-30",
    tasas: [
      {
        codigo: "GAN-001",
        tasa: "35%",
        descripcion: "Escala progresiva general",
        estado: "Activo",
      },
    ],
  },
  {
    id: 2,
    nombre: "Ingresos Brutos",
    descripcion: "Impuesto provincial sobre la comisión de Molly.",
    tipoImpuesto: "Porcentaje",
    estado: "Activo",
    fechaCreacion: "2026-01-12",
    fechaActualizacion: "2026-07-10",
    tasas: [
      { codigo: "IB-CABA", tasa: "4%", descripcion: "CABA", estado: "Activo" },
      { codigo: "IB-BA", tasa: "3.6%", descripcion: "Buenos Aires", estado: "Activo" },
    ],
  },
  {
    id: 3,
    nombre: "Débito/Crédito (Sellos)",
    descripcion: "Retención de sellos sobre ingresos y egresos del cliente.",
    tipoImpuesto: "Fijo",
    estado: "Activo",
    fechaCreacion: "2026-02-01",
    fechaActualizacion: "2026-07-20",
    tasas: [
      {
        codigo: "DC-001",
        tasa: "0,6%",
        descripcion: "Aplicable a ingresos y egresos",
        estado: "Activo",
      },
    ],
  },
];

export type AsignacionImpuesto = {
  usuario: string;
  nombreCompleto: string;
  impuesto: string;
  tipo: string;
  estado: Estatus;
  fechaAsignacion: string;
};

export const asignacionesIniciales: AsignacionImpuesto[] = [
  {
    usuario: "jperez",
    nombreCompleto: "Juan Pérez",
    impuesto: "Ingresos Brutos",
    tipo: "Porcentaje",
    estado: "Activo",
    fechaAsignacion: "2026-03-04",
  },
  {
    usuario: "mlopez",
    nombreCompleto: "María López",
    impuesto: "Ganancias",
    tipo: "Porcentaje",
    estado: "Activo",
    fechaAsignacion: "2026-03-09",
  },
  {
    usuario: "cgomez",
    nombreCompleto: "Carlos Gómez",
    impuesto: "Débito/Crédito (Sellos)",
    tipo: "Fijo",
    estado: "Activo",
    fechaAsignacion: "2026-04-12",
  },
  {
    usuario: "rdiaz",
    nombreCompleto: "Romina Díaz",
    impuesto: "Ingresos Brutos",
    tipo: "Porcentaje",
    estado: "Inactivo",
    fechaAsignacion: "2026-04-18",
  },
  {
    usuario: "fsilva",
    nombreCompleto: "Federico Silva",
    impuesto: "Ganancias",
    tipo: "Porcentaje",
    estado: "Activo",
    fechaAsignacion: "2026-05-02",
  },
  {
    usuario: "aaros",
    nombreCompleto: "Ana Ríos",
    impuesto: "Débito/Crédito (Sellos)",
    tipo: "Fijo",
    estado: "Activo",
    fechaAsignacion: "2026-05-15",
  },
  {
    usuario: "jtorres",
    nombreCompleto: "Joaquín Torres",
    impuesto: "Ingresos Brutos",
    tipo: "Porcentaje",
    estado: "Activo",
    fechaAsignacion: "2026-05-21",
  },
  {
    usuario: "lcastro",
    nombreCompleto: "Lucía Castro",
    impuesto: "Ganancias",
    tipo: "Porcentaje",
    estado: "Inactivo",
    fechaAsignacion: "2026-06-03",
  },
  {
    usuario: "pramos",
    nombreCompleto: "Pablo Ramos",
    impuesto: "Débito/Crédito (Sellos)",
    tipo: "Fijo",
    estado: "Activo",
    fechaAsignacion: "2026-06-11",
  },
  {
    usuario: "vduarte",
    nombreCompleto: "Valentina Duarte",
    impuesto: "Ingresos Brutos",
    tipo: "Porcentaje",
    estado: "Activo",
    fechaAsignacion: "2026-06-19",
  },
  {
    usuario: "mruiz",
    nombreCompleto: "Marta Ruiz",
    impuesto: "Ganancias",
    tipo: "Porcentaje",
    estado: "Activo",
    fechaAsignacion: "2026-06-25",
  },
  {
    usuario: "escobar",
    nombreCompleto: "Esteban Escobar",
    impuesto: "Ingresos Brutos",
    tipo: "Porcentaje",
    estado: "Activo",
    fechaAsignacion: "2026-07-01",
  },
  {
    usuario: "饰",
    nombreCompleto: "Sofía Núñez",
    impuesto: "Débito/Crédito (Sellos)",
    tipo: "Fijo",
    estado: "Inactivo",
    fechaAsignacion: "2026-07-08",
  },
  {
    usuario: "jcampos",
    nombreCompleto: "Julieta Campos",
    impuesto: "Ganancias",
    tipo: "Porcentaje",
    estado: "Activo",
    fechaAsignacion: "2026-07-14",
  },
];

export type PadronEstado = "Cargando" | "Procesando" | "Finalizado" | "Error";

export type Padron = {
  id: number;
  impuesto: string;
  nombre: string;
  archivo: string;
  estado: PadronEstado;
  progreso: number;
};

export const padronesIniciales: Padron[] = [
  {
    id: 1,
    impuesto: "Ingresos Brutos",
    nombre: "Padrón CABA Q2",
    archivo: "caba_q2.xlsx",
    estado: "Finalizado",
    progreso: 100,
  },
  {
    id: 2,
    impuesto: "Ganancias",
    nombre: "Padrón Ganancias 2026",
    archivo: "ganancias_2026.xlsx",
    estado: "Finalizado",
    progreso: 100,
  },
];

export type ReporteImpuesto = {
  id: number;
  periodo: string;
  tramo: string;
  fechaCreacion: string;
  presentado: boolean;
  pagado: boolean;
  totalMovimientos: number;
  totalMontos: number;
  totalRetenciones: number;
};

export const reportesIniciales: ReporteImpuesto[] = [
  {
    id: 1,
    periodo: "Junio 2026",
    tramo: "Quincena 2",
    fechaCreacion: "2026-07-02",
    presentado: true,
    pagado: true,
    totalMovimientos: 1840,
    totalMontos: 9420000,
    totalRetenciones: 412000,
  },
  {
    id: 2,
    periodo: "Junio 2026",
    tramo: "Quincena 1",
    fechaCreacion: "2026-06-18",
    presentado: true,
    pagado: false,
    totalMovimientos: 1720,
    totalMontos: 8800000,
    totalRetenciones: 388000,
  },
  {
    id: 3,
    periodo: "Mayo 2026",
    tramo: "Quincena 2",
    fechaCreacion: "2026-06-02",
    presentado: true,
    pagado: true,
    totalMovimientos: 1655,
    totalMontos: 8110000,
    totalRetenciones: 351000,
  },
  {
    id: 4,
    periodo: "Mayo 2026",
    tramo: "Quincena 1",
    fechaCreacion: "2026-05-18",
    presentado: false,
    pagado: false,
    totalMovimientos: 1590,
    totalMontos: 7700000,
    totalRetenciones: 332000,
  },
];

export type DireccionExcepcion = "Entrantes" | "Salientes" | "Ambos";

export type Excepcion = {
  id: number;
  usuario: string;
  cuit: string;
  direccion: DireccionExcepcion;
  motivo: string;
  vigenciaDesde: string;
  vigenciaHasta: string;
  estado: Estatus;
  fechaCreacion: string;
  autorizacion: string;
};

export const excepcionesIniciales: Excepcion[] = [
  {
    id: 1,
    usuario: "jperez",
    cuit: "20-12345678-9",
    direccion: "Ambos",
    motivo: "Convenio multilateral",
    vigenciaDesde: "2026-01-01",
    vigenciaHasta: "",
    estado: "Activo",
    fechaCreacion: "2026-01-05",
    autorizacion: "AUT-0001",
  },
  {
    id: 2,
    usuario: "cgomez",
    cuit: "27-87654321-0",
    direccion: "Entrantes",
    motivo: "Exento provisional",
    vigenciaDesde: "2026-03-10",
    vigenciaHasta: "2026-09-10",
    estado: "Activo",
    fechaCreacion: "2026-03-10",
    autorizacion: "AUT-0002",
  },
  {
    id: 3,
    usuario: "lcastro",
    cuit: "23-11223344-5",
    direccion: "Salientes",
    motivo: "Revisión fiscal",
    vigenciaDesde: "2026-05-20",
    vigenciaHasta: "",
    estado: "Inactivo",
    fechaCreacion: "2026-05-20",
    autorizacion: "AUT-0003",
  },
];
