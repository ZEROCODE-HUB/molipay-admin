import { Modal } from "@/shared/ui/modal";
import { useState } from "react";
import { Eye, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/ui/page-header";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Badge } from "@/shared/ui/badge";
import { BtnPrimary } from "@/shared/ui/button";
import { userMessage } from "@/shared/lib/errors";
import { useCan } from "@/features/rbac/rbac.hooks";
import {
  useCreateIncidentBroadcast,
  useIncidentBroadcasts,
} from "@/features/system/incidents.hooks";
import {
  CHANNEL_LABELS,
  SEGMENT_LABELS,
  STATUS_LABELS,
  type BroadcastDraft,
  type BroadcastStatus,
  type IncidentBroadcast,
} from "@/features/system/incidents.types";
import { BroadcastDialog } from "./broadcast-dialog";

const STATUS_TONES: Record<BroadcastStatus, "success" | "warn" | "danger"> = {
  pending: "warn",
  sent: "success",
  failed: "danger",
};

const StatusBadge = ({ row }: { row: IncidentBroadcast }) => (
  <Badge tone={STATUS_TONES[row.statusCode]}>{row.status}</Badge>
);

const columns: Column<IncidentBroadcast>[] = [
  {
    key: "id",
    label: "ID",
    sortable: true,
    render: (r) => <span className="font-mono text-xs">{r.id}</span>,
  },
  { key: "subject", label: "Asunto", sortable: true, filterable: true, render: (r) => r.subject },
  {
    key: "segment",
    label: "Segmento",
    filterable: "enum",
    filterOptions: Object.values(SEGMENT_LABELS),
    render: (r) => r.segment,
  },
  {
    key: "channel",
    label: "Medio",
    filterable: "enum",
    filterOptions: Object.values(CHANNEL_LABELS),
    render: (r) => r.channel,
  },
  {
    key: "date",
    label: "Fecha",
    sortable: true,
    filterable: "date",
    render: (r) => <span className="font-mono tabular-nums">{r.date}</span>,
  },
  {
    key: "status",
    label: "Estado",
    filterable: "enum",
    filterOptions: Object.values(STATUS_LABELS),
    render: (r) => <StatusBadge row={r} />,
  },
];

export function IncidentsPage() {
  const { has } = useCan();
  const broadcasts = useIncidentBroadcasts();
  const createBroadcast = useCreateIncidentBroadcast();
  const [creating, setCreating] = useState(false);
  const [ver, setVer] = useState<IncidentBroadcast | null>(null);

  const register = (draft: BroadcastDraft) =>
    createBroadcast.mutate(draft, {
      onSuccess: () => {
        setCreating(false);
        toast.success("Mensaje registrado como pendiente de envío.");
      },
      onError: (e) => toast.error(userMessage(e)),
    });

  return (
    <>
      <PageHeader
        title="Sistema de comunicación de incidentes"
        description="Notificación proactiva a clientes ante incidentes o mantenimientos"
        action={
          has("system.incidents.manage") && (
            <BtnPrimary onClick={() => setCreating(true)}>
              <Plus size={14} /> Nuevo mensaje de difusión
            </BtnPrimary>
          )
        }
      />

      <PageHeader title="Historial de comunicaciones" />
      {broadcasts.isError && (
        <p className="mb-3 text-sm text-red-600">{userMessage(broadcasts.error)}</p>
      )}
      <DataTable
        columns={columns}
        data={broadcasts.data ?? []}
        loading={broadcasts.isLoading}
        keyExtractor={(r) => r.id}
        pageSize={5}
        emptyMessage="Todavía no hay mensajes registrados."
        actions={(r) => (
          <button onClick={() => setVer(r)} className="p-1.5 rounded hover:bg-muted" title="Ver">
            <Eye size={14} />
          </button>
        )}
      />

      {creating && (
        <BroadcastDialog
          isSubmitting={createBroadcast.isPending}
          onClose={() => setCreating(false)}
          onSave={register}
        />
      )}

      {ver && (
        <Modal open onClose={() => setVer(null)} size="custom" className="max-w-lg">
          <div className="min-h-0 flex-1 overflow-y-auto border mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">{ver.subject}</h3>
              <button onClick={() => setVer(null)} className="p-1 hover:opacity-70">
                <X size={18} />
              </button>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-mono text-xs">{ver.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Segmento</dt>
                <dd>{ver.segment}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Medio</dt>
                <dd>{ver.channel}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Fecha</dt>
                <dd className="font-mono tabular-nums">{ver.date}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Estado</dt>
                <dd>
                  <StatusBadge row={ver} />
                </dd>
              </div>
            </dl>
            <div className="mt-4 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
              {ver.message}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
