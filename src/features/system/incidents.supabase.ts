import { requireSupabase } from "@/infrastructure/supabase/client";
import { toAppError } from "@/infrastructure/supabase/errors";
import {
  CHANNEL_LABELS,
  SEGMENT_LABELS,
  STATUS_LABELS,
  type BroadcastChannel,
  type BroadcastDraft,
  type BroadcastSegment,
  type BroadcastStatus,
  type IncidentBroadcast,
} from "@/features/system/incidents.types";

const COLUMNS = "id, subject, segment, channel, message, status, created_at";
const MAX_ROWS = 500;

type BroadcastRow = {
  id: number;
  subject: string;
  segment: BroadcastSegment;
  channel: BroadcastChannel;
  message: string;
  status: BroadcastStatus;
  created_at: string;
};

const toDateLabel = (iso: string) =>
  new Date(iso)
    .toLocaleString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" })
    .slice(0, 16);

const toBroadcast = (r: BroadcastRow): IncidentBroadcast => ({
  id: `MSG-${String(r.id).padStart(3, "0")}`,
  subject: r.subject,
  segment: SEGMENT_LABELS[r.segment],
  channel: CHANNEL_LABELS[r.channel],
  date: toDateLabel(r.created_at),
  status: STATUS_LABELS[r.status],
  statusCode: r.status,
  message: r.message,
});

export async function listIncidentBroadcasts(): Promise<IncidentBroadcast[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("incident_broadcasts")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  if (error) throw toAppError(error);
  return ((data ?? []) as BroadcastRow[]).map(toBroadcast);
}

export async function createIncidentBroadcast(draft: BroadcastDraft): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("incident_broadcasts").insert(draft);
  if (error) throw toAppError(error);
}
