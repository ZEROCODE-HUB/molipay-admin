import { LoadingBlock } from "@/shared/ui/loading-block";
import { CustomerActionBar } from "./customer-action-bar";
import { CustomerIdentificationTab } from "./customer-identification-tab";
import { CustomerMovementsTab } from "./customer-movements-tab";
import { CustomerTaxesTab } from "./customer-taxes-tab";
import { CustomerValidationsTab } from "./customer-validations-tab";
import { CustomerFeesTab } from "./customer-fees-tab";
import { CustomerRiskTab } from "./customer-risk-tab";
import { CustomerModulesTab } from "./customer-modules-tab";
import { CustomerLinksModal } from "./customer-links-modal";
import { useCustomerDetailPage } from "./use-customer-detail-page";
import { Link } from "@tanstack/react-router";
import { formatCuit } from "@/features/customers/customers.supabase";
import { isAppError } from "@/shared/lib/errors";
import { PageHeader } from "@/shared/ui/page-header";
import { AlertTriangle, ChevronLeft, Inbox } from "lucide-react";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { DataTable } from "@/shared/ui/data-table";
import { ModalDialog } from "@/shared/ui/modal-dialog";
import { BLOCKS_QUERY_KEY } from "@/features/alerts/blocks-table.rules";
import { NewBlockDialog } from "@/features/alerts/components/new-block-dialog";
import { DetailModal } from "@/features/movements/components/movement-detail";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import {
  TABS,
  fmtDate,
  historyColumns,
  operationLabel,
} from "@/features/customers/customer-detail.rules";
import { RateAsignada } from "./customer-detail-parts";
import { CustomerSection } from "./customer-section";
import { SubaccountsTab } from "./customer-detail-subaccounts-tab";
import { DocumentsTab } from "./documents-tab";
import { CustomerOnboardingTab } from "./customer-onboarding-tab";
import { ApiDetailModal } from "./api-detail-modal";
import { PlaftRiskModal } from "./plaft-risk-modal";
import { PlaftProfileModal } from "./plaft-profile-modal";
import { ExemptionModal } from "./exemption-modal";

export function CustomerDetailPage() {
  const vm = useCustomerDetailPage();
  const {
    legajo,
    queryClient,
    isLoading,
    isError,
    error,
    refetch,
    customer,
    subaccountsQuery,
    feesRealesQuery,
    historyChangesQuery,
    merchantsPstQuery,
    confirmAction,
    setConfirmAction,
    activeTab,
    setActiveTab,
    editRiskOpen,
    setEditRiskOpen,
    editProfileOpen,
    setEditProfileOpen,
    riskEffective,
    registrarRiskMutation,
    updateProfileMutation,
    pstOpen,
    setPstOpen,
    apiDetailId,
    setApiDetailId,
    apiDetailOpen,
    exemptionOpen,
    setExemptionOpen,
    taxDetail,
    setTaxDetail,
    newBlock,
    setNewBlock,
    backToList,
    tabLabel,
    merchantsPst,
    apiQuantityReal,
  } = vm;

  if (isLoading) {
    return (
      <>
        <PageHeader title="Ficha de cliente" />
        <LoadingBlock label="Cargando cliente…" />
      </>
    );
  }

  if (isError) {
    const err = isAppError(error) ? error : null;
    return (
      <>
        <PageHeader
          title="Ficha de cliente"
          action={
            <Link
              to="/admin/general/usuarios"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
            >
              <ChevronLeft size={16} /> Volver a usuarios
            </Link>
          }
        />
        <div
          className={`flex flex-col items-center justify-center gap-3 rounded-xl px-6 py-12 text-center text-sm ${
            err?.kind === "permission"
              ? "border border-amber-300 bg-amber-50 text-amber-800"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <AlertTriangle size={28} />
          <div>
            <p className="font-semibold">
              {err?.kind === "permission"
                ? "No tenés permiso para ver esto"
                : "Ocurrió un error al cargar el cliente"}
            </p>
            <p className="mt-1">{error?.message ?? "Error desconocido"}</p>
          </div>
          {err?.kind !== "permission" && (
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Reintentar
            </button>
          )}
        </div>
      </>
    );
  }

  if (!customer) {
    return (
      <>
        <PageHeader
          title="Cliente no encontrado"
          action={
            <Link
              to="/admin/general/usuarios"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
            >
              <ChevronLeft size={16} /> Volver a usuarios
            </Link>
          }
        />
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <Inbox size={28} />
          <p>No se encontró ningún cliente con legajo “{legajo ?? ""}”.</p>
          <Link
            to="/admin/general/usuarios"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            <ChevronLeft size={16} /> Volver a la lista de usuarios
          </Link>
        </div>
      </>
    );
  }

  const view = { ...vm, customer };

  return (
    <PermissionGuard recurso="usuarios">
      <div className="w-full">
        <button
          type="button"
          onClick={backToList}
          className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          <ChevronLeft size={16} />
          Volver a la lista
        </button>

        <CustomerActionBar {...view} />

        {/* Requisitos de activación (homologado) */}
        {(() => {
          const norm = (customer.estado as string).toLowerCase();
          if (norm === "preactivado") {
            const hasCbu =
              Boolean(customer.cbu && !customer.cbuCancelado) ||
              (subaccountsQuery.data?.length ?? 0) > 0;
            const hasCom = (feesRealesQuery.data?.rows.length ?? 0) > 0;
            return (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">Requisitos para activar</p>
                <ul className="mt-1 list-disc pl-5">
                  <li>CVU: {hasCbu ? "✓ cargado" : "✗ pendiente"}</li>
                  <li>Comisión: {hasCom ? "✓ cargada" : "✗ pendiente"}</li>
                </ul>
                {!hasCbu && (
                  <p className="mt-1 text-xs">Cargar CVU en la pestaña Subcuentas y CVUs.</p>
                )}
                {!hasCom && (
                  <p className="mt-1 text-xs">Cargar comisión en Admin → Usuarios → Comisiones.</p>
                )}
              </div>
            );
          }
          if (norm === "pendiente_verificacion") {
            return (
              <div className="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                Usuario pendiente de verificación de email. Debe verificar su correo para pasar a
                Registrado.
              </div>
            );
          }
          if (norm === "deshabilitado") {
            return (
              <div className="mt-4 rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                Usuario deshabilitado — CVU cancelado. Historial conservado para auditoría BCRA.
              </div>
            );
          }
          return null;
        })()}

        {/* --- Tabs --- */}
        <div className="mt-6 flex flex-wrap gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                activeTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabLabel(t)}
            </button>
          ))}
        </div>

        <div className="mt-2">
          <CustomerIdentificationTab {...view} />

          <CustomerMovementsTab {...view} />

          <CustomerTaxesTab {...view} />

          {activeTab === "subcuentas" && (
            <SubaccountsTab legajo={customer.legajo} onEximirCuit={() => setExemptionOpen(true)} />
          )}

          {activeTab === "documentos" && <DocumentsTab legajo={customer.legajo} />}

          {activeTab === "onboarding" && (
            <CustomerOnboardingTab
              customerId={customer.id}
              legajo={customer.legajo}
              customerStatus={customer.estado}
              onCustomerChanged={() => void refetch()}
            />
          )}

          <CustomerValidationsTab {...view} />

          <CustomerFeesTab {...view} />

          <CustomerRiskTab {...view} />

          <CustomerModulesTab {...view} />

          {activeTab === "historial" && (
            <CustomerSection
              titulo="Historial de cambios"
              loading={historyChangesQuery.isLoading}
              error={historyChangesQuery.isError ? historyChangesQuery.error : null}
              onRetry={historyChangesQuery.refetch}
              vacio={
                !historyChangesQuery.isLoading && (historyChangesQuery.data?.length ?? 0) === 0
              }
            >
              <DataTable
                columns={historyColumns}
                data={historyChangesQuery.data ?? []}
                keyExtractor={(r) => r.id}
                emptyMessage="Sin cambios registrados para este cliente"
              />
            </CustomerSection>
          )}
        </div>

        {/* Pop-ups módulos */}
        <ModalDialog
          open={pstOpen}
          onClose={() => setPstOpen(false)}
          title="Comercios PST vinculados"
          description="Comercios vinculados al cliente vía PST."
        >
          {merchantsPstQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : merchantsPst.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-8 text-sm text-muted-foreground">
              <Inbox size={22} />
              <p>No se encontró comercio PST asociado por email o por legajo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Comercio</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Legajo</th>
                  </tr>
                </thead>
                <tbody>
                  {merchantsPst.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-3">{c.nombre}</td>
                      <td className="px-4 py-3">{c.email ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{c.legajo_comercio ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ModalDialog>

        <CustomerLinksModal {...view} />

        <ApiDetailModal
          open={apiDetailOpen}
          onClose={() => setApiDetailId(null)}
          apiUsuarioId={apiDetailId}
          cantidad={apiQuantityReal}
        />

        {/* PLAFT: Nivel de Riesgo */}
        <PlaftRiskModal
          open={editRiskOpen}
          onClose={() => setEditRiskOpen(false)}
          legajo={legajo}
          vigente={riskEffective ?? null}
          loading={registrarRiskMutation.isPending}
          onSubmit={(level, reason, effectiveTo) =>
            registrarRiskMutation.mutate({
              legajo,
              nivel: level,
              motivo: reason,
              vigenteHasta: effectiveTo,
            })
          }
        />

        {/* PLAFT: Perfil Transaccional */}
        <PlaftProfileModal
          open={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          clienteId={customer.id}
          initial={{
            limiteTransferencia: customer.limiteTransferencia ?? null,
            limiteOpsDiarias: customer.limiteOpsDiarias ?? null,
            limiteMontoDiario: customer.limiteMontoDiario ?? null,
          }}
          cuit={formatCuit(customer.cuit)}
          loading={updateProfileMutation.isPending}
          onSubmit={(input) => updateProfileMutation.mutate({ clienteId: customer.id, ...input })}
        />

        {newBlock && (
          <NewBlockDialog
            cliente={{ legajo: customer.legajo, correo: customer.correo }}
            onClose={() => setNewBlock(false)}
            onDone={() => {
              void queryClient.invalidateQueries({ queryKey: BLOCKS_QUERY_KEY });
              void queryClient.invalidateQueries({ queryKey: ["bloqueos", legajo] });
            }}
          />
        )}

        <ExemptionModal
          open={exemptionOpen}
          onClose={() => setExemptionOpen(false)}
          legajo={customer.legajo}
          cuitDefault={customer.cuit}
        />

        {taxDetail && (
          <DetailModal
            title="Detalle de impuesto asignado"
            onClose={() => setTaxDetail(null)}
            rows={[
              {
                label: "Impuesto",
                value: taxDetail.impuesto?.nombre ?? taxDetail.impuestoId,
              },
              { label: "Código", value: taxDetail.impuesto?.codigo ?? "—" },
              { label: "Operación", value: operationLabel(taxDetail) },
              { label: "Alícuota", value: <RateAsignada a={taxDetail} /> },
              { label: "Fecha asignación", value: fmtDate(taxDetail.fechaAsignacion) },
              { label: "Estado", value: taxDetail.estado },
              { label: "Legajo", value: taxDetail.clienteLegajo },
            ]}
          />
        )}

        {confirmAction && (
          <ConfirmDialog
            open={!!confirmAction}
            onClose={() => setConfirmAction(null)}
            title={confirmAction.title}
            message={confirmAction.message}
            confirmLabel={confirmAction.confirmLabel}
            variant={confirmAction.variant}
            onConfirm={confirmAction.onConfirm}
          />
        )}
      </div>
    </PermissionGuard>
  );
}
