import { StatusMessage } from "@/shared/ui/status-message";
import { Pagination } from "@/shared/ui/pagination";
import { LoadingBlock } from "@/shared/ui/loading-block";
import { DebitsCreditsPanel } from "./debits-credits-panel";
import { useDebitsCreditsPage } from "./use-debits-credits-page";
import { userMessage } from "@/shared/lib/errors";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { CalendarClock,Plus } from "lucide-react";
import { DataTable } from "@/shared/ui/data-table";
import { Badge } from "@/shared/ui/badge";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { PAGE_SIZE } from "@/features/taxes/debits-credits.rules";
import { TarjetaAction } from "./debits-credits-parts";
import { NewExemptionDialog } from "./new-exemption-dialog";
import { VerifyOverduesDialog } from "./verify-overdues-dialog";
import { DetailExemption } from "./detail-exemption";

// ---------------------------------------------------------------------------
// Pagina
// ---------------------------------------------------------------------------

export function DebitsCreditsPage() {
  const vm = useDebitsCreditsPage();
  const {
    canCreate,
    canUpdate,
    page,
    setPage,
    query,
    nueva,
    setNew,
    verify,
    setVerify,
    detail,
    setDetail,
    refresh,
    getActions,
    columns,
    rows,
    total,
    totalPages,
    nOverdues,
  } = vm;

  return (
    <PermissionGuard recurso="impuestos">
      <PageHeader
        title="Exenciones impositivas"
        description="Exenciones por CUIT de Débitos y Créditos, Ingresos Brutos y otros impuestos."
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <TarjetaAction
          titulo="Alta manual de exenciones"
          texto="Crea una exención por CUIT e impuesto. Si elegís Ambos, se crean dos altas: entrantes y salientes."
        >
          <BtnPrimary onClick={() => setNew(true)} disabled={!canCreate}>
            <Plus size={14} /> Nueva exención
          </BtnPrimary>
        </TarjetaAction>
        <TarjetaAction
          titulo="Verificar vencidas"
          texto="Lista las exenciones activas con la vigencia vencida y las pasa a inactivas. El cálculo ya no las aplica."
        >
          <div className="flex flex-wrap items-center gap-2">
            <BtnOutline onClick={() => setVerify(true)} disabled={!canUpdate}>
              <CalendarClock size={14} /> Verificar vencidas
            </BtnOutline>
            {nOverdues > 0 && <Badge tone="danger">{nOverdues} vencida(s) activas</Badge>}
          </div>
        </TarjetaAction>
        <TarjetaAction
          titulo="Sync retroactivo"
          texto="Devolver lo retenido antes de cargar un certificado con fecha pasada (preview y aplicar)."
        >
          <div className="flex items-center gap-2">
            <BtnOutline disabled>Ver preview</BtnOutline>
            <Badge tone="neutral">Próximamente</Badge>
          </div>
        </TarjetaAction>
      </div>

      <h3 className="font-display font-semibold text-base mb-3">Exenciones</h3>
      <DebitsCreditsPanel {...vm} />

      {query.isLoading ? (
        <LoadingBlock label="Cargando exenciones…" />
      ) : query.isError ? (
        <StatusMessage
          kind="error"
          message={userMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : rows.length === 0 ? (
        <StatusMessage kind="empty" message="No hay exenciones que coincidan con los filtros." />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(e) => e.id}
            pageSize={PAGE_SIZE}
            showGlobalFilter={false}
            showDownloadButton={false}
            actions={(e) => <ActionsDropdown actions={getActions(e)} />}
          />
          <Pagination
            variant="compact"
            page={page + 1}
            totalPages={totalPages}
            total={total}
            countLabel="exención(es)"
            disabled={query.isFetching}
            onPageChange={(p) => setPage(p - 1)}
          />
        </>
      )}

      {nueva && <NewExemptionDialog onClose={() => setNew(false)} onCreada={refresh} />}
      {verify && <VerifyOverduesDialog onClose={() => setVerify(false)} onHecho={refresh} />}
      {detail && <DetailExemption e={detail} onClose={() => setDetail(null)} />}
    </PermissionGuard>
  );
}
