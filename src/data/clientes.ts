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
 * Parametrización de arancel por tipo de operación.
 * - `porcentaje`: % de comisión aplicado sobre el monto de la operación.
 * - `montoFijo`: monto fijo en ARS por transacción (alternativa futura al porcentaje).
 * - `porcentajeImpuesto`: impuesto (hoy IVA 21%) que se aplica SOBRE la comisión y
 *   que MoliPay retiene y paga por el servicio. Es independiente de las retenciones
 *   al cliente (Ingresos Brutos, débito/crédito), que se gestionan en el módulo Impuestos.
 */
export type ConfigComision = {
  operacion: string;
  modalidad: ModalidadComision;
  porcentaje: number | null;
  montoFijo: number | null;
  porcentajeImpuesto: number;
};

export type Cliente = {
  id: string;
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
    operacion: "ingreso",
    modalidad: "Porcentaje",
    porcentaje: 0.3,
    montoFijo: null,
    porcentajeImpuesto: IVA_DEFAULT,
  },
  {
    operacion: "egreso",
    modalidad: "Porcentaje",
    porcentaje: 0.5,
    montoFijo: null,
    porcentajeImpuesto: IVA_DEFAULT,
  },
];

function c(
  id: string,
  legajo: string,
  usuario: string,
  tipoPersona: TipoPersona,
  nombre: string,
  cuit: string,
  estado = "Activado",
): Cliente {
  return {
    id,
    legajo,
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
  c("c-0001", "LPF-0001", "juan.perez@email.com", "fisica", "Juan Carlos Pérez", "20-12345678-9"),
  c("c-0002", "LPF-0002", "maria.lopez@email.com", "fisica", "María Elena López", "27-23456789-0"),
  c(
    "c-0003",
    "LPF-0003",
    "minimarket@email.com",
    "fisica",
    "Minimarket del barrio",
    "20-34567890-1",
  ),
  c("c-0004", "LPF-0004", "electro@email.com", "fisica", "Electro Hogar", "27-45678901-2"),
  c("c-0005", "LPF-0005", "gimnasio.fit@email.com", "fisica", "Gym Fit", "20-56789012-3"),
  c("c-0006", "LPJ-0001", "empresa.srl@email.com", "juridica", "Bar Central SA", "30-67890123-4"),
  c(
    "c-0007",
    "LPJ-0002",
    "consorcio@email.com",
    "juridica",
    "Mensajería Express SRL",
    "30-78901234-5",
  ),
  c(
    "c-0008",
    "LPJ-0003",
    "clinica.sur@email.com",
    "juridica",
    "Consultorio Central SA",
    "30-89012345-6",
  ),
  c("c-0009", "LPJ-0004", "burgers@email.com", "juridica", "Burgers Centro SA", "30-90123456-7"),
  c(
    "c-0010",
    "LPJ-0005",
    "software.digital@email.com",
    "juridica",
    "Software Digital SRL",
    "30-01234567-8",
  ),
  // Clientes personas físicas con movimientos en la plataforma
  c(
    "c-0021",
    "LPF-0021",
    "carlos.martinez@email.com",
    "fisica",
    "Carlos Alberto Martínez",
    "20-34567890-1",
  ),
  c("c-0022", "LPF-0022", "ana.garcia@email.com", "fisica", "Ana Sofía García", "27-45678901-2"),
  c(
    "c-0023",
    "LPF-0023",
    "pedro.rodriguez@email.com",
    "fisica",
    "Pedro Antonio Rodríguez",
    "20-56789012-3",
  ),
  c(
    "c-0024",
    "LPF-0024",
    "lucia.mendoza@email.com",
    "fisica",
    "Lucía Belén Mendoza",
    "27-67890123-4",
  ),
  c(
    "c-0025",
    "LPF-0025",
    "gabriel.rios@email.com",
    "fisica",
    "Gabriel Esteban Ríos",
    "20-78901234-5",
  ),
  c(
    "c-0026",
    "LPF-0026",
    "valentina.castro@email.com",
    "fisica",
    "Valentina Castro",
    "27-89012345-6",
  ),
  c(
    "c-0027",
    "LPF-0027",
    "diego.fernandez@email.com",
    "fisica",
    "Diego Martín Fernández",
    "27-90123456-7",
  ),
  c(
    "c-0028",
    "LPF-0028",
    "lucas.rivas@email.com",
    "fisica",
    "Lucas Ezequiel Rivas",
    "20-99887766-5",
  ),
  c(
    "c-0029",
    "LPF-0029",
    "marcos.peralta@email.com",
    "fisica",
    "Marcos Andrés Peralta",
    "20-88776655-4",
  ),
  c("c-0030", "LPF-0030", "agustin.vila@email.com", "fisica", "Agustín Vila", "27-77665544-3"),
  c("c-0031", "LPF-0031", "matias.luna@email.com", "fisica", "Matías Luna", "20-66554433-2"),
  c(
    "c-0032",
    "LPF-0032",
    "carolina.ibanez@email.com",
    "fisica",
    "Carolina Beatriz Ibáñez",
    "27-55443322-1",
  ),
  c(
    "c-0033",
    "LPF-0033",
    "laura.gomez@email.com",
    "fisica",
    "Laura Fernanda Gómez",
    "27-44332211-0",
  ),
  c(
    "c-0034",
    "LPF-0034",
    "martin.lopez@email.com",
    "fisica",
    "Martín López Moreno",
    "20-33221100-9",
  ),
  c(
    "c-0035",
    "LPF-0035",
    "silvia.ramos@email.com",
    "fisica",
    "Silvia Ramos Ortiz",
    "27-22110099-8",
  ),
  c("c-0036", "LPF-0036", "oscar.diaz@email.com", "fisica", "Óscar Díaz Lara", "20-11009988-7"),
  c(
    "c-0037",
    "LPF-0037",
    "catalina.vargas@email.com",
    "fisica",
    "Catalina Vargas Ruiz",
    "27-00998877-6",
  ),
  c(
    "c-0038",
    "LPF-0038",
    "andres.molina@email.com",
    "fisica",
    "Andrés Sebastián Molina",
    "20-99887766-5",
  ),
  c("c-0039", "LPF-0039", "camila.sosa@email.com", "fisica", "Camila Andrea Sosa", "27-88776655-4"),
  c("c-0040", "LPF-0040", "rosa.diaz@email.com", "fisica", "Rosa Mariana Díaz", "27-11223344-5"),
  c(
    "c-0041",
    "LPF-0041",
    "jorge.moreno@email.com",
    "fisica",
    "Jorge Andrés Moreno",
    "20-22334455-6",
  ),
  c(
    "c-0042",
    "LPF-0042",
    "sofia.moreno@email.com",
    "fisica",
    "Sofía Belén Moreno",
    "27-33445566-7",
  ),
  c("c-0043", "LPF-0043", "clara.molina@email.com", "fisica", "Clara Molina Vega", "27-44556677-8"),
  c(
    "c-0044",
    "LPF-0044",
    "nicolas.aguirre@email.com",
    "fisica",
    "Nicolás Aguirre",
    "20-55667788-9",
  ),
  c("c-0045", "LPF-0045", "martina.diaz@email.com", "fisica", "Martina Díaz", "27-66778899-0"),
  c("c-0046", "LPF-0046", "florencia.sosa@email.com", "fisica", "Florencia Sosa", "27-77889900-1"),
  // Personas jurídicas registradas como clientes
  c(
    "c-0101",
    "LPJ-0101",
    "info@constructoraalpha.com",
    "juridica",
    "Constructora Alpha SA",
    "30-11223344-5",
  ),
  c(
    "c-0102",
    "LPJ-0102",
    "admin@comercializadorabeta.com",
    "juridica",
    "Comercializadora Beta SRL",
    "30-22334455-6",
  ),
  c(
    "c-0103",
    "LPJ-0103",
    "contacto@serviciosgamma.com",
    "juridica",
    "Servicios Gamma SA",
    "30-33445566-7",
  ),
  c(
    "c-0104",
    "LPJ-0104",
    "ventas@distribuidoradelta.com",
    "juridica",
    "Distribuidora Delta SRL",
    "30-44556677-8",
  ),
  c(
    "c-0105",
    "LPJ-0105",
    "info@logisticaepsilon.com",
    "juridica",
    "Logística Epsilon SA",
    "30-55667788-9",
  ),
  c("c-0106", "LPJ-0106", "admin@techzeta.com", "juridica", "Tech Zeta SRL", "30-66778899-0"),
  c(
    "c-0107",
    "LPJ-0107",
    "contacto@alimentoseta.com",
    "juridica",
    "Alimentos Eta SA",
    "30-77889900-1",
  ),
  c(
    "c-0108",
    "LPJ-0108",
    "info@industriatheta.com",
    "juridica",
    "Industria Theta SRL",
    "30-88990011-2",
  ),
  c(
    "c-0109",
    "LPJ-0109",
    "gerencia@comercioiota.com",
    "juridica",
    "Comercio Iota SA",
    "30-99001122-3",
  ),
  c(
    "c-0110",
    "LPJ-0110",
    "admin@transporteskappa.com",
    "juridica",
    "Transportes Kappa SRL",
    "30-00112233-4",
  ),
];

// --- Generación de legajo -------------------------------------------------

const LEGAJO_RE = /^(LPF|LPJ)-(\d+)$/;

export function parseLegajo(
  legajo: string,
): { prefijo: "LPF" | "LPJ"; tipoPersona: TipoPersona; numero: number } | null {
  const m = legajo.trim().toUpperCase().match(LEGAJO_RE);
  if (!m) return null;
  const prefijo = m[1] as "LPF" | "LPJ";
  return {
    prefijo,
    tipoPersona: prefijo === "LPF" ? "fisica" : "juridica",
    numero: parseInt(m[2], 10),
  };
}

export function legajoEsConsistente(tipoPersona: TipoPersona, legajo: string): boolean {
  const p = parseLegajo(legajo);
  return p !== null && p.tipoPersona === tipoPersona;
}

export function allLegajosRegistrados(): string[] {
  const set = new Set<string>(clientesIniciales.map((c) => c.legajo));
  for (const comercio of comerciosIniciales) set.add(comercio.legajo);
  return [...set];
}

function nextNumero(prefijo: "LPF" | "LPJ", registrados: string[]): number {
  const max = registrados.reduce((acc, leg) => {
    const p = parseLegajo(leg);
    if (p && p.prefijo === prefijo) return Math.max(acc, p.numero);
    return acc;
  }, 0);
  return max + 1;
}

/**
 * Genera el legajo automáticamente con formato `LPF-####` (Persona Física) o
 * `LPJ-####` (Persona Jurídica), garantizando unicidad sobre los legajos existentes.
 * El prefijo queda determinado por el tipo de persona: no es editable manualmente.
 */
export function generarLegajo(
  tipoPersona: TipoPersona,
  registrados: string[] = allLegajosRegistrados(),
): string {
  const prefijo = PREFIJO_LEGAJO[tipoPersona];
  return `${prefijo}-${String(nextNumero(prefijo, registrados)).padStart(4, "0")}`;
}

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
  legajo: string;
  tipoPersona?: TipoPersona;
};

/**
 * Audita los legajos cargados en la plataforma para detectar inconsistencias:
 * - formato inválido (identificador genérico tipo MOV-001 / COM-1001 / USR-001)
 * - legajos duplicados entre entidades distintas
 * - legajos sin relación real a un cliente dado de alta
 * - prefijo inconsistente con el tipo de persona declarado
 */
export function auditarLegajos(fuentes: FuenteLegajo[]): InconsistenciaLegajo[] {
  const resultado: InconsistenciaLegajo[] = [];
  const vistos = new Map<string, string>();

  const registrar = (f: FuenteLegajo) => {
    const legajo = f.legajo.trim().toUpperCase();
    const parse = parseLegajo(legajo);

    if (!parse) {
      resultado.push({
        entidad: f.entidad,
        legajo,
        tipo: "formato",
        detalle: `El legajo “${legajo}” no cumple el formato LPF-####/LPJ-#### (identificador genérico en lugar de legajo de cliente).`,
      });
    } else if (f.tipoPersona && !legajoEsConsistente(f.tipoPersona, legajo)) {
      resultado.push({
        entidad: f.entidad,
        legajo,
        tipo: "prefijo_inconsistente",
        detalle: `El prefijo ${parse.prefijo} no corresponde al tipo ${f.tipoPersona} declarado para ${f.entidad}.`,
      });
    }

    if (vistos.has(legajo)) {
      resultado.push({
        entidad: `${vistos.get(legajo)} / ${f.entidad}`,
        legajo,
        tipo: "duplicado",
        detalle: `El legajo “${legajo}” está asignado a más de una entidad.`,
      });
    } else {
      vistos.set(legajo, f.entidad);
    }
  };

  for (const f of fuentes) registrar(f);

  const registrados = new Set(clientesIniciales.map((c) => c.legajo));
  for (const f of fuentes) {
    const legajo = f.legajo.trim().toUpperCase();
    if (!parseLegajo(legajo)) continue;
    if (f.entidad.startsWith("Cliente")) continue;
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
  return movimientos.map((m) => ({ entidad: `Movimiento ${m.id}`, legajo: m.legajo }));
}

export function fuentesLegajoDesdeUsuarios(
  usuarios: { legajo: string; tipoPersona?: TipoPersona; correo?: string }[],
): FuenteLegajo[] {
  return usuarios.map((u) => ({
    entidad: `Usuario ${u.correo ?? u.legajo}`,
    legajo: u.legajo,
    tipoPersona: u.tipoPersona,
  }));
}
