import { comerciosIniciales } from "./comercios";

export type TipoPersona = "fisica" | "juridica";

export const PREFIJO_LEGAJO: Record<TipoPersona, "LPF" | "LPJ"> = {
  fisica: "LPF",
  juridica: "LPJ",
};

export const ETIQUETA_TIPO_PERSONA: Record<TipoPersona, string> = {
  fisica: "Persona Física",
  juridica: "Persona Jurídica",
};

export type ModalidadComision = "Porcentaje" | "Fijo";

/**
 * Categorías de operación soportadas por la tabla `comisiones_cliente`
 * (ver CHECK constraint de `tipo`). El modelo anterior (`operacion: "ingreso" | "egreso"`)
 * no coincidía con el esquema real y fue corregido: `operacion` es ahora un código único
 * de referencia (ej. "DEP-2024-001") y `tipo` es la categoría de 4 valores fijos.
 */
export const TIPOS_OPERACION = ["Depósito", "Retiro", "Link de pago", "E-commerce"] as const;

export type TipoOperacion = (typeof TIPOS_OPERACION)[number];

export const ESTADOS_COMISION = ["Habilitado", "Deshabilitado"] as const;
export type EstadoComision = (typeof ESTADOS_COMISION)[number];

/**
 * Parametrización de arancel por cliente y tipo de operación.
 * Modelo 1:1 con la tabla `comisiones_cliente`:
 * - `operacion`: código único de referencia (ej. "DEP-2024-001").
 * - `tipo`: categoría de la operación (4 valores fijos).
 * - `modalidad`: Porcentaje | Fijo.
 * - `porcentaje` / `montoFijo`: según modalidad.
 * - `porcentajeImpuesto`: IVA sobre la comisión que MoliPay retiene y paga (hoy 21%).
 *   Es independiente de las retenciones al cliente (IIBB, débito/crédito).
 */
export type ConfigComision = {
  operacion: string;
  tipo: TipoOperacion;
  modalidad: ModalidadComision;
  porcentaje: number | null;
  montoFijo: number | null;
  porcentajeImpuesto: number;
  estado?: EstadoComision;
  descripcion?: string;
};

export type Cliente = {
  id: string;
  /** Identificador interno del cliente: `LPF-CUIT` (persona física) / `LPJ-CUIT` (persona jurídica), CUIT sin guiones. */
  legajo: string;
  usuario: string;
  tipoPersona: TipoPersona;
  nombre: string;
  cuit: string;
  estado: string;
  fechaAlta: string;
  comisiones: ConfigComision[];
};

export const IVA_DEFAULT = 21;

export const COMISIONES_DEFAULT: ConfigComision[] = [
  {
    operacion: "DEP-DEFAULT",
    tipo: "Depósito",
    modalidad: "Porcentaje",
    porcentaje: 0.3,
    montoFijo: null,
    porcentajeImpuesto: IVA_DEFAULT,
    estado: "Habilitado",
    descripcion: "Comisión por depósito por defecto",
  },
  {
    operacion: "RET-DEFAULT",
    tipo: "Retiro",
    modalidad: "Porcentaje",
    porcentaje: 0.5,
    montoFijo: null,
    porcentajeImpuesto: IVA_DEFAULT,
    estado: "Habilitado",
    descripcion: "Comisión por retiro por defecto",
  },
];

// --- Legajo: prefijo (LPF/LPJ) + CUIT sin guiones ---------------------------
// El legajo es el identificador interno del cliente. Su segundo componente es el
// CUIT de la persona (física o jurídica). No es un correlativo: es determinístico.

const LEGAJO_RE = /^(LPF|LPJ)-(\d{11})$/;

/** Normaliza un CUIT a solo dígitos (quita guiones y espacios). */
export function normalizarCuit(cuit: string): string {
  return cuit.replace(/\D/g, "");
}

/** Deriva el legajo del cliente a partir del tipo de persona y su CUIT. */
export function legajoDesdeCuit(tipoPersona: TipoPersona, cuit: string): string {
  const digits = normalizarCuit(cuit);
  if (digits.length !== 11) return `${PREFIJO_LEGAJO[tipoPersona]}-${digits}`;
  return `${PREFIJO_LEGAJO[tipoPersona]}-${digits}`;
}

/**
 * Genera el legajo a partir del tipo de persona y el CUIT.
 * Equivalente a `legajoDesdeCuit`; se mantiene con este nombre para el alta de entidades.
 */
export function generarLegajo(tipoPersona: TipoPersona, cuit: string): string {
  return legajoDesdeCuit(tipoPersona, cuit);
}

/** Parsea un legajo: prefijo, tipo de persona y CUIT (11 dígitos, sin guiones). */
export function parseLegajo(
  legajo: string,
): { prefijo: "LPF" | "LPJ"; tipoPersona: TipoPersona; cuit: string } | null {
  const m = legajo.trim().toUpperCase().match(LEGAJO_RE);
  if (!m) return null;
  const prefijo = m[1] as "LPF" | "LPJ";
  return {
    prefijo,
    tipoPersona: prefijo === "LPF" ? "fisica" : "juridica",
    cuit: m[2],
  };
}

/** El prefijo del legajo debe ser consistente con el tipo de persona declarado. */
export function legajoEsConsistente(tipoPersona: TipoPersona, legajo: string): boolean {
  const p = parseLegajo(legajo);
  return p !== null && p.tipoPersona === tipoPersona;
}

export function allLegajosRegistrados(): string[] {
  const set = new Set<string>(clientesIniciales.map((c) => c.legajo));
  for (const comercio of comerciosIniciales) set.add(comercio.legajo);
  return [...set];
}

// --- Clientes ---------------------------------------------------------------

function c(
  id: string,
  tipoPersona: TipoPersona,
  usuario: string,
  nombre: string,
  cuit: string,
  estado = "Activado",
): Cliente {
  return {
    id,
    legajo: legajoDesdeCuit(tipoPersona, cuit),
    usuario,
    tipoPersona,
    nombre,
    cuit,
    estado,
    fechaAlta: "01/01/2025",
    comisiones: COMISIONES_DEFAULT,
  };
}

export const clientesIniciales: Cliente[] = [
  // Clientes titulares de comercios
  c("c-0001", "fisica", "juan.perez@email.com", "Juan Carlos Pérez", "20-12345678-9"),
  c("c-0002", "fisica", "maria.lopez@email.com", "María Elena López", "27-23456789-0"),
  c("c-0003", "fisica", "minimarket@email.com", "Minimarket del barrio", "20-33445566-7"),
  c("c-0004", "fisica", "electro@email.com", "Electro Hogar", "27-40001234-5"),
  c("c-0005", "fisica", "gimnasio.fit@email.com", "Gym Fit", "20-50005678-9"),
  c("c-0006", "juridica", "empresa.srl@email.com", "Bar Central SA", "30-67890123-4"),
  c("c-0007", "juridica", "consorcio@email.com", "Mensajería Express SRL", "30-78901234-5"),
  c("c-0008", "juridica", "clinica.sur@email.com", "Consultorio Central SA", "30-89012345-6"),
  c("c-0009", "juridica", "burgers@email.com", "Burgers Centro SA", "30-90123456-7"),
  c("c-0010", "juridica", "software.digital@email.com", "Software Digital SRL", "30-01234567-8"),
  // Clientes personas físicas con movimientos en la plataforma
  c("c-0021", "fisica", "carlos.martinez@email.com", "Carlos Alberto Martínez", "20-34567890-1"),
  c("c-0022", "fisica", "ana.garcia@email.com", "Ana Sofía García", "27-45678901-2"),
  c("c-0023", "fisica", "pedro.rodriguez@email.com", "Pedro Antonio Rodríguez", "20-56789012-3"),
  c("c-0024", "fisica", "lucia.mendoza@email.com", "Lucía Belén Mendoza", "27-67890123-4"),
  c("c-0025", "fisica", "gabriel.rios@email.com", "Gabriel Esteban Ríos", "20-78901234-5"),
  c("c-0026", "fisica", "valentina.castro@email.com", "Valentina Castro", "27-89012345-6"),
  c("c-0027", "fisica", "diego.fernandez@email.com", "Diego Martín Fernández", "27-90123456-7"),
  c("c-0028", "fisica", "lucas.rivas@email.com", "Lucas Ezequiel Rivas", "20-99887766-5"),
  c("c-0029", "fisica", "marcos.peralta@email.com", "Marcos Andrés Peralta", "27-88776655-4"),
  c("c-0030", "fisica", "agustin.vila@email.com", "Agustín Vila", "27-77665544-3"),
  c("c-0031", "fisica", "matias.luna@email.com", "Matías Luna", "20-66554433-2"),
  c("c-0032", "fisica", "carolina.ibanez@email.com", "Carolina Beatriz Ibáñez", "27-55443322-1"),
  c("c-0033", "fisica", "laura.gomez@email.com", "Laura Fernanda Gómez", "27-44332211-0"),
  c("c-0034", "fisica", "martin.lopez@email.com", "Martín López Moreno", "20-33221100-9"),
  c("c-0035", "fisica", "silvia.ramos@email.com", "Silvia Ramos Ortiz", "27-22110099-8"),
  c("c-0036", "fisica", "oscar.diaz@email.com", "Óscar Díaz Lara", "20-11009988-7"),
  c("c-0037", "fisica", "catalina.vargas@email.com", "Catalina Vargas Ruiz", "27-00998877-6"),
  c("c-0038", "fisica", "andres.molina@email.com", "Andrés Sebastián Molina", "20-98989898-9"),
  c("c-0039", "fisica", "camila.sosa@email.com", "Camila Andrea Sosa", "27-87878787-8"),
  c("c-0040", "fisica", "rosa.diaz@email.com", "Rosa Mariana Díaz", "27-11223344-5"),
  c("c-0041", "fisica", "jorge.moreno@email.com", "Jorge Andrés Moreno", "20-22334455-6"),
  c("c-0042", "fisica", "sofia.moreno@email.com", "Sofía Belén Moreno", "27-33445566-7"),
  c("c-0043", "fisica", "clara.molina@email.com", "Clara Molina Vega", "27-44556677-8"),
  c("c-0044", "fisica", "nicolas.aguirre@email.com", "Nicolás Aguirre", "20-55667788-9"),
  c("c-0045", "fisica", "martina.diaz@email.com", "Martina Díaz", "27-66778899-0"),
  c("c-0046", "fisica", "florencia.sosa@email.com", "Florencia Sosa", "27-77889900-1"),
  // Personas jurídicas registradas como clientes
  c("c-0101", "juridica", "info@constructoraalpha.com", "Constructora Alpha SA", "30-11223344-5"),
  c(
    "c-0102",
    "juridica",
    "admin@comercializadorabeta.com",
    "Comercializadora Beta SRL",
    "30-22334455-6",
  ),
  c("c-0103", "juridica", "contacto@serviciosgamma.com", "Servicios Gamma SA", "30-33445566-7"),
  c(
    "c-0104",
    "juridica",
    "ventas@distribuidoradelta.com",
    "Distribuidora Delta SRL",
    "30-44556677-8",
  ),
  c("c-0105", "juridica", "info@logisticaepsilon.com", "Logística Epsilon SA", "30-55667788-9"),
  c("c-0106", "juridica", "admin@techzeta.com", "Tech Zeta SRL", "30-66778899-0"),
  c("c-0107", "juridica", "contacto@alimentoseta.com", "Alimentos Eta SA", "30-77889900-1"),
  c("c-0108", "juridica", "info@industriatheta.com", "Industria Theta SRL", "30-88990011-2"),
  c("c-0109", "juridica", "gerencia@comercioiota.com", "Comercio Iota SA", "30-99001122-3"),
  c("c-0110", "juridica", "admin@transporteskappa.com", "Transportes Kappa SRL", "30-00112233-4"),
];

// --- Consultas -------------------------------------------------------------

export function getClientePorLegajo(legajo: string): Cliente | undefined {
  return clientesIniciales.find((c) => c.legajo === legajo.trim().toUpperCase());
}

export function getClientePorUsuario(usuario: string): Cliente | undefined {
  return clientesIniciales.find((c) => c.usuario.toLowerCase() === usuario.trim().toLowerCase());
}

export function getMovimientosPorCliente(
  clienteId: string,
  movimientos: { clienteId: string }[],
): { clienteId: string }[] {
  return movimientos.filter((m) => m.clienteId === clienteId);
}

// --- Auditoría de datos existentes -----------------------------------------

export type InconsistenciaLegajo = {
  entidad: string;
  legajo: string;
  tipo: "formato" | "duplicado" | "sin_cliente" | "prefijo_inconsistente";
  detalle: string;
};

export type FuenteLegajo = {
  entidad: string;
  tipoEntidad: "cliente" | "movimiento" | "comercio" | "usuario";
  legajo: string;
  tipoPersona?: TipoPersona;
};

/**
 * Audita los legajos cargados en la plataforma para detectar inconsistencias:
 * - formato inválido (identificador genérico tipo MOV-001 / COM-1001 / USR-001,
 *   o CUIT sin la longitud correcta de 11 dígitos)
 * - el mismo legajo asignado a DOS ENTIDADES DISTINTAS (p. ej. un movimiento y un
 *   comercio de clientes diferentes). Un mismo cliente con varios movimientos NO es
 *   una inconsistencia: por eso se compara por entidad, no por legajo repetido.
 * - legajos sin relación real a un cliente dado de alta
 * - prefijo inconsistente con el tipo de persona declarado
 */
export function auditarLegajos(fuentes: FuenteLegajo[]): InconsistenciaLegajo[] {
  const resultado: InconsistenciaLegajo[] = [];
  const porLegajo = new Map<string, FuenteLegajo[]>();

  const registrar = (f: FuenteLegajo) => {
    const legajo = f.legajo.trim().toUpperCase();
    const parse = parseLegajo(legajo);

    if (!parse) {
      resultado.push({
        entidad: f.entidad,
        legajo,
        tipo: "formato",
        detalle: `El legajo “${legajo}” no cumple el formato LPF-CUIT / LPJ-CUIT (prefijo + CUIT de 11 dígitos).`,
      });
    } else if (f.tipoPersona && !legajoEsConsistente(f.tipoPersona, legajo)) {
      resultado.push({
        entidad: f.entidad,
        legajo,
        tipo: "prefijo_inconsistente",
        detalle: `El prefijo ${parse.prefijo} no corresponde al tipo ${f.tipoPersona} declarado para ${f.entidad}.`,
      });
    }

    const lista = porLegajo.get(legajo);
    if (lista) lista.push(f);
    else porLegajo.set(legajo, [f]);
  };

  for (const f of fuentes) registrar(f);

  // Duplicados: mismo legajo en entidades de distinto tipo/identidad. Se agrupan
  // por entidad (cliente, comercio, usuario) para no marcar movimientos de un mismo cliente.
  for (const [legajo, lista] of porLegajo) {
    const entidadesDistintas = lista
      .filter((f) => f.tipoEntidad !== "movimiento")
      .map((f) => f.tipoEntidad);
    const setEntidades = new Set(entidadesDistintas);
    if (setEntidades.size > 1) {
      resultado.push({
        entidad: lista.map((f) => f.entidad).join(" / "),
        legajo,
        tipo: "duplicado",
        detalle: `El legajo “${legajo}” está asignado a más de una entidad: ${[
          ...setEntidades,
        ].join(", ")}.`,
      });
    }
  }

  const registrados = new Set(clientesIniciales.map((c) => c.legajo));
  for (const f of fuentes) {
    const legajo = f.legajo.trim().toUpperCase();
    if (!parseLegajo(legajo)) continue;
    if (f.tipoEntidad === "cliente") continue;
    if (!registrados.has(legajo)) {
      resultado.push({
        entidad: f.entidad,
        legajo,
        tipo: "sin_cliente",
        detalle: `El legajo “${legajo}” de ${f.entidad} no corresponde a ningún cliente dado de alta.`,
      });
    }
  }

  return resultado;
}

export function fuentesLegajoDesdeMovimientos(
  movimientos: { legajo: string; id: string }[],
): FuenteLegajo[] {
  return movimientos.map((m) => ({
    entidad: `Movimiento ${m.id}`,
    tipoEntidad: "movimiento",
    legajo: m.legajo,
  }));
}

export function fuentesLegajoDesdeUsuarios(
  usuarios: { legajo: string; tipoPersona?: TipoPersona; correo?: string }[],
): FuenteLegajo[] {
  return usuarios.map((u) => ({
    entidad: `Usuario ${u.correo ?? u.legajo}`,
    tipoEntidad: "usuario",
    legajo: u.legajo,
    tipoPersona: u.tipoPersona,
  }));
}

export function fuentesLegajoDesdeComercios(
  comercios: { legajo: string; nombre?: string; usuario?: string }[],
): FuenteLegajo[] {
  return comercios.map((comercio) => ({
    entidad: `Comercio ${comercio.nombre ?? comercio.usuario ?? comercio.legajo}`,
    tipoEntidad: "comercio",
    legajo: comercio.legajo,
  }));
}
