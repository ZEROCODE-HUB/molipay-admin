import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, XCircle, RotateCcw, AlertTriangle, Inbox } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge } from "@/components/portal-shell";
import { LegajoCell, LEGAJO_TOOLTIP } from "@/components/legajo-label";
import { useClientes } from "@/hooks/useClientes";
import { updateClienteEstado } from "@/lib/api/clientes";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import type { Cliente, EstadoCliente } from "@/lib/api/types";

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

type EstadoUsuario = "Activado" | "Suspendido" | "Rechazado";

const estadoFromDb = (e: EstadoCliente): EstadoUsuario =>
  e === "suspendido" ? "Suspendido" : e === "rechazado" ? "Rechazado" : "Activado";

const estadoBadgeTone = (e: EstadoUsuario) =>
  e === "Activado" ? "success" : e === "Suspendido" ? "danger" : "warn";

type Usuario = {
  id: string;
  legajo: string;
  correo: string;
  nombres: string;
  apellidos: string;
  estado: EstadoUsuario;
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

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useClientes({
    page,
    pageSize: PAGE_SIZE,
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

  const data: Usuario[] = rows.map((c: Cliente) => ({
    id: c.id,
    legajo: c.legajo,
    correo: c.correo,
    nombres: c.nombre,
    apellidos: "",
    estado: estadoFromDb(c.estado),
    fechaRegistro: c.fechaAlta,
  }));

  const cambiarEstado = async (row: Usuario, nuevo: EstadoCliente) => {
    try {
      await updateClienteEstado(row.id, nuevo);
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    } catch (e) {
      setConfirmAction({
        title: "No se pudo actualizar",
        message: (e as Error).message,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const getActions = (row: Usuario): ActionItem[] => [
    {
      label: "Ver detalle",
      icon: Eye,
      onClick: () =>
        navigate({ to: "/admin/general/usuarios/$legajo", params: { legajo: row.legajo } }),
    },
    ...(row.estado === "Suspendido"
      ? [
          {
            label: "Reactivar",
            icon: RotateCcw,
            disabled: !puedeModificar,
            onClick: () =>
              setConfirmAction({
                title: "Reactivar usuario",
                message: `¿Estás seguro de reactivar a ${row.nombres}?`,
                confirmLabel: "Reactivar",
                variant: "default" as const,
                onConfirm: () => cambiarEstado(row, "activo"),
              }),
          },
        ]
      : [
          {
            label: "Suspender",
            icon: XCircle,
            disabled: !puedeModificar,
            onClick: () =>
              setConfirmAction({
                title: "Suspender usuario",
                message: `¿Estás seguro de suspender a ${row.nombres}?`,
                confirmLabel: "Suspender",
                variant: "danger" as const,
                onConfirm: () => cambiarEstado(row, "suspendido"),
              }),
          },
        ]),
  ];

  const err = error instanceof DataAccessError ? error : null;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PermissionGuard recurso="usuarios">
      <PageHeader
        title="Usuarios de la plataforma"
        description="Clientes dados de alta (personas físicas y jurídicas) recuperados desde la base de datos."
      />

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
            data={data.map((d) => ({
              ...d,
              _estadoTone: estadoBadgeTone(d.estado) as "success" | "warn" | "danger",
            }))}
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

const columns: Column<Usuario & { _estadoTone: "success" | "danger" | "warn" }>[] = [
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
    key: "estado",
    label: "Estado",
    filterable: "enum",
    filterOptions: ["Activado", "Suspendido", "Rechazado"],
    render: (row) => <Badge tone={row._estadoTone}>{row.estado}</Badge>,
  },
  {
    key: "fechaRegistro",
    label: "Fecha de registro",
    render: (row) => <span className="font-mono tabular-nums">{row.fechaRegistro}</span>,
  },
];
