import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";

export type DocumentKind =
  | "id_frente"
  | "id_dorso"
  | "servicio"
  | "selfie"
  | "poder"
  | "estatuto"
  | "acta_autoridades"
  | "constancia_afip";

export const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  id_frente: "DNI anverso",
  id_dorso: "DNI reverso",
  servicio: "Comprobante de servicio",
  selfie: "Selfie de verificación",
  poder: "Poder",
  estatuto: "Estatuto o contrato social",
  acta_autoridades: "Acta de designación de autoridades",
  constancia_afip: "Constancia de inscripción en AFIP",
};

export type Document = {
  id: string;
  clienteLegajo: string;
  tipo: DocumentKind;
  url: string | null;
  label: string;
  createdAt: string;
};

type DocumentRow = {
  id: string;
  cliente_legajo: string;
  tipo: DocumentKind;
  url: string | null;
  label: string;
  created_at: string;
};

const COLUMNS = "id, cliente_legajo, tipo, url, label, created_at";

function toDocument(r: DocumentRow): Document {
  return {
    id: r.id,
    clienteLegajo: r.cliente_legajo,
    tipo: r.tipo,
    url: r.url,
    label: r.label,
    createdAt: r.created_at,
  };
}

export async function listDocuments(customerLegajo: string): Promise<Document[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("documentos")
    .select(COLUMNS)
    .eq("cliente_legajo", customerLegajo)
    .neq("status", "superseded")
    .order("created_at", { ascending: false });
  if (error) throw toAppError(error);
  return ((data as DocumentRow[]) ?? []).map(toDocument);
}

export type DocumentInput = {
  tipo: DocumentKind;
  url?: string;
  label?: string;
};

export async function createDocument(
  customerLegajo: string,
  input: DocumentInput,
): Promise<Document> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("documentos")
    .insert({
      cliente_legajo: customerLegajo,
      tipo: input.tipo,
      url: input.url ?? null,
      label: input.label ?? DOCUMENT_LABELS[input.tipo],
    })
    .select(COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toDocument(data as DocumentRow);
}
