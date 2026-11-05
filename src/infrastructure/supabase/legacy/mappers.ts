import type {
ApiUser,
ApiUserRow,
ChannelNotification,
ChannelNotificationRow,
CodeError,
CodeErrorRow,
Customer,
CustomerRow,
Merchant,
MerchantRow,
FeeCustomer,
FeeCustomerRow,
EventNotification,
EventNotificationRow,
Tax,
TaxRow,
TaxRateRow,
SourceRate,
AddressRate,
TaxAssignment,
TaxAssignmentRow,
KindOperation,
Rate,
Integration,
IntegrationRow,
Movement,
MovementRow,
PointSale,
PointSaleRow,
Resolver,
ResolverRow,
KindPerson,
CodeCategory,
CodeCategoryRow,
} from "@/infrastructure/supabase/legacy/types";

export function toCustomer(r: CustomerRow): Customer {
  return {
    id: r.id,
    legajo: r.legajo,
    tipoPersona: r.tipo_persona,
    correo: r.correo,
    nombre: r.nombre,
    cuit: r.cuit,
    estado: r.estado,
    fechaAlta: r.fecha_alta,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    emailVerificado: (r.email_verificado as boolean) ?? false,
    onboardingCompleto: (r.onboarding_completo as boolean) ?? false,
    cbu: (r.cbu as string | null) ?? null,
    cbuCancelado: (r.cbu_cancelado as boolean) ?? false,
    genero: (r.genero as string | null) ?? null,
    cuitCuil: (r.cuit_cuil as string | null) ?? null,
    fechaNacimiento: (r.fecha_nacimiento as string | null) ?? null,
    ocupacion: (r.ocupacion as string | null) ?? null,
    origenFondos: (r.origen_fondos as string | null) ?? null,
    esPep: (r.es_pep as boolean) ?? false,
    tipoSociedad: (r.tipo_sociedad as string | null) ?? null,
    nombreLegal: (r.nombre_legal as string | null) ?? null,
    nombreFantasia: (r.nombre_fantasia as string | null) ?? null,
    fechaInscripcion: (r.fecha_inscripcion as string | null) ?? null,
    direccion: (r.direccion as string | null) ?? null,
    direccion2: (r.direccion2 as string | null) ?? null,
    ciudad: (r.ciudad as string | null) ?? null,
    provincia: (r.provincia as string | null) ?? null,
    cp: (r.cp as string | null) ?? null,
    estadoOnboarding: (r.estado_onboarding as string | null) ?? null,
    limiteTransferencia: (r.limite_transferencia as number | null) ?? null,
    limiteOpsDiarias: (r.limite_ops_diarias as number | null) ?? null,
    limiteMontoDiario: (r.limite_monto_diario as number | null) ?? null,
  };
}

export function toFee(
  r: FeeCustomerRow & {
    clientes?:
      | {
          legajo: string;
          correo: string;
          cuit: string;
          nombre: string;
          tipo_persona: KindPerson;
        }[]
      | null;
    subcuentas?: { cbu: string | null; nombre: string | null }[] | null;
  },
): FeeCustomer {
  const cli = Array.isArray(r.clientes) ? (r.clientes[0] ?? null) : (r.clientes ?? null);
  const sub = Array.isArray(r.subcuentas) ? (r.subcuentas[0] ?? null) : (r.subcuentas ?? null);
  return {
    id: r.id,
    clienteId: r.cliente_id,
    subcuentaId: r.subcuenta_id ?? null,
    subcuenta: sub ? { cbu: sub.cbu, nombre: sub.nombre } : null,
    operacion: r.operacion,
    tipo: r.tipo,
    modalidad: r.modalidad,
    porcentaje: r.porcentaje,
    montoFijo: r.monto_fijo,
    porcentajeImpuesto: r.porcentaje_impuesto,
    estado: r.estado,
    descripcion: r.descripcion,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    cliente: cli
      ? {
          legajo: cli.legajo,
          correo: cli.correo,
          cuit: cli.cuit,
          nombre: cli.nombre,
          tipoPersona: cli.tipo_persona,
        }
      : null,
  };
}

export function toMovement(
  r: MovementRow & {
    clientes?: { correo: string; nombre: string; cuit: string }[] | null;
  },
): Movement {
  const cli = Array.isArray(r.clientes) ? (r.clientes[0] ?? null) : (r.clientes ?? null);
  const statusArr = Array.isArray(r.estados_movimiento) ? r.estados_movimiento : null;
  const status = statusArr && statusArr.length ? statusArr[0] : null;
  return {
    id: r.id,
    clienteId: r.cliente_id,
    legajo: r.legajo,
    idTxn: r.id_txn,
    tipo: r.tipo,
    cvu: r.cvu,
    montoOperacion: r.monto_operacion,
    comision: r.comision,
    impuesto: r.impuesto,
    montoCobrado: r.monto_cobrado,
    estadoId: r.estado_id,
    estadoCodigo: status?.codigo,
    estadoNombre: status?.nombre,
    esFinal: status?.es_final,
    fecha: r.fecha,
    createdAt: r.created_at,
    comercioId: (r as MovementRow).comercio_id ?? null,
    /** Texto denormalizado. FK real: banderaId */
    bandera: (r as MovementRow).bandera ?? null,
    /** FK a banderas.id */
    banderaId: (r as MovementRow).bandera_id ?? null,
    destinatarioNombre: (r as MovementRow).destinatario_nombre ?? null,
    destinatarioCuit: (r as MovementRow).destinatario_cuit ?? null,
    destinatarioBanco: (r as MovementRow).destinatario_banco ?? null,
    cliente: cli,
  };
}

function firstOrNull<T>(v: T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return (v as T | null) ?? null;
}

export function toPointSale(
  r: PointSaleRow & {
    comercios?: {
      id: string;
      usuario: string;
      legajo: string;
      clientes?: { nombre: string; correo: string }[] | null;
    } | null;
  },
): PointSale {
  const com = r.comercios as {
    id: string;
    usuario: string;
    legajo: string;
    clientes?: { nombre: string; correo: string }[] | null;
  } | null;
  const cli = Array.isArray(com?.clientes) ? com?.clientes[0] : (com?.clientes ?? null);
  return {
    id: r.id,
    comercioId: r.comercio_id,
    nombre: r.nombre,
    estado: r.estado as PointSale["estado"],
    createdAt: r.created_at,
    tipo: (r as PointSaleRow).tipo ?? null,
    cajero: (r as PointSaleRow).cajero ?? null,
    qrUrl: (r as PointSaleRow).qr_url ?? null,
    alias: (r as PointSaleRow).alias ?? null,
    comercio: com
      ? {
          id: com.id,
          usuario: com.usuario,
          legajo: com.legajo,
          clienteNombre: cli?.nombre ?? undefined,
          clienteCorreo: cli?.correo ?? undefined,
        }
      : null,
  };
}

export function toMerchant(
  r: MerchantRow & {
    clientes?:
      | {
          legajo: string;
          nombre: string;
          cuit: string;
          tipo_persona: KindPerson;
          correo: string;
        }[]
      | null;
    codigos_categoria?: CodeCategoryRow[] | null;
    puntos_venta?: PointSaleRow[] | null;
    backoffice_users?:
      | {
          id: string;
          full_name: string;
          email: string;
        }[]
      | null;
  },
): Merchant {
  const cli = firstOrNull(r.clientes);
  const cat = firstOrNull(r.codigos_categoria);
  const pdvs = (r.puntos_venta ?? []) as PointSaleRow[];
  const executive = firstOrNull(r.backoffice_users);
  return {
    id: r.id,
    usuario: r.usuario,
    legajo: r.legajo,
    nombreComercio: (r as unknown as { nombre_comercio?: string | null }).nombre_comercio ?? null,
    cliente: cli
      ? {
          legajo: cli.legajo,
          nombre: cli.nombre,
          cuit: cli.cuit,
          tipoPersona: cli.tipo_persona,
          correo: cli.correo,
        }
      : null,
    categoriaId: r.categoria_id,
    categoria: cat
      ? {
          id: cat.id,
          codigo: cat.codigo,
          nombre: cat.nombre,
          descripcion: cat.descripcion,
          estado: cat.estado,
          createdAt: cat.created_at,
          updatedAt: cat.updated_at,
        }
      : null,
    nivel: r.nivel,
    estado: r.estado,
    ejecutivoResponsableId:
      (r as unknown as { ejecutivo_responsable_id?: string | null }).ejecutivo_responsable_id ??
      null,
    ejecutivo: executive
      ? {
          id: executive.id,
          nombre: executive.full_name,
          email: executive.email,
        }
      : null,
    siteId: (r as unknown as { site_id?: string | null }).site_id ?? null,
    puntosVenta: pdvs.map(toPointSale),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toCodeCategory(r: CodeCategoryRow): CodeCategory {
  return {
    id: r.id,
    codigo: r.codigo,
    nombre: r.nombre,
    descripcion: r.descripcion,
    estado: r.estado,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toResolver(r: ResolverRow): Resolver {
  return {
    id: r.id,
    nombre: r.nombre,
    cuit: r.cuit,
    url: r.url,
    estado: r.estado,
    nombreReverso: r.nombre_reverso,
    formatoWeb: r.formato_web,
    pcpId: r.pcp_id,
    idPcp: r.id_pcp,
    token: r.token,
    asHeader: r.as_header,
    soa: r.soa,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toApiUser(r: ApiUserRow): ApiUser {
  return {
    id: r.id,
    codigoUsuarioApi: r.codigo_usuario_api,
    usuario: r.usuario,
    nombreCompleto: r.nombre_completo,
    estado: r.estado,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toIntegration(r: IntegrationRow): Integration {
  return {
    id: r.id,
    nombre: r.nombre,
    proveedor: r.proveedor,
    createdAt: r.created_at,
  };
}

export function toCodeError(r: CodeErrorRow): CodeError {
  return {
    id: r.id,
    codigo: r.codigo,
    mensaje: r.mensaje,
    audiencia: r.audiencia,
    canalDefecto: r.canal_defecto,
    descripcion: r.descripcion,
    activo: r.activo,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toChannelNotification(r: ChannelNotificationRow): ChannelNotification {
  return {
    id: r.id,
    nombre: r.nombre,
    tipo: r.tipo,
    configuracion: r.configuracion,
    activo: r.activo,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toEventNotification(
  r: EventNotificationRow & {
    codigos_error?: { codigo: string; mensaje: string }[] | null;
  },
): EventNotification {
  const ce = Array.isArray(r.codigos_error) ? r.codigos_error[0] : null;
  return {
    id: r.id,
    tipo: r.tipo,
    codigoErrorId: r.codigo_error_id,
    titulo: r.titulo,
    mensaje: r.mensaje,
    audiencia: r.audiencia,
    canal: r.canal,
    estadoEntrega: r.estado_entrega,
    fecha: r.fecha,
    metadata: r.metadata,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    codigoError: ce ? { codigo: ce.codigo, mensaje: ce.mensaje } : null,
  };
}

const SOURCE_FROM_DB: Record<TaxRow["rate_source"], SourceRate> = {
  fixed: "Fija",
  taxpayer_registry: "Padrón",
  manual: "Manual",
};
const ADDRESS_FROM_DB: Record<TaxRateRow["direction"], AddressRate> = {
  inbound: "Entrante",
  outbound: "Saliente",
  both: "Ambas",
};

export function toTax(r: TaxRow & { tax_rates?: TaxRateRow[] | null }): Tax {
  const rates = Array.isArray(r.tax_rates) ? r.tax_rates.map(toRate) : [];
  return {
    id: r.id,
    codigo: r.code,
    nombre: r.name,
    descripcion: r.description ?? null,
    estado: r.status === "active" ? "Activo" : "Inactivo",
    ambito: r.scope === "internal" ? "Interno" : "Externo",
    fuenteAlicuota: SOURCE_FROM_DB[r.rate_source] ?? "Manual",
    alicuotas: rates,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toRate(r: TaxRateRow): Rate {
  return {
    id: r.id,
    impuestoId: r.tax_id,
    codigo: r.code,
    tipoCalculo: r.calculation_type === "fixed_amount" ? "Monto fijo" : "Porcentaje",
    valor: Number(r.value),
    direccion: ADDRESS_FROM_DB[r.direction] ?? "Ambas",
    descripcion: r.description,
    estado: r.status === "active" ? "Activo" : "Inactivo",
    vigenciaDesde: r.valid_from,
    vigenciaHasta: r.valid_to,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? r.created_at,
  };
}

const OPERATION_FROM_DB: Record<NonNullable<TaxAssignmentRow["operation_type"]>, KindOperation> = {
  deposit: "Depósito",
  withdrawal: "Retiro",
  payment_link: "Link de pago",
  ecommerce: "E-commerce",
};

export function toTaxAssignment(r: TaxAssignmentRow): TaxAssignment {
  const imp = firstOrNull(r.taxes);
  const cli = firstOrNull(r.clientes);
  return {
    id: r.id,
    clienteLegajo: r.client_legajo,
    impuestoId: r.tax_id,
    operacion: r.operation_type ? OPERATION_FROM_DB[r.operation_type] : null,
    estado: r.status === "active" ? "Activo" : "Inactivo",
    tipoCalculo:
      r.custom_calculation_type === "fixed_amount"
        ? "Monto fijo"
        : r.custom_calculation_type === "percentage"
          ? "Porcentaje"
          : null,
    alicuotaPropia: r.custom_rate === null ? null : Number(r.custom_rate),
    fechaAsignacion: r.assigned_at,
    updatedAt: r.updated_at,
    impuesto: imp
      ? {
          codigo: imp.code,
          nombre: imp.name,
          fuenteAlicuota: SOURCE_FROM_DB[imp.rate_source] ?? "Manual",
          alicuotas: Array.isArray(imp.tax_rates) ? imp.tax_rates.map(toRate) : [],
        }
      : null,
    cliente: cli
      ? {
          legajo: cli.legajo,
          nombre: cli.nombre,
          cuit: cli.cuit,
          tipoPersona: cli.tipo_persona,
          correo: cli.correo,
        }
      : null,
  };
}
