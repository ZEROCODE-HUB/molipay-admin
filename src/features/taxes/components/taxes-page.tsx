import { Pagination } from "@/shared/ui/pagination";
import { LoadingBlock } from "@/shared/ui/loading-block";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo,useState } from "react";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useCan } from "@/features/rbac/rbac.hooks";
import { useTaxes } from "@/features/taxes/taxes.hooks";
import { type AmbitoTax,type Tax } from "@/infrastructure/supabase/legacy/types";
import { isAppError,userMessage } from "@/shared/lib/errors";
import { createTax,deleteTax,setTaxStatus,updateTax } from "@/features/taxes/taxes.supabase";
import { pgErrorCode,technicalErrorText } from "@/infrastructure/supabase/errors";
import { ActionsDropdown,type ActionItem } from "@/shared/ui/actions-dropdown";
import { Edit3,Eye,Plus,Power,PowerOff,Trash2 } from "lucide-react";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { Badge } from "@/shared/ui/badge";
import { SummaryRate } from "@/features/taxes/components/rate-summary";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { BtnPrimary } from "@/shared/ui/button";
import { Input,Label } from "@/shared/ui/form-controls";
import { StatusMessage } from "@/shared/ui/status-message";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import {
HELP_AMBITO,
PAGE_SIZE,
aInput,
selectCls,
statusTone,
} from "@/features/taxes/taxes.rules";
import { type TaxForm } from "@/features/taxes/taxes.types";
import { DetailModal } from "./detail-modal";
import { TaxFormModal } from "./tax-form-modal";

// --- Página --------------------------------------------------------------------

export function TaxesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [statusFilter, setStatusFilter] = useState<"Activo" | "Inactivo" | "">("");
  const [tab, setTab] = useState<"externos" | "internos">("externos");

  const { can } = useCan();
  const canCreate = can("crear", "impuestos");
  const canUpdate = can("modificar", "impuestos");
  const canDelete = can("borrar", "impuestos");

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useTaxes({
    page,
    pageSize: PAGE_SIZE,
    search,
    estado: statusFilter || undefined,
  });

  const filteredRows = useMemo(() => {
    const target: AmbitoTax = tab === "internos" ? "Interno" : "Externo";
    return rows.filter((r) => r.ambito === target);
  }, [rows, tab]);

  const externosCount = useMemo(() => rows.filter((r) => r.ambito === "Externo").length, [rows]);
  const internosCount = useMemo(() => rows.filter((r) => r.ambito === "Interno").length, [rows]);

  const err = isAppError(error) ? error : null;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = rows.find((r) => r.id === detailId) ?? null;
  const [editTarget, setEditTarget] = useState<Tax | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Tax | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["impuestos"] });
  const showError = (title: string, message: string) =>
    setConfirmAction({
      title,
      message,
      confirmLabel: "Cerrar",
      variant: "danger",
      onConfirm: () => setConfirmAction(null),
    });

  const toggleStatus = async (row: Tax) => {
    try {
      await setTaxStatus(row.id, row.estado === "Activo" ? "Inactivo" : "Activo");
      invalidate();
    } catch (e) {
      showError("No se pudo actualizar", userMessage(e));
    }
  };

  const save = async (form: TaxForm) => {
    const payload = {
      codigo: form.codigo,
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      estado: form.estado,
      ambito: form.ambito,
      fuenteAlicuota: form.fuenteAlicuota,
    };
    try {
      if (editTarget) await updateTax(editTarget.id, payload);
      else await createTax(payload, form.alicuotas.map(aInput));
      invalidate();
      setShowNew(false);
      setEditTarget(null);
    } catch (e) {
      const duplicado = pgErrorCode(e) === "23505";
      showError(
        "No se pudo guardar",
        duplicado
          ? /tax_rates/i.test(technicalErrorText(e))
            ? "Hay dos alícuotas con el mismo código y la misma fecha de inicio."
            : `Ya existe un impuesto con el código "${form.codigo.trim()}".`
          : userMessage(e),
      );
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await deleteTax(confirmDelete.id);
      invalidate();
    } catch (e) {
      showError("No se pudo eliminar", userMessage(e));
    }
    setConfirmDelete(null);
  };

  const getActions = (row: Tax): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetailId(row.id) },
    {
      label: row.estado === "Activo" ? "Desactivar" : "Activar",
      icon: row.estado === "Activo" ? PowerOff : Power,
      disabled: !canUpdate,
      onClick: () => toggleStatus(row),
    },
    { label: "Editar", icon: Edit3, disabled: !canUpdate, onClick: () => setEditTarget(row) },
    {
      label: "Eliminar",
      icon: Trash2,
      variant: "danger",
      disabled: !canDelete,
      onClick: () => setConfirmDelete(row),
    },
  ];

  const columns: Column<Tax>[] = [
    {
      key: "codigo",
      label: "Código",
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.codigo}</span>,
    },
    {
      key: "nombre",
      label: "Nombre",
      sortable: true,
      render: (r) => (
        <div className="min-w-0">
          <div className="font-medium">{r.nombre}</div>
          {r.descripcion && (
            <div className="text-[11px] text-muted-foreground line-clamp-1">{r.descripcion}</div>
          )}
        </div>
      ),
    },
    {
      key: "ambito",
      label: "Ámbito",
      sortable: true,
      render: (r) => (
        <span title={HELP_AMBITO[r.ambito]}>
          <Badge tone={r.ambito === "Interno" ? "success" : "neutral"}>{r.ambito}</Badge>
        </span>
      ),
    },
    {
      key: "fuenteAlicuota",
      label: "Fuente",
      sortable: true,
      render: (r) => <span className="text-xs">{r.fuenteAlicuota}</span>,
    },
    {
      key: "alicuota",
      label: "Alícuota vigente",
      render: (r) => <SummaryRate fuente={r.fuenteAlicuota} alicuotas={r.alicuotas} />,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (r) => <Badge tone={statusTone(r.estado)}>{r.estado}</Badge>,
    },
  ];

  const tabCls = (activa: boolean) =>
    `relative px-4 py-2.5 text-sm font-medium transition-colors ${
      activa
        ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <PermissionGuard recurso="impuestos">
      <PageHeader
        title="Impuestos"
        description="Catálogo de impuestos y de dónde sale su alícuota: fija por ley, padrón mensual o por cliente."
        action={
          <BtnPrimary type="button" onClick={() => setShowNew(true)} disabled={!canCreate}>
            <Plus size={14} /> Nuevo impuesto
          </BtnPrimary>
        }
      />

      <div className="flex gap-1 border-b border-border mb-4">
        <button
          type="button"
          onClick={() => {
            setTab("externos");
            setPage(0);
          }}
          className={tabCls(tab === "externos")}
          title={HELP_AMBITO.Externo}
        >
          Externos {externosCount > 0 ? "(" + externosCount + ")" : ""}
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("internos");
            setPage(0);
          }}
          className={tabCls(tab === "internos")}
          title={HELP_AMBITO.Interno}
        >
          Internos {internosCount > 0 ? "(" + internosCount + ")" : ""}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="buscar">Buscar</Label>
          <Input
            id="buscar"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(0);
            }}
            placeholder="Código, nombre o descripción…"
          />
        </div>
        <div>
          <Label htmlFor="f-estado">Estado</Label>
          <select
            id="f-estado"
            className={selectCls}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "Activo" | "Inactivo" | "");
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock label="Cargando impuestos…" />
      ) : isError ? (
        <StatusMessage
          kind={err?.kind === "permission" ? "permission" : "error"}
          errorTitle="Ocurrió un error al cargar los impuestos"
          message={err?.message ?? "Error desconocido"}
          onRetry={() => refetch()}
        />
      ) : isEmpty ? (
        <StatusMessage kind="empty" message="No hay impuestos que coincidan con la búsqueda." />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={filteredRows}
            keyExtractor={(r) => r.id}
            pageSize={PAGE_SIZE}
            showDownloadButton={false}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
          />
          <Pagination
            variant="compact"
            page={page + 1}
            totalPages={totalPages}
            total={total}
            countLabel="impuesto(s)"
            disabled={isFetching}
            onPageChange={(p) => setPage(p - 1)}
          />
        </>
      )}

      {detail && (
        <DetailModal imp={detail} puedeEditar={canUpdate} onClose={() => setDetailId(null)} />
      )}

      {(showNew || editTarget) && (
        <TaxFormModal
          impuesto={editTarget}
          onClose={() => {
            setShowNew(false);
            setEditTarget(null);
          }}
          onSave={save}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar impuesto"
        message={`¿Estás seguro de eliminar el impuesto "${confirmDelete?.nombre}"? Se eliminan también sus alícuotas. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={remove}
      />

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
    </PermissionGuard>
  );
}
