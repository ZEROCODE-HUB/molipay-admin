export const SEGMENT_LABELS = {
  all: "Todos",
  payment_links: "Módulo Link de pago",
  merchants: "Comercios",
  active_users: "Usuarios activos",
} as const;

export const CHANNEL_LABELS = {
  email: "Email",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
} as const;

export const STATUS_LABELS = {
  pending: "Pendiente",
  sent: "Enviado",
  failed: "Fallido",
} as const;

export type BroadcastSegment = keyof typeof SEGMENT_LABELS;
export type BroadcastChannel = keyof typeof CHANNEL_LABELS;
export type BroadcastStatus = keyof typeof STATUS_LABELS;

export type BroadcastDraft = {
  subject: string;
  segment: BroadcastSegment;
  channel: BroadcastChannel;
  message: string;
};

/** Fila lista para la tabla: textos en español para que filtren como se ven. */
export type IncidentBroadcast = {
  id: string;
  subject: string;
  segment: string;
  channel: string;
  date: string;
  status: string;
  statusCode: BroadcastStatus;
  message: string;
};
