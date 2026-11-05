import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";

/** Lectura y acciones de la revision del onboarding. Las reglas viven en las funciones de la base. */

type Declared = Record<string, unknown>;
type PersonSummary = {
  first_name: string;
  last_name: string;
  kyc_status: string;
  compliance_status: string;
} | null;

export type ReviewApplication = {
  id: string;
  process: string;
  status: string;
  submitted_at: string | null;
  review_due_at: string | null;
  review_overdue_at: string | null;
  internal_reason: string | null;
};
export type ReviewPerson = {
  id: string;
  kind: "member" | "owner";
  submission_id: string;
  person_id: string | null;
  status: string;
  /** Caracter del integrante o tipo de control del beneficiario. */
  role: string;
  ownershipPct: number | null;
  submissionStatus: string;
  declared: Declared;
  person: PersonSummary;
};
export type ReviewDocument = {
  id: string;
  tipo: string;
  url: string | null;
  label: string;
  status: string;
  version: number;
  submission_id: string | null;
  uploaded_by: string | null;
  created_at: string;
  cliente_legajo: string;
};
export type ReviewCase = {
  id: string;
  trigger_kind: string;
  priority: string;
  person_id: string | null;
  opened_at: string;
};
export type ReviewCompany = {
  legal_name: string;
  trade_name: string | null;
  company_type: string | null;
  identification_type: string | null;
  registration_date: string | null;
};
export type ReviewRequirement = {
  subject_kind: string;
  member_role: string;
  requirement_kind: string;
  requirement_code: string;
};
export type OnboardingReview = {
  application: ReviewApplication | null;
  company: ReviewCompany | null;
  people: ReviewPerson[];
  documents: ReviewDocument[];
  cases: ReviewCase[];
  blockers: string[];
  requirements: ReviewRequirement[];
  companyTaxIdVerified: boolean;
};
export type MatchCandidate = {
  id: string;
  tax_id: string | null;
  document_number: string | null;
  first_name: string;
  last_name: string;
  kyc_status: string;
};

const context = (operation: string) => ({ feature: "customers", operation });

export async function getOnboardingReview(customerId: string): Promise<OnboardingReview> {
  const sb = requireSupabase();
  const relation =
    "person_submissions!{fk}(declared, status), people(first_name, last_name, kyc_status, compliance_status)";
  const [application, company, members, owners, documents, cases, requirements, taxId] =
    await Promise.all([
      sb
        .from("onboarding_applications")
        .select(
          "id, process, status, submitted_at, review_due_at, review_overdue_at, internal_reason",
        )
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb
        .from("company_profiles")
        .select("legal_name, trade_name, company_type, identification_type, registration_date")
        .eq("customer_id", customerId)
        .maybeSingle(),
      sb
        .from("company_members")
        .select(
          `id, submission_id, person_id, status, role, ${relation.replace("{fk}", "company_members_submission_company_fk")}`,
        )
        .eq("company_id", customerId)
        .order("created_at"),
      sb
        .from("company_beneficial_owners")
        .select(
          `id, submission_id, person_id, status, control_type, ownership_pct, ${relation.replace("{fk}", "beneficial_owners_submission_company_fk")}`,
        )
        .eq("company_id", customerId)
        .order("created_at"),
      sb
        .from("documentos")
        .select(
          "id, tipo, url, label, status, version, submission_id, uploaded_by, created_at, cliente_legajo",
        )
        .eq("customer_id", customerId)
        .neq("status", "superseded")
        .order("created_at"),
      sb
        .from("compliance_cases")
        .select("id, trigger_kind, priority, person_id, opened_at")
        .eq("customer_id", customerId)
        .eq("status", "open")
        .order("opened_at"),
      sb
        .from("onboarding_requirements")
        .select("subject_kind, member_role, requirement_kind, requirement_code")
        .eq("process", "initial_onboarding")
        .eq("customer_kind", "juridica")
        .eq("is_required", true),
      sb
        .from("identity_verifications")
        .select("status")
        .eq("customer_id", customerId)
        .eq("check_type", "tax_id")
        .order("performed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  for (const r of [application, company, members, owners, documents, cases, requirements, taxId]) {
    if (r.error) throw toAppError(r.error, context("review"));
  }

  type Row = {
    id: string;
    submission_id: string;
    person_id: string | null;
    status: string;
    role?: string;
    control_type?: string;
    ownership_pct?: number | null;
    person_submissions: { declared: Declared; status: string };
    people: PersonSummary;
  };
  const toPerson = (r: Row, kind: "member" | "owner"): ReviewPerson => ({
    id: r.id,
    kind,
    submission_id: r.submission_id,
    person_id: r.person_id,
    status: r.status,
    role: (kind === "member" ? r.role : r.control_type) ?? "",
    ownershipPct: r.ownership_pct ?? null,
    submissionStatus: r.person_submissions.status,
    declared: r.person_submissions.declared,
    person: r.people,
  });

  const app = application.data as ReviewApplication | null;
  let blockers: string[] = [];
  if (app) {
    const { data, error } = await sb.rpc("application_blockers", { p_application: app.id });
    if (error) throw toAppError(error, context("blockers"));
    blockers = (data as string[]) ?? [];
  }
  return {
    application: app,
    company: company.data as ReviewCompany | null,
    people: [
      ...((members.data ?? []) as unknown as Row[]).map((r) => toPerson(r, "member")),
      ...((owners.data ?? []) as unknown as Row[]).map((r) => toPerson(r, "owner")),
    ],
    documents: (documents.data ?? []) as ReviewDocument[],
    cases: (cases.data ?? []) as ReviewCase[],
    blockers,
    requirements: (requirements.data ?? []) as ReviewRequirement[],
    companyTaxIdVerified: (taxId.data as { status: string } | null)?.status === "passed",
  };
}

export async function listMatchCandidates(submissionId: string): Promise<MatchCandidate[]> {
  const { data, error } = await requireSupabase().rpc("person_match_candidates", {
    p_submission: submissionId,
  });
  if (error) throw toAppError(error, context("candidates"));
  return (data ?? []) as MatchCandidate[];
}

async function call(fn: string, args: Record<string, unknown>) {
  const { error } = await requireSupabase().rpc(fn, args);
  if (error) throw toAppError(error, context(fn));
}

export const resolveSubmission = (
  id: string,
  action: string,
  person: string | null,
  reason: string,
) =>
  call("person_submission_resolve", {
    p_submission: id,
    p_action: action,
    p_person: person,
    p_reason: reason,
  });
export const approveRelationship = (kind: "member" | "owner", id: string) =>
  kind === "member"
    ? call("company_member_approve", { p_member: id })
    : call("beneficial_owner_approve", { p_owner: id });
export const reviewDocument = (id: string, decision: string, reason: string | null) =>
  call("document_review", { p_document: id, p_decision: decision, p_reason: reason });
export const recordVerification = (
  subject: { person?: string; customer?: string },
  check: string,
  status: string,
) =>
  call("identity_verification_record", {
    p_person: subject.person ?? null,
    p_customer: subject.customer ?? null,
    p_check: check,
    p_status: status,
    p_evidence: null,
    p_expires: null,
  });
export const recordScreening = (subject: { person?: string; customer?: string }, status: string) =>
  call("compliance_screening_record", {
    p_person: subject.person ?? null,
    p_customer: subject.customer ?? null,
    p_list: "REPET",
    p_version: null,
    p_status: status,
    p_match: null,
    p_resolves: null,
  });
export const resolveCase = (id: string, decision: string, reason: string) =>
  call("compliance_case_resolve", { p_case: id, p_decision: decision, p_reason: reason });
export const startApplicationReview = (id: string) =>
  call("application_start_review", { p_application: id });
export const decideApplication = (id: string, decision: string, reason: string | null) =>
  call("application_decide", {
    p_application: id,
    p_decision: decision,
    p_reason: reason,
    p_message_code: null,
  });
export const preactivateCustomer = (customerId: string) =>
  call("customer_preactivate", { p_customer: customerId });
