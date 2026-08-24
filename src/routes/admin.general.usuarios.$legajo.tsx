import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, AlertTriangle, Inbox } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/portal-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PermissionGuard } from "@/components/permission-guard";
import { useClienteByLegajo } from "@/hooks/useClientes";
import { useComisiones } from "@/hooks/useComisiones";
import { useMovimientos } from "@/hooks/useMovimientos";
import { useImpuestosAsignaciones } from "@/hooks/useImpuestos";
import { updateClienteEstado } from "@/lib/api/clientes";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import type {
  Cliente,
  ComisionCliente,
  EstadoCliente,
  ImpuestoAsignacion,
  Movimiento,
} from "@/lib/api/types";

export const Route = createFileRoute("/admin/general/usuarios/$legajo")({
  head: () => ({
    meta: [{ title: "Ficha de cliente — Admin Molly" }],
  }),
  component: ClienteDetailPage,
});

const estadoLabel: Record<EstadoCliente, string> = {
  activo: "Activo",
  suspendido: "Suspendido",
  rechazado: "Rechazado",
};

const estadoTone: Record<EstadoCliente, "success" | "danger" | "warn"> = {
  activo: "success",
  suspendido: "danger",
  rechazado: "warn",
};

function fmtFecha(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR");
}

function fmtFechaHora(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR");
}

function fmtMonto(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Seccion({
  titulo,
  loading,
  error,
  onRetry,
  vacio,
  children,
}: {
  titulo: string;
  loading: boolean;
  error: Error | null;
  onRetry?: () => void;
  vacio: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="font-display text-base font-semibold text-foreground mb-3">{titulo}</h2>
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-10 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando…
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-700">
          <AlertTriangle size={22} />
          <p>{error instanceof DataAccessError ? error.message : "Error al cargar los datos."}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
            >
              Reintentar
            </button>
          )}
        </div>
      ) : vacio ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-8 text-sm text-muted-foreground">
          <Inbox size={22} />
          <p>Sin registros.</p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function FichaDato({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground break-words">{value}</dd>
    </div>
  );
}

function ClienteDetailPage() {
  const { legajo } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = useCan();
  const puedeModificar = can("modificar", "usuarios");

  const { cliente, isLoading, isError, error, refetch } = useClienteByLegajo(legajo ?? null);

  const comisionesQuery = useComisiones({
    page: 0,
    pageSize: 25,
    clienteId: cliente?.id,
  });
  const movimientosQuery = useMovimientos({
    page: 0,
    pageSize: 10,
    legajo: legajo ?? undefined,
  });
  const impuestosQuery = useImpuestosAsignaciones({
    page: 0,
    pageSize: 25,
    cliente_legajo: legajo ?? undefined,
  });

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const cambiarEstado = async (c: Cliente, nuevo: EstadoCliente) => {
    try {
      await updateClienteEstado(c.id, nuevo);
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

  if (isLoading) {
    return (
      <>
        <PageHeader title="Ficha de cliente" />
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando cliente…
        </div>
      </>
    );
  }

  if (isError) {
    const err = error instanceof DataAccessError ? error : null;
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
            err?.permission
              ? "border border-amber-300 bg-amber-50 text-amber-800"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <AlertTriangle size={28} />
          <div>
            <p className="font-semibold">
              {err?.permission
                ? "No tenés permiso para ver esto"
                : "Ocurrió un error al cargar el cliente"}
            </p>
            <p className="mt-1">{error?.message ?? "Error desconocido"}</p>
          </div>
          {!err?.permission && (
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

  if (!cliente) {
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

  const backToList = () =>
    navigate({
      to:
        cliente.tipoPersona === "juridica"
          ? "/admin/general/usuarios/juridicas"
          : "/admin/general/usuarios",
    });

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

        <div className="min-w-0 mt-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl md:text-2xl font-semibold tracking-tight text-foreground truncate">
              {cliente.nombre}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {cliente.legajo} · {cliente.correo}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={estadoTone[cliente.estado]}>{estadoLabel[cliente.estado]}</Badge>
            {cliente.estado === "activo"
              ? puedeModificar && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmAction({
                        title: "Suspender cliente",
                        message: `¿Estás seguro de suspender a ${cliente.nombre}?`,
                        confirmLabel: "Suspender",
                        variant: "danger",
                        onConfirm: () => {
                          setConfirmAction(null);
                          void cambiarEstado(cliente, "suspendido");
                        },
                      })
                    }
                    className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground hover:bg-accent"
                  >
                    Suspender
                  </button>
                )
              : puedeModificar && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmAction({
                        title: "Reactivar cliente",
                        message: `¿Estás seguro de reactivar a ${cliente.nombre}?`,
                        confirmLabel: "Reactivar",
                        variant: "default",
                        onConfirm: () => {
                          setConfirmAction(null);
                          void cambiarEstado(cliente, "activo");
                        },
                      })
                    }
                    className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground hover:bg-accent"
                  >
                    Reactivar
                  </button>
                )}
          </div>
        </div>

        {/* --- Ficha: solo campos con fuente real en la tabla clientes --- */}
        <section className="mt-4 rounded-xl border border-border bg-card p-5">
          <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
            <FichaDato label="Legajo" value={<span className="font-mono">{cliente.legajo}</span>} />
            <FichaDato
              label="Tipo de persona"
              value={cliente.tipoPersona === "juridica" ? "Persona Jurídica" : "Persona Física"}
            />
            <FichaDato label="CUIT" value={<span className="font-mono">{cliente.cuit}</span>} />
            <FichaDato label="Correo" value={cliente.correo} />
            <FichaDato label="Nombre" value={cliente.nombre} />
            <FichaDato label="Estado" value={estadoLabel[cliente.estado]} />
            <FichaDato label="Fecha de alta" value={fmtFecha(cliente.fechaAlta)} />
            <FichaDato label="Actualizado" value={fmtFechaHora(cliente.updatedAt)} />
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Solo se muestran campos con datos reales. Los demás datos del mock anterior (dirección,
            subcuentas, documentos, validaciones, alertas) no tienen tablas asociadas todavía.
          </p>
        </section>

        {/* --- Comisiones: configuración arancelaria real --- */}
        <Seccion
          titulo="Comisiones (configuración arancelaria)"
          loading={comisionesQuery.isLoading}
          error={comisionesQuery.isError ? comisionesQuery.error : null}
          onRetry={comisionesQuery.refetch}
          vacio={comisionesQuery.rows.length === 0}
        >
          <TablaComisiones rows={comisionesQuery.rows} />
        </Seccion>

        {/* --- Movimientos recientes (últimos 10) --- */}
        <Seccion
          titulo="Movimientos recientes (últimos 10)"
          loading={movimientosQuery.isLoading}
          error={movimientosQuery.isError ? movimientosQuery.error : null}
          onRetry={movimientosQuery.refetch}
          vacio={movimientosQuery.rows.length === 0}
        >
          <TablaMovimientos rows={movimientosQuery.rows} />
        </Seccion>

        {/* --- Impuestos asignados --- */}
        <Seccion
          titulo="Impuestos asignados"
          loading={impuestosQuery.isLoading}
          error={impuestosQuery.isError ? impuestosQuery.error : null}
          onRetry={impuestosQuery.refetch}
          vacio={impuestosQuery.rows.length === 0}
        >
          <TablaImpuestos rows={impuestosQuery.rows} />
        </Seccion>
      </div>

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

function TablaComisiones({ rows }: { rows: ComisionCliente[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Operación</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">Modalidad</th>
            <th className="px-4 py-3 font-medium">Valor</th>
            <th className="px-4 py-3 font-medium">% IVA</th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3 font-mono text-xs">{r.operacion}</td>
              <td className="px-4 py-3">{r.tipo}</td>
              <td className="px-4 py-3">{r.modalidad}</td>
              <td className="px-4 py-3 tabular-nums">
                {r.modalidad === "Porcentaje" ? `${r.porcentaje ?? 0} %` : fmtMonto(r.montoFijo)}
              </td>
              <td className="px-4 py-3 tabular-nums">{r.porcentajeImpuesto} %</td>
              <td className="px-4 py-3">
                <Badge tone={r.estado === "Habilitado" ? "success" : "neutral"}>{r.estado}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaMovimientos({ rows }: { rows: Movimiento[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">TX</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium text-right">Monto operación</th>
            <th className="px-4 py-3 font-medium text-right">Comisión</th>
            <th className="px-4 py-3 font-medium text-right">Impuesto</th>
            <th className="px-4 py-3 font-medium text-right">Cobrado</th>
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3 font-mono text-xs">{m.idTxn}</td>
              <td className="px-4 py-3">{m.tipo}</td>
              <td className="px-4 py-3 text-right tabular-nums">{fmtMonto(m.montoOperacion)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{fmtMonto(m.comision)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{fmtMonto(m.impuesto)}</td>
              <td className="px-4 py-3 text-right tabular-nums font-medium">
                {fmtMonto(m.montoCobrado)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{fmtFechaHora(m.fecha)}</td>
              <td className="px-4 py-3">
                <Badge tone={m.esFinal ? "success" : "warn"}>
                  {m.estadoNombre ?? m.estadoCodigo ?? "—"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaImpuestos({ rows }: { rows: ImpuestoAsignacion[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Impuesto</th>
            <th className="px-4 py-3 font-medium">Código</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium text-right">Monto / Tasa</th>
            <th className="px-4 py-3 font-medium">Fecha asignación</th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3">{a.impuesto?.nombre ?? a.impuestoId}</td>
              <td className="px-4 py-3 font-mono text-xs">{a.impuesto?.codigo ?? "—"}</td>
              <td className="px-4 py-3">{a.impuesto?.tipo ?? a.tipo}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {(a.impuesto?.tipo ?? a.tipo) === "Porcentaje"
                  ? `${a.impuesto?.monto ?? a.monto ?? 0} %`
                  : fmtMonto(a.impuesto?.monto ?? a.monto)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{fmtFecha(a.fechaAsignacion)}</td>
              <td className="px-4 py-3">
                <Badge tone={a.estado === "Activo" ? "success" : "neutral"}>{a.estado}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
