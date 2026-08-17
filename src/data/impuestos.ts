export type Estatus = "Activo" | "Inactivo";

export type Alicuota = {
  codigo: string;
  tasa: number;
  descripcion: string;
  estado: "Activa" | "Inactiva";
};

export type Impuesto = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipoImpuesto: "Porcentaje" | "Fijo" | "Otro";
  monto: number | null;
  estado: Estatus;
  fechaCreacion: string;
  fechaActualizacion: string;
  alicuotas: Alicuota[];
};

export const impuestosIniciales: Impuesto[] = [
  {
    id: 1,
    codigo: "GAN",
    nombre: "Ganancias",
    descripcion: "Impuesto a las ganancias anual de la plataforma.",
    tipoImpuesto: "Porcentaje",
    monto: 35,
    estado: "Activo",
    fechaCreacion: "2026-01-12",
    fechaActualizacion: "2026-06-30",
    alicuotas: [
      {
        codigo: "GAN_35",
        tasa: 35,
        descripcion: "Alícuota 35% sobre el impuesto a las ganancias",
        estado: "Activa",
      },
      {
        codigo: "GAN_RET",
        tasa: 6,
        descripcion: "Retención 6% sobre acreditaciones",
        estado: "Activa",
      },
      {
        codigo: "GAN_PH",
        tasa: 35,
        descripcion: "Alícuota 35% para personas humanas",
        estado: "Inactiva",
      },
    ],
  },
  {
    id: 2,
    codigo: "IIBB",
    nombre: "Ingresos Brutos",
    descripcion: "Impuesto provincial sobre la comisión de Molly.",
    tipoImpuesto: "Porcentaje",
    monto: 4,
    estado: "Activo",
    fechaCreacion: "2026-01-12",
    fechaActualizacion: "2026-07-10",
    alicuotas: [
      {
        codigo: "IIBB_4",
        tasa: 4,
        descripcion: "Alícuota 4% sobre la comisión de la plataforma",
        estado: "Activa",
      },
      {
        codigo: "IIBB_CM",
        tasa: 3.5,
        descripcion: "Alícuota 3,5% por convenio multilateral",
        estado: "Inactiva",
      },
    ],
  },
  {
    id: 3,
    codigo: "SELL",
    nombre: "Débito/Crédito (Sellos)",
    descripcion: "Retención de sellos sobre ingresos y egresos del cliente.",
    tipoImpuesto: "Fijo",
    monto: 0.6,
    estado: "Activo",
    fechaCreacion: "2026-02-01",
    fechaActualizacion: "2026-07-20",
    alicuotas: [
      {
        codigo: "IN_06",
        tasa: 0.6,
        descripcion: "Alícuota 0,60% para transferencias entrantes",
        estado: "Activa",
      },
      {
        codigo: "OUT_06",
        tasa: 0.6,
        descripcion: "Alícuota 0,60% para transferencias salientes",
        estado: "Activa",
      },
      {
        codigo: "CHEQUE_018",
        tasa: 0.18,
        descripcion: "Alícuota 0,18% para cheques",
        estado: "Inactiva",
      },
    ],
  },
];

export type AsignacionImpuesto = {
  legajo: number;
  usuario: string;
  nombreCompleto: string;
  impuesto: string;
  tipo: string;
  monto: string;
  estado: Estatus;
  fechaAsignacion: string;
};

export const asignacionesIniciales: AsignacionImpuesto[] = [
  {
    legajo: 1001,
    usuario: "jperez",
    nombreCompleto: "Juan Pérez",
    impuesto: "Ingresos Brutos",
    tipo: "Porcentaje",
    monto: "4%",
    estado: "Activo",
    fechaAsignacion: "2026-03-04",
  },
  {
    legajo: 1002,
    usuario: "mlopez",
    nombreCompleto: "María López",
    impuesto: "Ganancias",
    tipo: "Porcentaje",
    monto: "35%",
    estado: "Activo",
    fechaAsignacion: "2026-03-09",
  },
  {
    legajo: 1003,
    usuario: "cgomez",
    nombreCompleto: "Carlos Gómez",
    impuesto: "Débito/Crédito (Sellos)",
    tipo: "Fijo",
    monto: "0,6%",
    estado: "Activo",
    fechaAsignacion: "2026-04-12",
  },
  {
    legajo: 1004,
    usuario: "rdiaz",
    nombreCompleto: "Romina Díaz",
    impuesto: "Ingresos Brutos",
    tipo: "Porcentaje",
    monto: "4%",
    estado: "Inactivo",
    fechaAsignacion: "2026-04-18",
  },
  {
    legajo: 1005,
    usuario: "fsilva",
    nombreCompleto: "Federico Silva",
    impuesto: "Ganancias",
    tipo: "Porcentaje",
    monto: "35%",
    estado: "Activo",
    fechaAsignacion: "2026-05-02",
  },
  {
    legajo: 1006,
    usuario: "aaros",
    nombreCompleto: "Ana Ríos",
    impuesto: "Débito/Crédito (Sellos)",
    tipo: "Fijo",
    monto: "0,6%",
    estado: "Activo",
    fechaAsignacion: "2026-05-15",
  },
  {
    legajo: 1007,
    usuario: "jtorres",
    nombreCompleto: "Joaquín Torres",
    impuesto: "Ingresos Brutos",
    tipo: "Porcentaje",
    monto: "4%",
    estado: "Activo",
    fechaAsignacion: "2026-05-21",
  },
  {
    legajo: 1008,
    usuario: "lcastro",
    nombreCompleto: "Lucía Castro",
    impuesto: "Ganancias",
    tipo: "Porcentaje",
    monto: "35%",
    estado: "Inactivo",
    fechaAsignacion: "2026-06-03",
  },
  {
    legajo: 1009,
    usuario: "pramos",
    nombreCompleto: "Pablo Ramos",
    impuesto: "Débito/Crédito (Sellos)",
    tipo: "Fijo",
    monto: "0,6%",
    estado: "Activo",
    fechaAsignacion: "2026-06-11",
  },
  {
    legajo: 1010,
    usuario: "vduarte",
    nombreCompleto: "Valentina Duarte",
    impuesto: "Ingresos Brutos",
    tipo: "Porcentaje",
    monto: "4%",
    estado: "Activo",
    fechaAsignacion: "2026-06-19",
  },
  {
    legajo: 1011,
    usuario: "mruiz",
    nombreCompleto: "Marta Ruiz",
    impuesto: "Ganancias",
    tipo: "Porcentaje",
    monto: "35%",
    estado: "Activo",
    fechaAsignacion: "2026-06-25",
  },
  {
    legajo: 1012,
    usuario: "escobar",
    nombreCompleto: "Esteban Escobar",
    impuesto: "Ingresos Brutos",
    tipo: "Porcentaje",
    monto: "4%",
    estado: "Activo",
    fechaAsignacion: "2026-07-01",
  },
  {
    legajo: 1013,
    usuario: "snunez",
    nombreCompleto: "Sofía Núñez",
    impuesto: "Débito/Crédito (Sellos)",
    tipo: "Fijo",
    monto: "0,6%",
    estado: "Inactivo",
    fechaAsignacion: "2026-07-08",
  },
  {
    legajo: 1014,
    usuario: "jcampos",
    nombreCompleto: "Julieta Campos",
    impuesto: "Ganancias",
    tipo: "Porcentaje",
    monto: "35%",
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
    periodo: "2026-02",
    tramo: "Tramo 1",
    fechaCreacion: "2026-02-05 10:32",
    presentado: true,
    pagado: true,
    totalMovimientos: 1840,
    totalMontos: 9420000,
    totalRetenciones: 412000,
  },
  {
    id: 2,
    periodo: "2026-01",
    tramo: "Tramo 2",
    fechaCreacion: "2026-01-18 15:07",
    presentado: true,
    pagado: false,
    totalMovimientos: 1720,
    totalMontos: 8800000,
    totalRetenciones: 388000,
  },
  {
    id: 3,
    periodo: "2026-01",
    tramo: "Tramo 1",
    fechaCreacion: "2026-01-02 09:15",
    presentado: true,
    pagado: true,
    totalMovimientos: 1655,
    totalMontos: 8110000,
    totalRetenciones: 351000,
  },
  {
    id: 4,
    periodo: "2025-12",
    tramo: "Tramo 2",
    fechaCreacion: "2025-12-18 14:40",
    presentado: false,
    pagado: false,
    totalMovimientos: 1590,
    totalMontos: 7700000,
    totalRetenciones: 332000,
  },
];

export type DireccionExcepcion = "Entrantes" | "Salientes" | "Ambos";

export type TipoExcepcion = "Alta manual" | "Convenio multilateral" | "Exención";

export type Excepcion = {
  id: number;
  usuario: string;
  cuit: string;
  tipo: TipoExcepcion;
  direccion: DireccionExcepcion;
  motivo: string;
  vigenciaDesde: string;
  vigenciaHasta: string;
  estado: Estatus;
  fechaCreacion: string;
  fechaActualizacion: string;
};

export const excepcionesIniciales: Excepcion[] = [
  {
    id: 1,
    usuario: "jperez",
    cuit: "20-12345678-9",
    tipo: "Convenio multilateral",
    direccion: "Ambos",
    motivo: "Convenio multilateral",
    vigenciaDesde: "2026-01-01",
    vigenciaHasta: "",
    estado: "Activo",
    fechaCreacion: "2026-01-05",
    fechaActualizacion: "2026-06-12",
  },
  {
    id: 2,
    usuario: "cgomez",
    cuit: "27-87654321-0",
    tipo: "Exención",
    direccion: "Entrantes",
    motivo: "Exento provisional",
    vigenciaDesde: "2026-03-10",
    vigenciaHasta: "2026-09-10",
    estado: "Activo",
    fechaCreacion: "2026-03-10",
    fechaActualizacion: "2026-03-10",
  },
  {
    id: 3,
    usuario: "lcastro",
    cuit: "23-11223344-5",
    tipo: "Alta manual",
    direccion: "Salientes",
    motivo: "Revisión fiscal",
    vigenciaDesde: "2026-05-20",
    vigenciaHasta: "",
    estado: "Inactivo",
    fechaCreacion: "2026-05-20",
    fechaActualizacion: "2026-07-02",
  },
];
