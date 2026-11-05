// Máquina de estados homologada MolliPay Enterprises ↔ MolliPay Admin
// Flujo: Pendiente verificación → Registrado → Preactivado → Activado
//        + ramas: Suspendido / Deshabilitado
//        + Eliminado = borrado físico (no es estado almacenado, solo si no tiene movimientos)
// Compartible entre ambos proyectos (sin dependencias de UI).

export const STATUSES_CUSTOMER = [
  "pendiente_verificacion",
  "registrado",
  "preactivado",
  "activado",
  "suspendido",
  "deshabilitado",
  "eliminado",
] as const;

export type StatusCustomerNew = (typeof STATUSES_CUSTOMER)[number];

// Valores legacy que existen en prod: mapear sin romper datos existentes
export const STATUS_LEGACY_MAP: Record<string, StatusCustomerNew> = {
  activo: "activado",
  suspendido: "suspendido",
  rechazado: "deshabilitado",
};

export function normalizeStatus(raw: string): StatusCustomerNew {
  const v = raw?.trim().toLowerCase();
  if ((STATUSES_CUSTOMER as readonly string[]).includes(v)) return v as StatusCustomerNew;
  if (v in STATUS_LEGACY_MAP) return STATUS_LEGACY_MAP[v];
  // fallback: si valor desconocido, tratar como registrado (onboarding incompleto)
  return "registrado";
}

export const STATUS_LABEL: Record<StatusCustomerNew, string> = {
  pendiente_verificacion: "Pendiente de verificación de email",
  registrado: "Registrado",
  preactivado: "Preactivado",
  activado: "Activado",
  suspendido: "Suspendido",
  deshabilitado: "Deshabilitado",
  eliminado: "Eliminado",
};

export const STATUS_TONE: Record<StatusCustomerNew, "neutral" | "warn" | "success" | "danger"> = {
  pendiente_verificacion: "warn",
  registrado: "neutral",
  preactivado: "warn",
  activado: "success",
  suspendido: "danger",
  deshabilitado: "neutral",
  eliminado: "danger",
};

// Para filtros desplegables (§7) — Eliminado NO es un estado almacenado, es borrado físico; se excluye del filtro
export const FILTER_STATUSES_OPTIONS: string[] = STATUSES_CUSTOMER.filter(
  (e) => e !== "eliminado",
).map((e) => STATUS_LABEL[e]);

// Reverse lookup label -> estado
export const LABEL_A_STATUS: Record<string, StatusCustomerNew> = Object.fromEntries(
  Object.entries(STATUS_LABEL).map(([k, v]) => [v, k as StatusCustomerNew]),
) as Record<string, StatusCustomerNew>;

export type TransicionContext = {
  hasCbu: boolean;
  hasComision: boolean;
  hasMovimientos: boolean;
  // opcional: flags derivados para auditoría
  emailVerificado?: boolean;
  onboardingCompleto?: boolean;
};

export type Transicion = {
  from: StatusCustomerNew;
  to: StatusCustomerNew;
  accion: string;
  requiere?: (ctx: TransicionContext) => boolean;
  descripcion: string;
};

// Transiciones válidas (sin contar eliminación que tiene guard especial)
const TRANSICIONES: Transicion[] = [
  {
    from: "pendiente_verificacion",
    to: "registrado",
    accion: "verificar_email",
    descripcion: "Verificación de email",
  },
  {
    from: "registrado",
    to: "preactivado",
    accion: "aprobar_documentacion",
    descripcion: "Aprobación de documentación",
  },
  {
    from: "preactivado",
    to: "activado",
    accion: "activar",
    requiere: (ctx) => ctx.hasCbu && ctx.hasComision,
    descripcion: "Activación requiere CBU + comisión",
  },
  {
    from: "activado",
    to: "suspendido",
    accion: "suspender",
    descripcion: "Suspensión manual",
  },
  {
    from: "suspendido",
    to: "activado",
    accion: "reactivar",
    descripcion: "Reactivación desde suspensión",
  },
  // Deshabilitar: desde cualquier estado operativo hacia deshabilitado (excepto eliminado)
  // Se modela como transición libre con guard de que no esté ya deshabilitado/eliminado
  // y que conserve historial (no borra).
  {
    from: "activado",
    to: "deshabilitado",
    accion: "deshabilitar",
    descripcion: "Deshabilitación (cancela CBU, conserva historial)",
  },
  {
    from: "suspendido",
    to: "deshabilitado",
    accion: "deshabilitar",
    descripcion: "Deshabilitación desde suspendido",
  },
  {
    from: "preactivado",
    to: "deshabilitado",
    accion: "deshabilitar",
    descripcion: "Deshabilitación desde preactivado",
  },
  {
    from: "registrado",
    to: "deshabilitado",
    accion: "deshabilitar",
    descripcion: "Deshabilitación desde registrado",
  },
  {
    from: "pendiente_verificacion",
    to: "deshabilitado",
    accion: "deshabilitar",
    descripcion: "Deshabilitación desde pendiente",
  },
];

function esTransicionValida(
  from: StatusCustomerNew,
  to: StatusCustomerNew,
): Transicion | undefined {
  return TRANSICIONES.find((t) => t.from === from && t.to === to);
}

export function canTransicionar(
  fromRaw: string,
  toRaw: string,
  ctx: TransicionContext,
): { ok: boolean; motivo?: string } {
  const from = normalizeStatus(fromRaw);
  const to = normalizeStatus(toRaw);

  if (from === to) return { ok: false, motivo: "El usuario ya está en ese estado." };

  // Eliminación: guard estricto hasMovimientos
  if (to === "eliminado") {
    if (ctx.hasMovimientos) {
      return {
        ok: false,
        motivo:
          "No se puede eliminar: el usuario tiene movimientos. Solo puede deshabilitarse (BCRA auditoría).",
      };
    }
    if (from === "eliminado" || from === "deshabilitado") {
      return { ok: false, motivo: "El usuario ya está deshabilitado/eliminado." };
    }
    return { ok: true };
  }

  // Deshabilitado es terminal salvo eliminación bloqueada; no se puede salir de deshabilitado/eliminado hacia activo
  if (from === "deshabilitado" || from === "eliminado") {
    return { ok: false, motivo: "Un usuario deshabilitado/eliminado no puede cambiar de estado." };
  }

  const t = esTransicionValida(from, to);
  if (!t)
    return {
      ok: false,
      motivo: `Transición no permitida: ${STATUS_LABEL[from]} → ${STATUS_LABEL[to]}.`,
    };

  if (t.requiere && !t.requiere(ctx)) {
    if (to === "activado") {
      const faltantes: string[] = [];
      if (!ctx.hasCbu) faltantes.push("CBU");
      if (!ctx.hasComision) faltantes.push("comisión");
      return { ok: false, motivo: `No se puede activar: faltan ${faltantes.join(" y ")}.` };
    }
    return { ok: false, motivo: "No se cumplen los requisitos para esta transición." };
  }

  return { ok: true };
}

export type ActionAvailable = {
  key: string;
  label: string;
  target: StatusCustomerNew;
  variant?: "default" | "danger";
};

// Acciones que el admin puede ejecutar según estado actual
export function actionsForStatus(statusRaw: string, ctx: TransicionContext): ActionAvailable[] {
  const status = normalizeStatus(statusRaw);
  const actions: ActionAvailable[] = [];

  if (status === "eliminado" || status === "deshabilitado") {
    // terminal: solo lectura
    return [];
  }

  if (status === "registrado") {
    actions.push({
      key: "aprobar_documentacion",
      label: "Preactivar (aprobar documentación)",
      target: "preactivado",
    });
  }

  if (status === "preactivado") {
    const canActivar = ctx.hasCbu && ctx.hasComision;
    actions.push({
      key: "activar",
      label: canActivar ? "Activar" : "Activar (requiere CBU + comisión)",
      target: "activado",
    });
  }

  if (status === "activado") {
    actions.push({ key: "suspender", label: "Suspender", target: "suspendido", variant: "danger" });
  }

  if (status === "suspendido") {
    actions.push({ key: "reactivar", label: "Reactivar", target: "activado" });
  }

  // Deshabilitar: disponible desde cualquier estado no terminal
  actions.push({
    key: "deshabilitar",
    label: "Deshabilitar",
    target: "deshabilitado",
    variant: "danger",
  });

  // Eliminar: solo si no tiene movimientos
  if (!ctx.hasMovimientos) {
    actions.push({ key: "eliminar", label: "Eliminar", target: "eliminado", variant: "danger" });
  }

  return actions;
}

// Helper para Enterprises: flujo de onboarding
export function siguienteStepOnboarding(statusRaw: string): string {
  const e = normalizeStatus(statusRaw);
  switch (e) {
    case "pendiente_verificacion":
      return "Verificar email para pasar a Registrado";
    case "registrado":
      return "Completar onboarding y esperar aprobación de documentación";
    case "preactivado":
      return "Generar CBU y cargar comisión para activar";
    case "activado":
      return "Usuario operativo";
    case "suspendido":
      return "Usuario suspendido temporalmente";
    case "deshabilitado":
      return "Usuario deshabilitado (CBU cancelado, historial conservado)";
    case "eliminado":
      return "Usuario eliminado (sin movimientos)";
    default:
      return "";
  }
}
