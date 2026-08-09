import type { UserData, UserStatus, TipoPersona } from "@/components/user-modal";

export type {
  UserData,
  UserStatus,
  TipoPersona,
  Subcuenta,
  UserDocument,
  ProductoUsuario,
  ValidacionAutomatica,
  ComisionUsuario,
  ImpuestoUsuario,
  AlertaUsuario,
  ParametroAlerta,
  ParametroBloqueo,
  ModuloVinculado,
} from "@/components/user-modal";

type UsuarioFisica = {
  legajo: string;
  correo: string;
  nombres: string;
  apellidos: string;
  estado: string;
  fechaRegistro: string;
};

type UsuarioJuridica = {
  legajo: string;
  correo: string;
  razonSocial: string;
  tipo: "SA" | "SRL";
  estado: string;
  fechaRegistro: string;
  subcuentas: number;
};

export type { UsuarioFisica as UsuarioFisico, UsuarioJuridica as UsuarioJuridico };

// --- Estado ↔ UserStatus ---
const statusMap: Record<string, UserStatus> = {
  Activado: "active",
  Registrado: "active",
  "Pre-activado": "active",
  "En progreso": "pending",
  "Pendiente de verificación de email": "pending",
  "Pendiente de aprobación": "pending",
  Suspendido: "blocked",
  Rechazado: "blocked",
  Deshabilitado: "inactive",
};

// --- Fixtures ---
const FISICA_DATA: UsuarioFisica[] = [
  {
    legajo: "USR-001",
    correo: "juan.perez@email.com",
    nombres: "Juan Carlos",
    apellidos: "Pérez González",
    estado: "Activado",
    fechaRegistro: "12/01/2024",
  },
  {
    legajo: "USR-002",
    correo: "maria.lopez@email.com",
    nombres: "María Elena",
    apellidos: "López Fernández",
    estado: "Activado",
    fechaRegistro: "23/02/2024",
  },
  {
    legajo: "USR-003",
    correo: "carlos.martinez@email.com",
    nombres: "Carlos Alberto",
    apellidos: "Martínez Ruiz",
    estado: "Suspendido",
    fechaRegistro: "05/03/2024",
  },
  {
    legajo: "USR-004",
    correo: "ana.garcia@email.com",
    nombres: "Ana Sofía",
    apellidos: "García Díaz",
    estado: "Registrado",
    fechaRegistro: "18/04/2024",
  },
  {
    legajo: "USR-005",
    correo: "pedro.rodriguez@email.com",
    nombres: "Pedro Antonio",
    apellidos: "Rodríguez Silva",
    estado: "Pendiente de verificación de email",
    fechaRegistro: "09/05/2024",
  },
  {
    legajo: "USR-006",
    correo: "laura.gomez@email.com",
    nombres: "Laura Fernanda",
    apellidos: "Gómez Torres",
    estado: "Activado",
    fechaRegistro: "17/06/2024",
  },
  {
    legajo: "USR-007",
    correo: "martin.lopez@email.com",
    nombres: "Martín",
    apellidos: "Lopez Moreno",
    estado: "Pre-activado",
    fechaRegistro: "03/07/2024",
  },
  {
    legajo: "USR-008",
    correo: "silvia.ramos@email.com",
    nombres: "Silvia",
    apellidos: "Ramos Ortiz",
    estado: "Activado",
    fechaRegistro: "22/07/2024",
  },
  {
    legajo: "USR-009",
    correo: "oscar.diaz@email.com",
    nombres: "Óscar",
    apellidos: "Díaz Lara",
    estado: "Rechazado",
    fechaRegistro: "11/08/2024",
  },
  {
    legajo: "USR-010",
    correo: "catalina.vargas@email.com",
    nombres: "Catalina",
    apellidos: "Vargas Ruiz",
    estado: "Pendiente de aprobación",
    fechaRegistro: "01/09/2024",
  },
  {
    legajo: "USR-011",
    correo: "andres.molina@email.com",
    nombres: "Andrés Sebastián",
    apellidos: "Molina Rivas",
    estado: "Activado",
    fechaRegistro: "07/11/2024",
  },
  {
    legajo: "USR-012",
    correo: "camila.sosa@email.com",
    nombres: "Camila Andrea",
    apellidos: "Sosa Guzmán",
    estado: "Deshabilitado",
    fechaRegistro: "15/12/2024",
  },
];

const JURIDICA_DATA: UsuarioJuridica[] = [
  {
    legajo: "JUR-001",
    correo: "info@constructoraalpha.com",
    razonSocial: "Constructora Alpha SA",
    tipo: "SA",
    estado: "Activado",
    fechaRegistro: "10/01/2024",
    subcuentas: 5,
  },
  {
    legajo: "JUR-002",
    correo: "admin@comercializadorabeta.com",
    razonSocial: "Comercializadora Beta SRL",
    tipo: "SRL",
    estado: "Registrado",
    fechaRegistro: "22/02/2024",
    subcuentas: 2,
  },
  {
    legajo: "JUR-003",
    correo: "contacto@serviciosgamma.com",
    razonSocial: "Servicios Gamma SA",
    tipo: "SA",
    estado: "Pre-activado",
    fechaRegistro: "14/03/2024",
    subcuentas: 3,
  },
  {
    legajo: "JUR-004",
    correo: "ventas@distribuidoradelta.com",
    razonSocial: "Distribuidora Delta SRL",
    tipo: "SRL",
    estado: "En progreso",
    fechaRegistro: "05/04/2024",
    subcuentas: 1,
  },
  {
    legajo: "JUR-005",
    correo: "info@logisticaepsilon.com",
    razonSocial: "Logística Epsilon SA",
    tipo: "SA",
    estado: "Pendiente de verificación de email",
    fechaRegistro: "19/05/2024",
    subcuentas: 0,
  },
  {
    legajo: "JUR-006",
    correo: "admin@techzeta.com",
    razonSocial: "Tech Zeta SRL",
    tipo: "SRL",
    estado: "Activado",
    fechaRegistro: "01/06/2024",
    subcuentas: 7,
  },
  {
    legajo: "JUR-007",
    correo: "contacto@alimentoseta.com",
    razonSocial: "Alimentos Eta SA",
    tipo: "SA",
    estado: "Pendiente de aprobación",
    fechaRegistro: "28/07/2024",
    subcuentas: 0,
  },
  {
    legajo: "JUR-008",
    correo: "info@industriatheta.com",
    razonSocial: "Industria Theta SRL",
    tipo: "SRL",
    estado: "Activado",
    fechaRegistro: "15/08/2024",
    subcuentas: 4,
  },
  {
    legajo: "JUR-009",
    correo: "gerencia@comercioiota.com",
    razonSocial: "Comercio Iota SA",
    tipo: "SA",
    estado: "En progreso",
    fechaRegistro: "03/09/2024",
    subcuentas: 1,
  },
  {
    legajo: "JUR-010",
    correo: "admin@transporteskappa.com",
    razonSocial: "Transportes Kappa SRL",
    tipo: "SRL",
    estado: "Registrado",
    fechaRegistro: "20/10/2024",
    subcuentas: 0,
  },
];

export const FISICA_ROWS = FISICA_DATA;
export const JURIDICA_ROWS = JURIDICA_DATA;

function docsFisica() {
  return [
    {
      id: "doc-1",
      tipo: "id_frente" as const,
      url: "https://placehold.co/400x600/1a1a2e/e0e0e0?text=DNI+Frente",
      label: "ID Frente",
    },
    {
      id: "doc-2",
      tipo: "id_dorso" as const,
      url: "https://placehold.co/400x600/16213e/e0e0e0?text=DNI+Dorso",
      label: "ID Dorso",
    },
    {
      id: "doc-3",
      tipo: "servicio" as const,
      url: "https://placehold.co/400x600/0f3460/e0e0e0?text=Servicio",
      label: "Servicio",
    },
    {
      id: "doc-4",
      tipo: "selfie" as const,
      url: "https://placehold.co/400x600/1a1a2e/e0e0e0?text=Selfie",
      label: "Selfie",
    },
  ];
}

function docsJuridica(razonSocial: string) {
  return [
    {
      id: "doc-1",
      tipo: "id_frente" as const,
      url: "https://placehold.co/400x600/1a1a2e/e0e0e0?text=DNI+Frente",
      label: "ID Frente",
    },
    {
      id: "doc-2",
      tipo: "id_dorso" as const,
      url: "https://placehold.co/400x600/16213e/e0e0e0?text=DNI+Dorso",
      label: "ID Dorso",
    },
    {
      id: "doc-4",
      tipo: "selfie" as const,
      url: "https://placehold.co/400x600/1a1a2e/e0e0e0?text=Selfie",
      label: `Selfie ${razonSocial}`,
    },
  ];
}

export function toUserDataFisica(u: UsuarioFisica): UserData {
  return {
    id: u.legajo,
    status: statusMap[u.estado] ?? "pending",
    tipoPersona: "fisica",
    legajo: u.legajo,
    email: u.correo,
    fechaRegistro: u.fechaRegistro,
    tipoCuenta: "Individual",
    cantidadCuentasBancarias: 2,
    cantidadCuentasVirtuales: 1,
    nombre: u.nombres,
    apellido: u.apellidos,
    cuit: "20-12345678-9",
    genero: "Masculino",
    ocupacion: "Empleado",
    origenFondos: "Salario",
    direccion: "Av. Corrientes",
    numeroDireccion: "1234",
    ciudad: "CABA",
    estadoProvincia: "Buenos Aires",
    codigoPostal: "C1043",
    fechaNacimiento: "15/03/1990",
    cuitEmpresa: "",
    tipoEmpresa: "",
    nombreLegal: "",
    nombreComercial: "",
    fechaInscripcion: "",
    pep: "No",
    subcuentas: [
      {
        id: "SUB-001",
        legajo: "SUB-001",
        email: u.correo,
        alias: "mi.cuenta",
        cvu: "0000003100087654321012",
        saldo: "$ 150.00",
        estado: "activa",
      },
      {
        id: "SUB-002",
        legajo: "SUB-002",
        email: u.correo,
        alias: "ahorros.juan",
        cvu: "0000003100087654321013",
        saldo: "$ 85.00",
        estado: "activa",
      },
    ],
    documentos: docsFisica(),
    validacionesAutomaticas:
      u.legajo.endsWith("3") || u.legajo.endsWith("7")
        ? []
        : [
            { id: "val-1", proveedor: "AFIP", estado: "Ok", fecha: "04/08/2026" },
            { id: "val-2", proveedor: "BCRA", estado: "Ok", fecha: "04/08/2026" },
            { id: "val-3", proveedor: "Renaper", estado: "Pendiente", fecha: "05/08/2026" },
          ],
    comisiones: [
      {
        id: "com-1",
        tipo: "Comisión por transferencia",
        monto: "$ 1.250,00",
        fecha: "06/08/2026",
        origen: "Transferencia entrante",
      },
      {
        id: "com-2",
        tipo: "Comisión por retiro",
        monto: "$ 850,00",
        fecha: "02/08/2026",
        origen: "Retiro por terminal",
      },
      {
        id: "com-3",
        tipo: "Comisión por cobro QR",
        monto: "$ 320,00",
        fecha: "28/07/2026",
        origen: "Cobro QR",
      },
    ],
    impuestos: [
      { id: "imp-1", nombre: "IIBB", monto: "$ 2.140,00", fecha: "05/08/2026" },
      { id: "imp-2", nombre: "IVA", monto: "$ 3.400,00", fecha: "28/07/2026" },
    ],
    alertas: [
      { id: "al-1", tipo: "Depósito excedido", fecha: "03/08/2026", estado: "Pendiente" },
      { id: "al-2", tipo: "Volumen anormal", fecha: "29/07/2026", estado: "Revisado" },
    ],
    bloqueos: [
      { id: "bl-1", tipo: "Umbral de salarios mínimos", fecha: "01/08/2026", estado: "Activo" },
    ],
    parametrosAlertas: [
      { label: "Depósitos por mes", valor: "10" },
      { label: "Depósitos salario mínimo por transferencia", valor: "5" },
      { label: "Transferencias por hora", valor: "10" },
      { label: "Operaciones repetitivas", valor: "5" },
      { label: "Volumen anormal", valor: "$ 1.000.000 – $ 5.000.000" },
      { label: "Política a menores", valor: "Bloquear" },
    ],
    parametrosBloqueo: [
      { label: "Salarios mínimos por persona", valor: "15" },
      { label: "Salarios mínimos por empresa", valor: "50" },
    ],
    modulos: [
      {
        clave: "pct",
        titulo: "PCT",
        cantidad: u.legajo.endsWith("3") ? 0 : 3,
        verLabel: "Ver comercios PCT",
        vacioMsg: "No se encontró comercio PCT asociado",
        ruta: "/admin/modulos/transferencia",
      },
      {
        clave: "blp",
        titulo: "Links de Pago",
        cantidad: 2,
        verLabel: "Ver links de pago",
        vacioMsg: "No se encontró link de pago asociado",
        ruta: "/admin/modulos/link-pago",
      },
      {
        clave: "api",
        titulo: "API Externa",
        cantidad: 1,
        verLabel: "Ver usuarios API",
        vacioMsg: "No se encontró usuario API asociado",
        ruta: "/admin/modulos/apis",
      },
    ],
    entidad: { maximoSubcuentas: 3, redireccionAutomatica: true, presionOperativa: "Normal" },
  };
}

export function toUserDataJuridica(j: UsuarioJuridica): UserData {
  return {
    id: j.legajo,
    status: "active",
    tipoPersona: "juridica",
    legajo: j.legajo,
    email: j.correo,
    fechaRegistro: j.fechaRegistro,
    tipoCuenta: "Empresarial",
    cantidadCuentasBancarias: 3,
    cantidadCuentasVirtuales: 2,
    nombre: j.razonSocial,
    apellido: "-",
    cuit: "30-12345678-9",
    genero: "-",
    ocupacion: "Empresa",
    origenFondos: "Actividad comercial",
    direccion: "Av. Industrial",
    numeroDireccion: "500",
    ciudad: "CABA",
    estadoProvincia: "Buenos Aires",
    codigoPostal: "C1104",
    fechaNacimiento: "-",
    cuitEmpresa: j.razonSocial.includes("SA") ? "30-87654321-0" : "30-87654321-1",
    tipoEmpresa: j.tipo,
    nombreLegal: j.razonSocial,
    nombreComercial: j.razonSocial,
    fechaInscripcion: j.fechaRegistro,
    pep: "No",
    subcuentas: Array.from({ length: j.subcuentas }, (_, i) => ({
      id: `SUB-${j.legajo}-${i + 1}`,
      legajo: `SUB-${j.legajo}-${i + 1}`,
      email: j.correo,
      alias: `sub.${(j.razonSocial.split(" ")[0] ?? "empresa").toLowerCase()}.${i + 1}`,
      cvu: `0000003100087654321${String(i + 1).padStart(4, "0")}`,
      saldo: `$ ${(Math.random() * 500000 + 10000).toFixed(2)}`,
      estado: "activa",
    })),
    documentos: docsJuridica(j.razonSocial),
    validacionesAutomaticas:
      j.legajo.endsWith("3") || j.legajo.endsWith("7")
        ? []
        : [
            { id: "val-1", proveedor: "AFIP", estado: "Ok", fecha: "04/08/2026" },
            { id: "val-2", proveedor: "BCRA", estado: "Ok", fecha: "04/08/2026" },
            { id: "val-3", proveedor: "Renaper", estado: "Pendiente", fecha: "05/08/2026" },
          ],
    comisiones: [
      {
        id: "com-1",
        tipo: "Comisión por transferencia",
        monto: "$ 1.250,00",
        fecha: "06/08/2026",
        origen: "Transferencia entrante",
      },
      {
        id: "com-2",
        tipo: "Comisión por retiro",
        monto: "$ 850,00",
        fecha: "02/08/2026",
        origen: "Retiro por terminal",
      },
      {
        id: "com-3",
        tipo: "Comisión por cobro QR",
        monto: "$ 320,00",
        fecha: "28/07/2026",
        origen: "Cobro QR",
      },
    ],
    impuestos: [
      { id: "imp-1", nombre: "IIBB", monto: "$ 2.140,00", fecha: "05/08/2026" },
      { id: "imp-2", nombre: "IVA", monto: "$ 3.400,00", fecha: "28/07/2026" },
    ],
    alertas: [
      { id: "al-1", tipo: "Depósito excedido", fecha: "03/08/2026", estado: "Pendiente" },
      { id: "al-2", tipo: "Volumen anormal", fecha: "29/07/2026", estado: "Revisado" },
    ],
    bloqueos: [
      { id: "bl-1", tipo: "Umbral de salarios mínimos", fecha: "01/08/2026", estado: "Activo" },
    ],
    parametrosAlertas: [
      { label: "Depósitos por mes", valor: "10" },
      { label: "Depósitos salario mínimo por transferencia", valor: "5" },
      { label: "Transferencias por hora", valor: "10" },
      { label: "Operaciones repetitivas", valor: "5" },
      { label: "Volumen anormal", valor: "$ 1.000.000 – $ 5.000.000" },
      { label: "Política a menores", valor: "Bloquear" },
    ],
    parametrosBloqueo: [
      { label: "Salarios mínimos por persona", valor: "15" },
      { label: "Salarios mínimos por empresa", valor: "50" },
    ],
    modulos: [
      {
        clave: "pct",
        titulo: "PCT",
        cantidad: 3,
        verLabel: "Ver comercios PCT",
        vacioMsg: "No se encontró comercio PCT asociado",
        ruta: "/admin/modulos/transferencia",
      },
      {
        clave: "blp",
        titulo: "Links de Pago",
        cantidad: 2,
        verLabel: "Ver links de pago",
        vacioMsg: "No se encontró link de pago asociado",
        ruta: "/admin/modulos/link-pago",
      },
      {
        clave: "api",
        titulo: "API Externa",
        cantidad: 1,
        verLabel: "Ver usuarios API",
        vacioMsg: "No se encontró usuario API asociado",
        ruta: "/admin/modulos/apis",
      },
    ],
    entidad: { maximoSubcuentas: 3, redireccionAutomatica: true, presionOperativa: "Normal" },
  };
}

// Lazy registry (built on demand) to keep module load cheap and deterministic.
let _registry: Record<string, UserData> | null = null;
function buildRegistry(): Record<string, UserData> {
  const r: Record<string, UserData> = {};
  for (const u of FISICA_DATA) r[u.legajo] = toUserDataFisica(u);
  for (const j of JURIDICA_DATA) r[j.legajo] = toUserDataJuridica(j);
  return r;
}
function registry() {
  if (!_registry) _registry = buildRegistry();
  return _registry;
}

export function getUserByLegajo(legajo: string): UserData | undefined {
  return registry()[legajo];
}

export function setUserByLegajo(updated: UserData): void {
  if (!updated.legajo) return;
  if (!_registry) _registry = buildRegistry();
  _registry[updated.legajo] = updated;
}

export function allUserData(): UserData[] {
  return Object.values(registry());
}
