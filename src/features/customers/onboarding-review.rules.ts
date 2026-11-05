import type {
  OnboardingReview,
  ReviewDocument,
  ReviewPerson,
  ReviewRequirement,
} from "./onboarding-review.supabase";

export const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  id_frente: "DNI frente",
  id_dorso: "DNI dorso",
  servicio: "Comprobante de servicio",
  selfie: "Selfie",
  poder: "Poder",
  estatuto: "Estatuto o contrato social",
  acta_autoridades: "Acta de autoridades",
  constancia_afip: "Constancia de AFIP",
};

export const MEMBER_ROLE_LABEL: Record<string, string> = {
  holder: "Titular",
  co_holder: "Cotitular",
  legal_representative: "Representante legal",
  attorney: "Apoderado",
  signatory: "Firmante",
};

export const CONTROL_TYPE_LABEL: Record<string, string> = {
  direct_ownership: "Participación directa",
  indirect_ownership: "Participación indirecta",
  voting_control: "Control por votos",
  management_control: "Control de la administración",
  other: "Otro control",
};

export const DOCUMENT_STATUS: Record<
  string,
  { label: string; tone: "success" | "danger" | "warn" | "neutral" }
> = {
  received: { label: "Por revisar", tone: "warn" },
  approved: { label: "Aprobado", tone: "success" },
  rejected: { label: "Rechazado", tone: "danger" },
  expired: { label: "Vencido", tone: "danger" },
};

export const RELATION_STATUS_LABEL: Record<string, string> = {
  pending_identity: "Identidad por confirmar",
  pending_review: "Por aprobar",
  active: "Aprobada",
  rejected: "Rechazada",
  ended: "Finalizada",
};

export const CASE_TRIGGER_LABEL: Record<string, string> = {
  screening_potential_match: "Posible coincidencia en REPET",
  screening_confirmed_match: "Coincidencia confirmada en REPET",
  document_expired: "Documento vencido",
  pep_changed: "Cambió la declaración PEP",
  identity_changed: "Cambiaron datos de identidad",
  no_legal_representative: "La empresa quedó sin representante legal",
};

export const CASE_DECISIONS = [
  { value: "no_action", label: "Sin acción" },
  { value: "request_information", label: "Pedir información" },
  { value: "new_review", label: "Nueva revisión" },
  { value: "restrict_operations", label: "Restringir operaciones" },
  { value: "suspend_account", label: "Suspender cuenta" },
  { value: "close_account", label: "Cerrar cuenta" },
];

export const BLOCKER_LABEL: Record<string, string> = {
  person_not_linked: "Vincular la cuenta con una persona",
  company_profile_incomplete: "Completar los datos de la empresa",
  no_active_legal_representative: "Aprobar al representante legal",
  relationships_pending: "Aprobar a todos los integrantes y beneficiarios",
  kyc_not_passed: "Verificar la identidad de cada persona",
  compliance_not_clear: "Registrar el control REPET de cada persona",
  company_requirements_missing: "Aprobar los documentos de la empresa y validar el CUIT",
  person_requirements_missing: "Aprobar los documentos de cada persona",
};

export const REVIEW_STEPS = ["Enviada", "En revisión", "Aprobada", "Preactivada"];

/** Paso actual de la barra de progreso. -1: la empresa todavia no envio la solicitud. */
export function reviewStepIndex(applicationStatus: string | undefined, customerStatus: string) {
  if (["preactivado", "activado", "activo"].includes(customerStatus.toLowerCase())) return 3;
  if (applicationStatus === "approved") return 2;
  if (applicationStatus === "in_review" || applicationStatus === "changes_requested") return 1;
  if (applicationStatus === "submitted") return 0;
  return -1;
}

export const personRole = (p: ReviewPerson) => (p.kind === "owner" ? "beneficial_owner" : p.role);

export const personLabel = (p: ReviewPerson) =>
  p.kind === "owner"
    ? `Beneficiario final · ${CONTROL_TYPE_LABEL[p.role] ?? p.role}${
        p.ownershipPct != null ? ` · ${p.ownershipPct}%` : ""
      }`
    : (MEMBER_ROLE_LABEL[p.role] ?? p.role);

export const personName = (p: ReviewPerson) => {
  const name =
    `${String(p.declared.first_name ?? "")} ${String(p.declared.last_name ?? "")}`.trim();
  return name || "Sin nombre";
};

const yesNo = (value: unknown) => (value === true ? "Sí" : value === false ? "No" : "No declarado");

/** Lo que la empresa declaro sobre la persona, para comparar con los documentos. */
export const personFacts = (p: ReviewPerson): { label: string; value: string }[] => {
  const d = p.declared;
  const text = (key: string) => (d[key] ? String(d[key]) : "—");
  return [
    { label: "CUIT/CUIL", value: text("tax_id") },
    {
      label: "Documento",
      value:
        `${text("document_type")} ${d.document_number ? String(d.document_number) : ""}`.trim(),
    },
    { label: "Nacimiento", value: text("birth_date") },
    { label: "Nacionalidad", value: text("nationality") },
    { label: "PEP", value: yesNo(d.is_pep) },
    { label: "Ocupación", value: text("occupation") },
    { label: "Origen de fondos", value: text("funds_origin") },
    {
      label: "Domicilio",
      value: [d.address_line1, d.city, d.province].filter(Boolean).join(", ") || "—",
    },
  ];
};

const requiredFor = (
  requirements: ReviewRequirement[],
  subject: "person" | "company",
  kind: string,
  role?: string,
) =>
  requirements.filter(
    (r) =>
      r.subject_kind === subject &&
      r.requirement_kind === kind &&
      (subject === "company" || r.member_role === "any" || r.member_role === role),
  );

export type DocumentSlot = { tipo: string; label: string; document: ReviewDocument | null };

/** Documentos exigidos y los extra que haya subido: lo que falta tambien se muestra. */
function slots(required: ReviewRequirement[], documents: ReviewDocument[]): DocumentSlot[] {
  const codes = [...new Set(required.map((r) => r.requirement_code))];
  const extras = documents.filter((d) => !codes.includes(d.tipo)).map((d) => d.tipo);
  return [...codes, ...new Set(extras)].map((tipo) => ({
    tipo,
    label: DOCUMENT_TYPE_LABEL[tipo] ?? tipo,
    document: documents.find((d) => d.tipo === tipo) ?? null,
  }));
}

export const companyDocumentSlots = (review: OnboardingReview) =>
  slots(
    requiredFor(review.requirements, "company", "document"),
    review.documents.filter((d) => d.submission_id === null),
  );

export const personDocumentSlots = (review: OnboardingReview, person: ReviewPerson) =>
  slots(
    requiredFor(review.requirements, "person", "document", personRole(person)),
    review.documents.filter((d) => d.submission_id === person.submission_id),
  );

export type CheckItem = { label: string; done: boolean };

export function personChecklist(review: OnboardingReview, person: ReviewPerson): CheckItem[] {
  const documents = personDocumentSlots(review, person);
  return [
    {
      label: "Documentos aprobados",
      done: documents.every((s) => s.document?.status === "approved"),
    },
    { label: "Identidad verificada", done: person.person?.kyc_status === "passed" },
    { label: "REPET sin coincidencias", done: person.person?.compliance_status === "clear" },
    { label: "Relación aprobada", done: person.status === "active" },
  ];
}

export function companyChecklist(review: OnboardingReview): CheckItem[] {
  return [
    {
      label: "Documentos aprobados",
      done: companyDocumentSlots(review).every((s) => s.document?.status === "approved"),
    },
    { label: "CUIT validado", done: review.companyTaxIdVerified },
  ];
}
