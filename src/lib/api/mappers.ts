import type {
  AdminUser,
  AdminUserRow,
  ApiEndpoint,
  ApiEndpointInput,
  ApiEndpointRow,
  ApiRestriccion,
  ApiRestriccionInput,
  ApiRestriccionRow,
  ApiUsuario,
  ApiUsuarioInput,
  ApiUsuarioRow,
  CanalNotificacion,
  CanalNotificacionInput,
  CanalNotificacionRow,
  CodigoError,
  CodigoErrorInput,
  CodigoErrorRow,
  Cliente,
  ClienteRow,
  Comercio,
  ComercioRow,
  ComisionCliente,
  ComisionClienteRow,
  DcExcepcion,
  DcExcepcionRow,
  DcSyncRetroactivo,
  DcSyncRetroactivoRow,
  EstadoEntrega,
  EventoNotificacion,
  EventoNotificacionInput,
  EventoNotificacionRow,
  Impuesto,
  ImpuestoRow,
  ImpuestoAsignacion,
  ImpuestoAsignacionRow,
  Alicuota,
  AlicuotaRow,
  IbPadron,
  IbPadronRow,
  IbNormalizacionPreview,
  IbNormalizacionPreviewRow,
  Integracion,
  IntegracionRow,
  Movimiento,
  MovimientoRow,
  PuntoVenta,
  PuntoVentaRow,
  Resolver,
  ResolverRow,
  TipoPersona,
  CodigoCategoria,
  CodigoCategoriaRow,
  EstadoApiUsuario,
  TipoImpuesto,
} from "./types";

export function toCliente(r: ClienteRow): Cliente {
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
  };
}

export function toComision(
  r: ComisionClienteRow & {
    clientes?:
      | {
          legajo: string;
          correo: string;
          cuit: string;
          nombre: string;
          tipo_persona: TipoPersona;
        }[]
      | null;
  },
): ComisionCliente {
  const cli = Array.isArray(r.clientes) ? (r.clientes[0] ?? null) : (r.clientes ?? null);
  return {
    id: r.id,
    clienteId: r.cliente_id,
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

export function toMovimiento(
  r: MovimientoRow & {
    clientes?: { correo: string; nombre: string; cuit: string }[] | null;
  },
): Movimiento {
  const cli = Array.isArray(r.clientes) ? (r.clientes[0] ?? null) : (r.clientes ?? null);
  const estadoArr = Array.isArray(r.estados_movimiento) ? r.estados_movimiento : null;
  const estado = estadoArr && estadoArr.length ? estadoArr[0] : null;
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
    estadoCodigo: estado?.codigo,
    estadoNombre: estado?.nombre,
    esFinal: estado?.es_final,
    fecha: r.fecha,
    createdAt: r.created_at,
    cliente: cli,
  };
}

export function toAdminUser(r: AdminUserRow): AdminUser {
  return {
    id: r.id,
    legajo: r.legajo,
    email: r.email,
    nombre: r.nombre,
    rolId: r.rol_id,
    activo: r.activo,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function firstOrNull<T>(v: T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return (v as T | null) ?? null;
}

export function toPuntoVenta(r: PuntoVentaRow): PuntoVenta {
  return {
    id: r.id,
    comercioId: r.comercio_id,
    nombre: r.nombre,
    estado: r.estado,
    createdAt: r.created_at,
  };
}

export function toComercio(
  r: ComercioRow & {
    clientes?:
      | {
          legajo: string;
          nombre: string;
          cuit: string;
          tipo_persona: TipoPersona;
          correo: string;
        }[]
      | null;
    codigos_categoria?: CodigoCategoriaRow[] | null;
    puntos_venta?: PuntoVentaRow[] | null;
  },
): Comercio {
  const cli = firstOrNull(r.clientes);
  const cat = firstOrNull(r.codigos_categoria);
  const pdvs = (r.puntos_venta ?? []) as PuntoVentaRow[];
  return {
    id: r.id,
    usuario: r.usuario,
    legajo: r.legajo,
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
    puntosVenta: pdvs.map(toPuntoVenta),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toCodigoCategoria(r: CodigoCategoriaRow): CodigoCategoria {
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

export function toApiUsuario(r: ApiUsuarioRow): ApiUsuario {
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

export function toApiEndpoint(r: ApiEndpointRow): ApiEndpoint {
  return {
    id: r.id,
    nombre: r.nombre,
    path: r.path,
    metodo: r.metodo,
    descripcion: r.descripcion,
    grupo: r.grupo,
    estado: r.estado,
    rec: r.rec,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toApiRestriccion(
  r: ApiRestriccionRow & {
    api_usuarios?:
      | {
          id: string;
          codigo_usuario_api: string;
          usuario: string;
          nombre_completo: string;
          estado: EstadoApiUsuario;
        }[]
      | null;
  },
): ApiRestriccion {
  const u = Array.isArray(r.api_usuarios) ? r.api_usuarios[0] : null;
  return {
    id: r.id,
    apiUsuarioId: r.api_usuario_id,
    apiUsuario: u
      ? {
          id: u.id,
          codigoUsuarioApi: u.codigo_usuario_api,
          usuario: u.usuario,
          nombreCompleto: u.nombre_completo,
          estado: u.estado,
        }
      : null,
    estado: r.estado,
    fechaCreacion: r.fecha_creacion,
    fechaExpiracion: r.fecha_expiracion,
    createdAt: r.created_at,
  };
}

export function toIntegracion(r: IntegracionRow): Integracion {
  return {
    id: r.id,
    nombre: r.nombre,
    proveedor: r.proveedor,
    createdAt: r.created_at,
  };
}

export function toCodigoError(r: CodigoErrorRow): CodigoError {
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

export function toCanalNotificacion(r: CanalNotificacionRow): CanalNotificacion {
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

export function toEventoNotificacion(
  r: EventoNotificacionRow & {
    codigos_error?: { codigo: string; mensaje: string }[] | null;
  },
): EventoNotificacion {
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

export function toImpuesto(
  r: ImpuestoRow & { impuestos_alicuotas?: AlicuotaRow[] | null },
): Impuesto {
  const alicuotas = Array.isArray(r.impuestos_alicuotas)
    ? r.impuestos_alicuotas.map(toAlicuota)
    : [];
  return {
    id: r.id,
    codigo: r.codigo,
    nombre: r.nombre,
    descripcion: r.descripcion,
    tipo: r.tipo,
    monto: r.monto,
    estado: r.estado,
    alicuotas,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toAlicuota(r: AlicuotaRow): Alicuota {
  return {
    id: r.id,
    impuestoId: r.impuesto_id,
    codigo: r.codigo,
    tasa: r.tasa,
    descripcion: r.descripcion,
    estado: r.estado,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? r.created_at,
  };
}

export function toImpuestoAsignacion(
  r: ImpuestoAsignacionRow & {
    impuestos?:
      { codigo: string; nombre: string; tipo: TipoImpuesto; monto: number | null }[] | null;
    clientes?:
      | {
          legajo: string;
          nombre: string;
          cuit: string;
          tipo_persona: TipoPersona;
          correo: string;
        }[]
      | null;
  },
): ImpuestoAsignacion {
  const imp = firstOrNull(r.impuestos);
  const cli = firstOrNull(r.clientes);
  return {
    id: r.id,
    clienteLegajo: r.legajo,
    impuestoId: r.impuesto_id,
    tipo: r.tipo,
    monto: r.monto,
    estado: r.estado,
    fechaAsignacion: r.fecha_asignacion,
    impuesto: imp
      ? {
          codigo: imp.codigo,
          nombre: imp.nombre,
          tipo: imp.tipo,
          monto: imp.monto,
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

export function toIbPadron(r: IbPadronRow): IbPadron {
  return {
    id: r.id,
    impuestoId: r.impuesto_id,
    nombre: r.nombre,
    archivo: r.archivo,
    estado: r.estado,
    progreso: r.progreso,
    createdAt: r.created_at,
  };
}

export function toIbNormalizacionPreview(r: IbNormalizacionPreviewRow): IbNormalizacionPreview {
  return {
    id: r.id,
    padronId: r.padron_id,
    kpisJson: r.kpis_json,
    creadosJson: r.creados_json,
    desactivadosJson: r.desactivados_json,
    omitidosJson: r.omitidos_json,
    aplicado: r.aplicado,
    createdAt: r.created_at,
  };
}

export function toDcExcepcion(r: DcExcepcionRow): DcExcepcion {
  return {
    id: r.id,
    email: r.usuario,
    cuit: r.cuit,
    tipo: r.tipo,
    direccion: r.direccion,
    motivo: r.motivo,
    vigenciaDesde: r.vigencia_desde,
    vigenciaHasta: r.vigencia_hasta,
    autorizacionCodigo: r.autorizacion_codigo,
    estado: r.estado,
    createdAt: r.fecha_creacion,
    updatedAt: r.fecha_actualizacion,
  };
}

export function toDcSyncRetroactivo(r: DcSyncRetroactivoRow): DcSyncRetroactivo {
  return {
    id: r.id,
    cuit: r.cuit,
    desde: r.desde,
    hasta: r.hasta,
    previewJson: r.preview_json,
    aplicado: r.aplicado,
    createdAt: r.created_at,
  };
}
