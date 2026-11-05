import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Check, CheckCircle2, Circle, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useDocumentsUrls } from "@/features/customers/document-url.hooks";
import {
  BLOCKER_LABEL,
  CASE_DECISIONS,
  CASE_TRIGGER_LABEL,
  DOCUMENT_TYPE_LABEL,
  RELATION_STATUS_LABEL,
  REVIEW_STEPS,
  companyChecklist,
  companyDocumentSlots,
  personChecklist,
  personDocumentSlots,
  personFacts,
  personLabel,
  personName,
  reviewStepIndex,
  type CheckItem,
} from "@/features/customers/onboarding-review.rules";
import {
  approveRelationship,
  decideApplication,
  getOnboardingReview,
  listMatchCandidates,
  preactivateCustomer,
  recordScreening,
  recordVerification,
  resolveCase,
  resolveSubmission,
  reviewDocument,
  startApplicationReview,
  type OnboardingReview,
  type ReviewDocument,
  type ReviewPerson,
} from "@/features/customers/onboarding-review.supabase";
import { userMessage } from "@/shared/lib/errors";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline, BtnPrimary } from "@/shared/ui/button";
import { useConfirm } from "@/shared/ui/confirm-provider";
import { FormDialog } from "@/shared/ui/form-dialog";
import { CustomerSection } from "./customer-section";
import { DocumentGrid, DocumentViewer, type ViewerDocument } from "./onboarding-documents";

type RunAction = (key: string, run: () => Promise<unknown>, done: string) => void;
type ReasonRequest = {
  title: string;
  description: string;
  submitLabel: string;
  key: string;
  done: string;
  run: (reason: string) => Promise<unknown>;
};

function ActionButton({
  actionKey,
  pendingKey,
  primary,
  children,
  disabled,
  onClick,
}: {
  actionKey: string;
  pendingKey: string | null;
  primary?: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  const Btn = primary ? BtnPrimary : BtnOutline;
  return (
    <Btn className="h-9 px-3 text-xs" disabled={disabled || pendingKey !== null} onClick={onClick}>
      {pendingKey === actionKey && <Loader2 size={14} className="animate-spin" aria-hidden />}
      {children}
    </Btn>
  );
}

function Checklist({ items }: { items: CheckItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          {i.done ? (
            <CheckCircle2 size={14} className="text-emerald-600" aria-label="Completo" />
          ) : (
            <Circle size={14} className="text-muted-foreground/50" aria-label="Pendiente" />
          )}
          <span className={i.done ? "" : "text-muted-foreground"}>{i.label}</span>
        </li>
      ))}
    </ul>
  );
}

function StepBar({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-1" aria-label="Avance de la solicitud">
      {REVIEW_STEPS.map((label, i) => (
        <li key={label} className="flex min-w-0 flex-1 items-center gap-1.5">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
              i <= current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
            aria-current={i === current ? "step" : undefined}
          >
            {i < current ? <Check size={13} aria-hidden /> : i + 1}
          </span>
          <span
            className={`truncate text-xs ${i === current ? "font-semibold" : "text-muted-foreground"}`}
          >
            {label}
          </span>
          {i < REVIEW_STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
        </li>
      ))}
    </ol>
  );
}

function ReasonDialog({
  request,
  onClose,
}: {
  request: ReasonRequest;
  onClose: (reason?: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <FormDialog
      open
      onClose={() => onClose()}
      title={request.title}
      description={request.description}
      submitLabel={request.submitLabel}
      onSubmit={() => {
        if (reason.trim()) onClose(reason.trim());
      }}
    >
      <label className="block">
        <span className="mb-1 block text-xs font-semibold">Motivo interno</span>
        <textarea
          autoFocus
          required
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-[11px] text-muted-foreground">
          El cliente no ve este motivo.
        </span>
      </label>
    </FormDialog>
  );
}

function IdentityMatch({
  person,
  pendingKey,
  ask,
}: {
  person: ReviewPerson;
  pendingKey: string | null;
  ask: (request: ReasonRequest) => void;
}) {
  const candidates = useQuery({
    queryKey: ["onboarding-candidatos", person.submission_id],
    queryFn: () => listMatchCandidates(person.submission_id),
  });
  const link = (id: string, action: string, title: string, done: string) =>
    ask({
      title,
      description: `Decidí si ${personName(person)} es esta persona.`,
      submitLabel: "Confirmar",
      key: `match-${person.id}`,
      done,
      run: (reason) => resolveSubmission(person.submission_id, action, id, reason),
    });
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs dark:bg-amber-950/20">
      <p className="font-semibold">
        Este CUIL ya existe en MoliPay: confirmá si es la misma persona.
      </p>
      <p className="mb-2 text-muted-foreground">La empresa no sabe de esta coincidencia.</p>
      {candidates.data?.map((c) => (
        <div
          key={c.id}
          className="flex flex-wrap items-center gap-2 border-t border-amber-200 py-2"
        >
          <span className="flex-1">
            {c.first_name} {c.last_name} · {c.tax_id ?? c.document_number} · KYC {c.kyc_status}
          </span>
          <ActionButton
            actionKey={`match-${person.id}`}
            pendingKey={pendingKey}
            onClick={() =>
              link(c.id, "link_existing", "Vincular sin cambiar sus datos", "Persona vinculada")
            }
          >
            Es la misma, sin cambiar datos
          </ActionButton>
          <ActionButton
            actionKey={`match-${person.id}`}
            pendingKey={pendingKey}
            onClick={() =>
              link(
                c.id,
                "apply_to_existing",
                "Vincular y actualizar sus datos",
                "Persona vinculada y actualizada",
              )
            }
          >
            Es la misma, actualizar datos
          </ActionButton>
        </div>
      ))}
      <ActionButton
        actionKey={`match-${person.id}`}
        pendingKey={pendingKey}
        onClick={() =>
          ask({
            title: "Rechazar declaración",
            description: `Se rechaza lo declarado sobre ${personName(person)}.`,
            submitLabel: "Rechazar",
            key: `match-${person.id}`,
            done: "Declaración rechazada",
            run: (reason) => resolveSubmission(person.submission_id, "reject", null, reason),
          })
        }
      >
        Rechazar declaración
      </ActionButton>
    </div>
  );
}

/** Revision del alta. La base decide si cada accion esta permitida y si se puede aprobar. */
export function CustomerOnboardingTab({
  customerId,
  legajo,
  customerStatus,
  onCustomerChanged,
}: {
  customerId: string;
  legajo: string;
  customerStatus: string;
  onCustomerChanged: () => void;
}) {
  const qc = useQueryClient();
  const askConfirm = useConfirm();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [reasonRequest, setReasonRequest] = useState<ReasonRequest | null>(null);
  const key = ["onboarding-revision", customerId];
  const query = useQuery({
    queryKey: key,
    queryFn: () => getOnboardingReview(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
  const review = query.data;
  const documents = review?.documents ?? [];
  const { urls, thumbs } = useDocumentsUrls(documents, legajo);

  const mutation = useMutation({
    mutationFn: async ({ run }: { key: string; run: () => Promise<unknown>; done: string }) => {
      await run();
      // Espera los datos nuevos: el boton sigue ocupado hasta que la pantalla refleja el cambio.
      await qc.invalidateQueries({ queryKey: key });
    },
    onSuccess: (_d, { done }) => {
      toast.success(done);
      void qc.invalidateQueries({ queryKey: ["onboarding-candidatos"] });
    },
    onError: (e) => toast.error(userMessage(e)),
  });
  const pendingKey = mutation.isPending ? mutation.variables.key : null;
  const act: RunAction = (actionKey, run, done) => mutation.mutate({ key: actionKey, run, done });

  const confirmThen = async (
    title: string,
    message: string,
    actionKey: string,
    run: () => Promise<unknown>,
    done: string,
  ) => {
    const ok = await askConfirm({ title, message, confirmLabel: "Confirmar", variant: "danger" });
    if (ok) act(actionKey, run, done);
  };

  const app = review?.application;
  const blockers = review?.blockers ?? [];
  const step = reviewStepIndex(app?.status, customerStatus);
  const preactivated = step === 3;

  const owners = (r: OnboardingReview): ViewerDocument[] => {
    const docLabel = (d: ReviewDocument) => DOCUMENT_TYPE_LABEL[d.tipo] ?? d.tipo;
    return [
      ...r.documents
        .filter((d) => d.submission_id === null)
        .map((document) => ({ document, label: docLabel(document), owner: "Empresa" })),
      ...r.people.flatMap((p) =>
        r.documents
          .filter((d) => d.submission_id === p.submission_id)
          .map((document) => ({ document, label: docLabel(document), owner: personName(p) })),
      ),
    ];
  };

  const rejectDocument = (document: ReviewDocument) =>
    setReasonRequest({
      title: "Rechazar documento",
      description: DOCUMENT_TYPE_LABEL[document.tipo] ?? document.tipo,
      submitLabel: "Rechazar",
      key: `doc-${document.id}`,
      done: "Documento rechazado",
      run: (reason) => reviewDocument(document.id, "rejected", reason),
    });

  return (
    <CustomerSection
      titulo="Onboarding"
      loading={query.isLoading}
      error={query.isError ? query.error : null}
      onRetry={() => void query.refetch()}
      vacio={false}
    >
      {review && (
        <div className="space-y-5 text-sm">
          {/* Solicitud: en que paso esta y que hay que hacer */}
          <section className="space-y-3 rounded-lg border p-4">
            {step >= 0 && <StepBar current={step} />}

            {(!app || app.status === "draft") && !preactivated && (
              <p className="text-sm">
                <span className="font-semibold">Falta la solicitud de la empresa.</span> No se puede
                aprobar hasta que termine el alta en el portal y la envíe.
              </p>
            )}

            {app?.status === "submitted" && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>
                  <span className="font-semibold">La solicitud está lista para revisar.</span>{" "}
                  Empezá la revisión para poder aprobarla.
                </p>
                <ActionButton
                  primary
                  actionKey="start"
                  pendingKey={pendingKey}
                  onClick={() =>
                    act("start", () => startApplicationReview(app.id), "Revisión iniciada")
                  }
                >
                  Empezar revisión
                </ActionButton>
              </div>
            )}

            {app?.status === "in_review" && (
              <div className="space-y-3">
                {blockers.length > 0 ? (
                  <div>
                    <p className="font-semibold">Para aprobar, falta:</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
                      {blockers.map((b) => (
                        <li key={b}>{BLOCKER_LABEL[b] ?? b}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    Está todo revisado: ya podés aprobar la solicitud.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    primary
                    actionKey="approve"
                    pendingKey={pendingKey}
                    disabled={blockers.length > 0}
                    onClick={() =>
                      act(
                        "approve",
                        () => decideApplication(app.id, "approved", null),
                        "Solicitud aprobada",
                      )
                    }
                  >
                    Aprobar solicitud
                  </ActionButton>
                  <ActionButton
                    actionKey="changes"
                    pendingKey={pendingKey}
                    onClick={() =>
                      setReasonRequest({
                        title: "Pedir cambios",
                        description: "La empresa podrá corregir y volver a enviar.",
                        submitLabel: "Pedir cambios",
                        key: "changes",
                        done: "Cambios solicitados",
                        run: (reason) => decideApplication(app.id, "changes_requested", reason),
                      })
                    }
                  >
                    Pedir cambios
                  </ActionButton>
                  <ActionButton
                    actionKey="reject"
                    pendingKey={pendingKey}
                    onClick={() =>
                      setReasonRequest({
                        title: "Rechazar solicitud",
                        description: "La solicitud se cierra. El cliente no ve el motivo.",
                        submitLabel: "Rechazar",
                        key: "reject",
                        done: "Solicitud rechazada",
                        run: (reason) => decideApplication(app.id, "rejected", reason),
                      })
                    }
                  >
                    Rechazar
                  </ActionButton>
                </div>
              </div>
            )}

            {app?.status === "changes_requested" && (
              <p>
                <span className="font-semibold">Se pidieron cambios.</span> Esperando que la empresa
                corrija y vuelva a enviar.
              </p>
            )}

            {app?.status === "rejected" && (
              <p>
                <span className="font-semibold">Solicitud rechazada.</span> Motivo interno:{" "}
                {app.internal_reason ?? "—"}
              </p>
            )}

            {app?.status === "approved" && !preactivated && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>
                  <span className="font-semibold">Solicitud aprobada.</span> El siguiente paso es
                  pasar la cuenta a preactivado.
                </p>
                <ActionButton
                  primary
                  actionKey="preactivate"
                  pendingKey={pendingKey}
                  onClick={() =>
                    mutation.mutate(
                      {
                        key: "preactivate",
                        run: () => preactivateCustomer(customerId),
                        done: "Cuenta preactivada",
                      },
                      { onSuccess: onCustomerChanged },
                    )
                  }
                >
                  Pasar a preactivado
                </ActionButton>
              </div>
            )}

            {preactivated && app?.status === "approved" && (
              <p>
                <span className="font-semibold">Cuenta preactivada.</span> Sigue el flujo habitual:
                generar el CBU, cargar la comisión y activar.
              </p>
            )}

            {app?.review_overdue_at && app.status !== "approved" && app.status !== "rejected" && (
              <Badge tone="danger">Vencieron las 24 horas de validación</Badge>
            )}
            {query.isFetching && !mutation.isPending && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 size={12} className="animate-spin" aria-hidden /> Actualizando…
              </p>
            )}
          </section>

          {/* Casos abiertos: van arriba porque pueden frenar la cuenta */}
          {review.cases.length > 0 && (
            <section className="space-y-2 rounded-lg border border-red-200 p-4">
              <h4 className="font-semibold">Casos de Compliance abiertos</h4>
              {review.cases.map((c) => (
                <div key={c.id} className="space-y-2 border-t pt-2 first:border-0 first:pt-0">
                  <Badge tone={c.priority === "critical" ? "danger" : "warn"}>
                    {CASE_TRIGGER_LABEL[c.trigger_kind] ?? c.trigger_kind}
                  </Badge>
                  <div className="flex flex-wrap gap-2">
                    {CASE_DECISIONS.map((d) => (
                      <ActionButton
                        key={d.value}
                        actionKey={`case-${c.id}`}
                        pendingKey={pendingKey}
                        onClick={() =>
                          setReasonRequest({
                            title: d.label,
                            description: CASE_TRIGGER_LABEL[c.trigger_kind] ?? c.trigger_kind,
                            submitLabel: "Confirmar decisión",
                            key: `case-${c.id}`,
                            done: "Decisión registrada",
                            run: (reason) => resolveCase(c.id, d.value, reason),
                          })
                        }
                      >
                        {d.label}
                      </ActionButton>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Empresa */}
          {review.company && (
            <section className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold">{review.company.legal_name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {[
                      review.company.trade_name,
                      review.company.company_type,
                      review.company.identification_type,
                      review.company.registration_date &&
                        `Inscripta el ${review.company.registration_date}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <ActionButton
                  actionKey="company-tax"
                  pendingKey={pendingKey}
                  disabled={review.companyTaxIdVerified}
                  onClick={() =>
                    act(
                      "company-tax",
                      () => recordVerification({ customer: customerId }, "tax_id", "passed"),
                      "CUIT validado",
                    )
                  }
                >
                  {review.companyTaxIdVerified ? "CUIT validado" : "Validar CUIT (manual)"}
                </ActionButton>
              </div>
              <Checklist items={companyChecklist(review)} />
              <DocumentGrid
                slots={companyDocumentSlots(review)}
                urls={urls}
                thumbs={thumbs}
                onOpen={(d) => setViewerId(d.id)}
              />
            </section>
          )}

          {/* Personas */}
          {review.people.map((p) => (
            <section key={`${p.kind}-${p.id}`} className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <UserRound size={18} className="mt-0.5 text-muted-foreground" aria-hidden />
                  <div>
                    <h4 className="font-semibold">{personName(p)}</h4>
                    <p className="text-xs text-muted-foreground">{personLabel(p)}</p>
                  </div>
                </div>
                <Badge tone={p.status === "active" ? "success" : "warn"}>
                  {RELATION_STATUS_LABEL[p.status] ?? p.status}
                </Badge>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md bg-muted/50 p-3 text-xs sm:grid-cols-4">
                {personFacts(p).map((f) => (
                  <div key={f.label} className="min-w-0">
                    <dt className="text-muted-foreground">{f.label}</dt>
                    <dd className="break-words font-medium">{f.value}</dd>
                  </div>
                ))}
              </dl>

              <Checklist items={personChecklist(review, p)} />
              <DocumentGrid
                slots={personDocumentSlots(review, p)}
                urls={urls}
                thumbs={thumbs}
                onOpen={(d) => setViewerId(d.id)}
              />

              {p.status === "pending_identity" && (
                <IdentityMatch person={p} pendingKey={pendingKey} ask={setReasonRequest} />
              )}

              {p.person_id && (
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  <ActionButton
                    actionKey={`kyc-${p.id}`}
                    pendingKey={pendingKey}
                    disabled={p.person?.kyc_status === "passed"}
                    onClick={() =>
                      act(
                        `kyc-${p.id}`,
                        () =>
                          recordVerification(
                            { person: p.person_id ?? "" },
                            "identity_document",
                            "passed",
                          ),
                        "Identidad verificada",
                      )
                    }
                  >
                    {p.person?.kyc_status === "passed"
                      ? "Identidad verificada"
                      : "Verificar identidad"}
                  </ActionButton>
                  <ActionButton
                    actionKey={`kyc-fail-${p.id}`}
                    pendingKey={pendingKey}
                    onClick={() =>
                      void confirmThen(
                        "Identidad no verificada",
                        `Se registra que no se pudo verificar a ${personName(p)}.`,
                        `kyc-fail-${p.id}`,
                        () =>
                          recordVerification(
                            { person: p.person_id ?? "" },
                            "identity_document",
                            "failed",
                          ),
                        "Verificación registrada",
                      )
                    }
                  >
                    No se pudo verificar
                  </ActionButton>
                  <ActionButton
                    actionKey={`repet-${p.id}`}
                    pendingKey={pendingKey}
                    disabled={p.person?.compliance_status === "clear"}
                    onClick={() =>
                      act(
                        `repet-${p.id}`,
                        () => recordScreening({ person: p.person_id ?? "" }, "clear"),
                        "Control REPET registrado",
                      )
                    }
                  >
                    {p.person?.compliance_status === "clear"
                      ? "REPET sin coincidencias"
                      : "REPET: sin coincidencias"}
                  </ActionButton>
                  <ActionButton
                    actionKey={`repet-match-${p.id}`}
                    pendingKey={pendingKey}
                    onClick={() =>
                      void confirmThen(
                        "Coincidencia en REPET",
                        `Se abre un caso crítico para Compliance por ${personName(p)}.`,
                        `repet-match-${p.id}`,
                        () => recordScreening({ person: p.person_id ?? "" }, "confirmed_match"),
                        "Coincidencia registrada",
                      )
                    }
                  >
                    REPET: coincidencia
                  </ActionButton>
                  {p.status === "pending_review" && (
                    <ActionButton
                      primary
                      actionKey={`relation-${p.id}`}
                      pendingKey={pendingKey}
                      onClick={() =>
                        act(
                          `relation-${p.id}`,
                          () => approveRelationship(p.kind, p.id),
                          "Relación aprobada",
                        )
                      }
                    >
                      Aprobar relación
                    </ActionButton>
                  )}
                </div>
              )}
            </section>
          ))}

          {viewerId && (
            <DocumentViewer
              items={owners(review)}
              currentId={viewerId}
              urls={urls}
              pending={mutation.isPending}
              onMove={setViewerId}
              onClose={() => setViewerId(null)}
              onApprove={(d) =>
                act(
                  `doc-${d.id}`,
                  () => reviewDocument(d.id, "approved", null),
                  "Documento aprobado",
                )
              }
              onReject={rejectDocument}
            />
          )}

          {reasonRequest && (
            <ReasonDialog
              request={reasonRequest}
              onClose={(reason) => {
                const request = reasonRequest;
                setReasonRequest(null);
                if (reason) act(request.key, () => request.run(reason), request.done);
              }}
            />
          )}
        </div>
      )}
    </CustomerSection>
  );
}
