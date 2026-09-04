import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, XCircle, RotateCcw, AlertTriangle, Inbox, ShieldCheck, Ban, Trash2, CheckCircle } from "lucide-react";
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

export const Route = createFileRoute("/admin/general/usuarios/")({
  head: () => ({
    meta: [
      { title: "Personas físicas — Usuarios — Admin Molly" },
      { name: "description", content: "Gestión de personas físicas registradas en la plataforma." },
    ],
  }),
  component: UsuariosPage,
});

const PAGE_SIZE = 25;

type Usuario = {
  id: string;
  legajo: string;
  correo: string;
  nombres: string;
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
  if (tipo === "permiso") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-6 py-12 text-center text-sm text-amber-800">
        <AlertTriangle size={28} />
        <div>
          <p className="font-semibold">No tenés permiso para ver esto</p>
          <p className="mt-1">{mensaje}</p>
        </div>
      </div>
    );
  }
  if (tipo === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
        <AlertTriangle size={28} />
        <div>
          <p className="font-semibold">Ocurrió un error al cargar los usuarios</p>
          <p className="mt-1">{mensaje}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
      <Inbox size={28} />
      <p>No hay usuarios que coincidan con la búsqueda.</p>
    </div>
  );
}

function UsuariosPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [filtroEstado, setFiltroEstado] = useState<string>("");

  const estadoFiltroDb = filtroEstado ? (LABEL_A_ESTADO[filtroEstado] as EstadoCliente | undefined) : undefined;

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useClientes({
    page,
    pageSize: PAGE_SIZE,
    estado: estadoFiltroDb,
    tipoPersona: "fisica",
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

  const data: Usuario[] = rows.map((c: Cliente) => {
    const norm = normalizarEstado(c.estado);
    return {
      id: c.id,
      legajo: c.legajo,
      correo: c.correo,
      nombres: c.nombre,
      estadoRaw: c.estado,
      estadoLabel: ESTADO_LABEL[norm],
      estadoTone: ESTADO_TONE[norm] as Usuario["estadoTone"],
      fechaRegistro: c.fechaAlta,
    };
  });

  const ejecutar = async (
    legajo: string,
    accion: "aprobar" | "activar" | "suspender" | "reactivar" | "deshabilitar" | "eliminar",
  ) => {
    try {
      const cliente = await getClienteByLegajo(legajo);
      if (!cliente) throw new Error("Cliente no encontrado");
      let res: { ok: boolean; motivo?: string } | { ok: true } = { ok: false, motivo: "No implementado" };
      if (accion === "aprobar") res = await aprobarDocumentacionCliente(cliente);
      else if (accion === "activar") res = await activarCliente(cliente);
      else if (accion === "suspender") res = await suspenderCliente(cliente);
      else if (accion === "reactivar") res = await reactivarCliente(cliente);
      else if (accion === "deshabilitar") res = await deshabilitarCliente(cliente);
      else if (accion === "eliminar") res = await eliminarCliente(cliente);

      if (!res.ok) {
        const motivo = (res as { motivo?: string }).motivo ?? "No se pudo completar la acción";
        toast.error(motivo);
        setConfirmAction({
          title: "No se pudo completar",
          message: motivo,
          confirmLabel: "Cerrar",
          variant: "danger",
          onConfirm: () => setConfirmAction(null),
        });
        return;
      }
      toast.success("Estado actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setConfirmAction(null);
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(msg);
      setConfirmAction({
        title: "Error",
        message: msg,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const getActions = (row: Usuario): ActionItem[] => {
    const norm = normalizarEstado(row.estadoRaw);
    const items: ActionItem[] = [
      {
        label: "Ver detalle",
        icon: Eye,
        onClick: () => navigate({ to: "/admin/general/usuarios/$legajo", params: { legajo: row.legajo } }),
      },
    ];

    if (norm === "registrado") {
      items.push({
        label: "Preactivar (aprobar documentación)",
        icon: ShieldCheck,
        disabled: !puedeModificar,
        onClick: () =>
          setConfirmAction({
            title: "Aprobar documentación",
            message: `¿Aprobar la documentación de ${row.nombres}? Pasará a Preactivado.`,
            confirmLabel: "Aprobar",
            variant: "default",
            onConfirm: () => ejecutar(row.legajo, "aprobar"),
          }),
      });
    }
    if (norm === "preactivado") {
      items.push({
        label: "Activar",
        icon: CheckCircle,
        disabled: !puedeModificar,
        onClick: () =>
          setConfirmAction({
            title: "Activar usuario",
            message: `¿Activar a ${row.nombres}? Requiere CBU y comisión cargados.`,
            confirmLabel: "Activar",
            variant: "default",
            onConfirm: () => ejecutar(row.legajo, "activar"),
          }),
      });
    }
    if (norm === "activado") {
      items.push({
        label: "Suspender",
        icon: XCircle,
        disabled: !puedeModificar,
        variant: "danger" as const,
        onClick: () =>
          setConfirmAction({
            title: "Suspender usuario",
            message: `¿Suspender a ${row.nombres}? Se conservará su historial.`,
            confirmLabel: "Suspender",
            variant: "danger",
            onConfirm: () => ejecutar(row.legajo, "suspender"),
          }),
      });
    }
    if (norm === "suspendido") {
      items.push({
        label: "Reactivar",
        icon: RotateCcw,
        disabled: !puedeModificar,
        onClick: () =>
          setConfirmAction({
            title: "Reactivar usuario",
            message: `¿Reactivar a ${row.nombres}?`,
            confirmLabel: "Reactivar",
            variant: "default",
            onConfirm: () => ejecutar(row.legajo, "reactivar"),
          }),
      });
    }
    if (norm !== "deshabilitado" && norm !== "eliminado") {
      items.push({
        label: "Deshabilitar",
        icon: Ban,
        disabled: !puedeModificar,
        variant: "danger" as const,
        onClick: () =>
          setConfirmAction({
            title: "Deshabilitar usuario",
            message: `¿Deshabilitar a ${row.nombres}? Se cancelará su CBU y se conservará el historial (auditoría BCRA).`,
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
            title: "Eliminar usuario",
            message: `¿Eliminar a ${row.nombres}? Solo se permite si nunca tuvo movimientos.`,
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
      <PageHeader
        title="Usuarios de la plataforma"
        description="Personas físicas — flujo homologado: Pendiente → Registrado → Preactivado → Activado."
      />

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
          Cargando usuarios…
        </div>
      ) : isError ? (
        <EstadoMensaje
          tipo={err?.permission ? "permiso" : "error"}
          mensaje={err?.message ?? "Error desconocido"}
          onRetry={() => refetch()}
        />
      ) : isEmpty ? (
        <EstadoMensaje tipo="vacio" mensaje="" />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data}
            keyExtractor={(r) => r.legajo}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
          />
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>
              {total} usuario(s) · página {page + 1} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 0 || isFetching}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPaginas || isFetching}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
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

const columns: Column<Usuario>[] = [
  {
    key: "legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    render: (row) => <LegajoCell legajo={row.legajo} />,
  },
  { key: "correo", label: "Usuario", filterable: true, render: (row) => row.correo },
  { key: "nombres", label: "Nombres", filterable: true, render: (row) => row.nombres },
  {
    key: "estadoLabel",
    label: "Estado",
    render: (row) => <Badge tone={row.estadoTone as "success" | "warn" | "danger" | "neutral"}>{row.estadoLabel}</Badge>,
  },
  {
    key: "fechaRegistro",
    label: "Fecha de registro",
    render: (row) => <span className="font-mono tabular-nums">{row.fechaRegistro}</span>,
  },
];
