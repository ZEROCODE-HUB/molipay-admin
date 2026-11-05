import {
type AlertItem,
type AlertResolution,
} from "@/features/regulatory-reports/compliance.supabase";

export type Ruling = { alert: AlertItem; resolution: AlertResolution };
