import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, XCircle, RotateCcw, Trash2, AlertTriangle, Inbox, ShieldCheck, Ban, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge } from "@/components/portal-shell";
import { LegajoCell, LEGAJO_TOOLTIP } from "@/components/legajo-label";
import { useClientes } from "@/hooks/useClientes";
import {
  aprobarDocumentacionCliente,
  activarCliente,
  suspenderCliente,
  reactivarCliente,
  deshabilitarCliente,
  eliminarCliente,
  getClienteByLegajo,
} from "@/lib/api/clientes";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import type { Cliente, EstadoCliente } from "@/lib/api/types";
import { ESTADO_LABEL, ESTADO_TONE, normalizarEstado, FILTRO_ESTADOS_OPCIONES, LABEL_A_ESTADO } from "@/lib/cliente-estados";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/general/usuarios/juridicas")({
  head: () => ({
    meta: [
      { title: "Personas jurídicas — Usuarios — Admin Molly" },
      { name: "description", content: "Gestión de personas jurídicas registradas en la plataforma." },
    ],
  }),
  component: JuridicasPage,
});

const PAGE_SIZE = 25;

type JuridicaRow = {
  id: string;
  legajo: string;
  correo: string;
  razonSocial: string;
  tipoLabel: "SA" | "SRL" | "—";
  estadoRaw: EstadoCliente;
  estadoLabel: string;
  estadoTone: "success" | "warn" | "danger" | "neutral";
  fechaRegistro: string;
};

function EstadoMensaje({
  tipo,
  mensaje,
  onRetry,
}: {
  tipo: "error" | "vacio" | "permiso";
  mensaje: string;
  onRetry?: () => void;
}) {
  if (tipo === "permiso")
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-6 py-12 text-center text-sm text-amber-800">
        <AlertTriangle size={28} />
        <p className="font-semibold">No tenés permiso para ver esto</p>
        <p className="mt-1">{mensaje}</p>
      </div>
    );
  if (tipo === "error")
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
        <AlertTriangle size={28} />
        <p className="font-semibold">Ocurrió un error al cargar las personas jurídicas</p>
        <p className="mt-1">{mensaje}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            Reintentar
          </button>
        )}
      </div>
    );
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
      <Inbox size={28} />
      <p>No hay personas jurídicas que coincidan con la búsqueda.</p>
    </div>
  );
}

function JuridicasPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [filtroEstado, setFiltroEstado] = useState("");
  const estadoFiltroDb = filtroEstado ? (LABEL_A_ESTADO[filtroEstado] as EstadoCliente | undefined) : undefined;

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useClientes({
    page,
    pageSize: PAGE_SIZE,
    estado: estadoFiltroDb,
    tipoPersona: "juridica",
  });

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const { can } = useCan();
  const puedeModificar = can("modificar", "usuarios");
  const puedeBorrar = can("borrar", "usuarios");

  const data: JuridicaRow[] = rows.map((c: Cliente) => {
    const norm = normalizarEstado(c.estado);
    const tipoLabel = c.nombre.toUpperCase().includes("SRL") ? "SRL" : c.nombre.toUpperCase().includes("SA") ? "SA" : "—";
    return {
      id: c.id,
      legajo: c.legajo,
      correo: c.correo,
      razonSocial: c.nombre,
      tipoLabel: tipoLabel as JuridicaRow["tipoLabel"],
      estadoRaw: c.estado,
      estadoLabel: ESTADO_LABEL[norm],
      estadoTone: ESTADO_TONE[norm] as JuridicaRow["estadoTone"],
      fechaRegistro: c.fechaAlta,
    };
  });

  const ejecutar = async (legajo: string, accion: "aprobar" | "activar" | "suspender" | "reactivar" | "deshabilitar" | "eliminar") => {
    try {
      const cliente = await getClienteByLegajo(legajo);
      if (!cliente) throw new Error("Cliente no encontrado");
      let res: { ok: boolean; motivo?: string } = { ok: false, motivo: "" };
      if (accion === "aprobar") res = await aprobarDocumentacionCliente(cliente);
      else if (accion === "activar") res = await activarCliente(cliente);
      else if (accion === "suspender") res = await suspenderCliente(cliente);
      else if (accion === "reactivar") res = await reactivarCliente(cliente);
      else if (accion === "deshabilitar") res = await deshabilitarCliente(cliente);
      else if (accion === "eliminar") res = await eliminarCliente(cliente);
      if (!res.ok) {
        toast.error(res.motivo ?? "No se pudo completar");
        setConfirmAction({ title: "No se pudo completar", message: res.motivo ?? "Error", confirmLabel: "Cerrar", variant: "danger", onConfirm: () => setConfirmAction(null) });
        return;
      }
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setConfirmAction(null);
    } catch (e) {
      toast.error((e as Error).message);
      setConfirmAction({ title: "Error", message: (e as Error).message, confirmLabel: "Cerrar", variant: "danger", onConfirm: () => setConfirmAction(null) });
    }
  };

  const verDetalle = (row: JuridicaRow) => navigate({ to: "/admin/general/usuarios/$legajo", params: { legajo: row.legajo } });

  const getActions = (row: JuridicaRow): ActionItem[] => {
    const norm = normalizarEstado(row.estadoRaw);
    const items: ActionItem[] = [{ label: "Ver detalle", icon: Eye, onClick: () => verDetalle(row) }];
    if (norm === "registrado")
      items.push({
        label: "Preactivar (aprobar documentación)",
        icon: ShieldCheck,
        disabled: !puedeModificar,
        onClick: () =>
          setConfirmAction({
            title: "Aprobar documentación",
            message: `¿Aprobar la documentación de ${row.razonSocial}?`,
            confirmLabel: "Aprobar",
            variant: "default",
            onConfirm: () => ejecutar(row.legajo, "aprobar"),
          }),
      });
    if (norm === "preactivado")
      items.push({
        label: "Activar",
        icon: CheckCircle,
        disabled: !puedeModificar,
        onClick: () =>
          setConfirmAction({
            title: "Activar persona jurídica",
            message: `¿Activar a ${row.razonSocial}? Requiere CBU y comisión.`,
            confirmLabel: "Activar",
            variant: "default",
            onConfirm: () => ejecutar(row.legajo, "activar"),
          }),
      });
    if (norm === "activado")
      items.push({
        label: "Suspender",
        icon: XCircle,
        disabled: !puedeModificar,
        variant: "danger" as const,
        onClick: () =>
          setConfirmAction({
            title: "Suspender persona jurídica",
            message: `¿Suspender a ${row.razonSocial}?`,
            confirmLabel: "Suspender",
            variant: "danger",
            onConfirm: () => ejecutar(row.legajo, "suspender"),
          }),
      });
    if (norm === "suspendido")
      items.push({
        label: "Reactivar",
        icon: RotateCcw,
        disabled: !puedeModificar,
        onClick: () =>
          setConfirmAction({
            title: "Reactivar persona jurídica",
            message: `¿Reactivar a ${row.razonSocial}?`,
            confirmLabel: "Reactivar",
            variant: "default",
            onConfirm: () => ejecutar(row.legajo, "reactivar"),
          }),
      });
    if (norm !== "deshabilitado" && norm !== "eliminado") {
      items.push({
        label: "Deshabilitar",
        icon: Ban,
        disabled: !puedeModificar,
        variant: "danger" as const,
        onClick: () =>
          setConfirmAction({
            title: "Deshabilitar",
            message: `¿Deshabilitar a ${row.razonSocial}? Se cancelará CBU y se conservará historial.`,
            confirmLabel: "Deshabilitar",
            variant: "danger",
            onConfirm: () => ejecutar(row.legajo, "deshabilitar"),
          }),
      });
      items.push({
        label: "Eliminar",
        icon: Trash2,
        disabled: !puedeBorrar,
        variant: "danger" as const,
        onClick: () =>
          setConfirmAction({
            title: "Eliminar",
            message: `¿Eliminar a ${row.razonSocial}? Solo si nunca tuvo movimientos.`,
            confirmLabel: "Eliminar",
            variant: "danger",
            onConfirm: () => ejecutar(row.legajo, "eliminar"),
          }),
      });
    }
    return items;
  };

  const err = error instanceof DataAccessError ? error : null;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PermissionGuard recurso="usuarios">
      <PageHeader title="Personas jurídicas" description="Empresas y organizaciones — flujo homologado con personas físicas." />

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Estado</label>
          <select
            value={filtroEstado}
            onChange={(e) => {
              setFiltroEstado(e.target.value);
              setPage(0);
            }}
            className="h-10 rounded-md border border-input bg-card px-3 text-sm"
          >
            <option value="">Todos</option>
            {FILTRO_ESTADOS_OPCIONES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando…
        </div>
      ) : isError ? (
        <EstadoMensaje tipo={err?.permission ? "permiso" : "error"} mensaje={err?.message ?? "Error desconocido"} onRetry={() => refetch()} />
      ) : isEmpty ? (
        <EstadoMensaje tipo="vacio" mensaje="" />
      ) : (
        <>
          <DataTable columns={columns} data={data} keyExtractor={(r) => r.legajo} actions={(r) => <ActionsDropdown actions={getActions(r)} />} />
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>
              {total} resultado(s) · página {page + 1} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <button type="button" disabled={page === 0 || isFetching} onClick={() => setPage((p) => Math.max(0, p - 1))} className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed">
                Anterior
              </button>
              <button type="button" disabled={page + 1 >= totalPaginas || isFetching} onClick={() => setPage((p) => p + 1)} className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed">
                Siguiente
              </button>
            </div>
          </div>
        </>
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
    </PermissionGuard>
  );
}

const columns: Column<JuridicaRow>[] = [
  { key: "legajo", label: "Legajo", hint: LEGAJO_TOOLTIP, filterable: true, render: (r) => <LegajoCell legajo={r.legajo} /> },
  { key: "correo", label: "Usuario", filterable: true, render: (r) => r.correo },
  { key: "razonSocial", label: "Razón Social", filterable: true, render: (r) => r.razonSocial },
  { key: "tipoLabel", label: "Tipo", render: (r) => r.tipoLabel },
  {
    key: "estadoLabel",
    label: "Estado",
    render: (row) => <Badge tone={row.estadoTone}>{row.estadoLabel}</Badge>,
  },
  { key: "fechaRegistro", label: "Fecha de registro", render: (r) => <span className="font-mono tabular-nums">{r.fechaRegistro}</span> },
];
