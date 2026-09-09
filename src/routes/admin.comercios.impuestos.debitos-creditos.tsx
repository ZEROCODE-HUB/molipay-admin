import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Plus,
  Power,
  PowerOff,
  X,
  Inbox,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge, Input, Label, BtnPrimary } from "@/components/portal-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { useCan } from "@/lib/permissions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDcExcepciones } from "@/hooks/useDcExcepciones";
import {
  createDcExcepcion,
  createDcExcepcionAmbos,
  setDcExcepcionEstado,
} from "@/lib/api/dc-excepciones";
import type {
  DcExcepcion,
  DireccionDcExcepcion,
  TipoDcExcepcion,
} from "@/lib/api/types";

export const Route = createFileRoute("/admin/comercios/impuestos/debitos-creditos")({
  head: () => ({ meta: [{ title: "Débitos y créditos — Admin — Moli" }] }),
  component: Page,
});

const PAGE_SIZE = 10;

function MensajeEstado({
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
          <p className="font-semibold">Ocurrió un error al cargar las excepciones</p>
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
      <p>No hay excepciones que coincidan con la búsqueda.</p>
    </div>
  );
}

function formatFecha(f: string | null) {
  if (!f) return "—";
  try {
    return new Date(f).toLocaleDateString("es-AR");
  } catch {
    return f;
  }
}

// --- Alta manual de excepción ----------------------------------------------------

type DireccionForm = "Entrantes" | "Salientes" | "Ambos";

type AltaForm = {
  email: string;
  cuit: string;
  direccion: DireccionForm;
  motivo: string;
  desde: string;
  hasta: string;
  autorizacion: string;
};

const blankAlta: AltaForm = {
  email: "",
  cuit: "",
  direccion: "Ambos",
  motivo: "",
  desde: new Date().toISOString().slice(0, 10),
  hasta: "",
  autorizacion: "",
};

// --- Página ------------------------------------------------------------------------

function Page() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [estadoFilter, setEstadoFilter] = useState<"Activo" | "Inactivo" | "">("");

  const { can } = useCan();
  const puedeCrear = can("crear", "impuestos");
  const puedeModificar = can("modificar", "impuestos");

  // Excepciones
  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useDcExcepciones(
    {
      page,
      pageSize: PAGE_SIZE,
      search,
      estado: estadoFilter || undefined,
    },
  );

  // Alta manual
  const [showAlta, setShowAlta] = useState(false);
  const [alta, setAlta] = useState<AltaForm>(blankAlta);
  const [altaGuardando, setAltaGuardando] = useState(false);

  const err: any = error ?? null;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const invalidarExcepciones = () =>
    queryClient.invalidateQueries({ queryKey: ["dc_excepciones"] });

  const toggleEstado = async (row: DcExcepcion) => {
    try {
      await setDcExcepcionEstado(row.id, row.estado === "Activo" ? "Inactivo" : "Activo");
      invalidarExcepciones();
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

  const altaValido =
    /.+@.+\..+/.test(alta.email.trim()) &&
    /^[0-9]{11}$/.test(alta.cuit.replace(/[^0-9]/g, "")) &&
    alta.motivo.trim() !== "" &&
    alta.desde !== "";

  const guardarAlta = async () => {
    if (!altaValido || altaGuardando) return;
    setAltaGuardando(true);
    const base: any = {
      email: alta.email,
      cuit: alta.cuit,
      tipo: "Alta manual" as TipoDcExcepcion,
      motivo: alta.motivo,
      vigencia_desde: alta.desde,
      vigencia_hasta: alta.hasta || null,
      autorizacion_codigo: alta.autorizacion || null,
      // Tasa fija 1,2% total (0,6% + 0,6%) - se fuerza internamente, no configurable por el usuario
      tasa: 1.2,
    };
    try {
      let cantidad: number;
      if (alta.direccion === "Ambos") {
        const creadas = await createDcExcepcionAmbos(base); // 2 INSERTs: Entrantes + Salientes
        cantidad = creadas.length;
      } else {
        await createDcExcepcion({
          ...base,
          direccion: alta.direccion as DireccionDcExcepcion,
        });
        cantidad = 1;
      }
      invalidarExcepciones();
      setShowAlta(false);
      setAlta(blankAlta);
      setBanner(
        cantidad > 1
          ? "Alta manual creada correctamente (2 registros: Entrantes y Salientes)."
          : "Excepción creada correctamente.",
      );
    } catch (e) {
      const dErr: any = e as any;
      const esCheck = dErr?.code === "23514";
      setConfirmAction({
        title: "No se pudo guardar",
        message: esCheck
          ? "Los datos no cumplen las validaciones de la base (verificá el CUIT de 11 dígitos)."
          : (e as Error).message,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
    setAltaGuardando(false);
  };

  const getActions = (row: DcExcepcion): ActionItem[] => [
    {
      label: row.estado === "Activo" ? "Desactivar" : "Activar",
      icon: row.estado === "Activo" ? PowerOff : Power,
      disabled: !puedeModificar,
      onClick: () => toggleEstado(row),
    },
  ];

  const columns: Column<DcExcepcion>[] = [
    {
      key: "cuit",
      label: "CUIT",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums text-xs">{r.cuit}</span>,
    },
    {
      key: "email",
      label: "Usuario",
      render: (r) => r.email,
    },
    {
      key: "tipo",
      label: "Tipo",
      sortable: true,
      render: (r) => r.tipo,
    },
    {
      key: "direccion",
      label: "Dirección",
      sortable: true,
      render: (r) => <Badge tone="neutral">{r.direccion}</Badge>,
    },
    {
      key: "motivo",
      label: "Motivo",
      render: (r) => r.motivo ?? "—",
    },
    {
      key: "vigenciaDesde",
      label: "Vigencia desde",
      render: (r) => (
        <span className="font-mono tabular-nums text-xs">{formatFecha(r.vigenciaDesde)}</span>
      ),
    },
    {
      key: "vigenciaHasta",
      label: "Vigencia hasta",
      render: (r) => (
        <span className="font-mono tabular-nums text-xs">{formatFecha(r.vigenciaHasta)}</span>
      ),
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "neutral"}>{r.estado}</Badge>,
    },
  ];

  return (
    <PermissionGuard recurso="impuestos">
      <PageHeader
        title="Débitos y créditos"
        description="Excepciones manuales de impuestos débito/crédito. Este impuesto se presenta una vez por semana."
        action={
          <BtnPrimary type="button" onClick={() => setShowAlta(true)} disabled={!puedeCrear}>
            <Plus size={14} /> Nueva excepción
          </BtnPrimary>
        }
      />

      {banner && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <span>{banner}</span>
          <button type="button" onClick={() => setBanner(null)} className="shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-4">
        Este impuesto se presenta una vez por semana.
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
            placeholder="CUIT, email o motivo…"
          />
        </div>
        <div>
          <Label htmlFor="f-estado">Estado</Label>
          <select
            id="f-estado"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={estadoFilter}
            onChange={(e) => {
              setEstadoFilter(e.target.value as "Activo" | "Inactivo" | "");
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
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando excepciones…
        </div>
      ) : isError ? (
        <MensajeEstado
          tipo={err?.permission ? "permiso" : "error"}
          mensaje={err?.message ?? "Error desconocido"}
          onRetry={() => refetch()}
        />
      ) : isEmpty ? (
        <MensajeEstado tipo="vacio" mensaje="" />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.id}
            pageSize={PAGE_SIZE}
            showDownloadButton={false}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
          />
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>
              {total} excepcion(es) · página {page + 1} de {totalPaginas}
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

      {/* Modal: nueva excepción */}
      {showAlta && (
        <FormDialog
          open
          onClose={() => setShowAlta(false)}
          title="Nueva excepción Débitos/Créditos"
          description="La dirección 'Ambos' crea dos registros: uno para Entrantes y otro para Salientes."
          onSubmit={guardarAlta}
          submitLabel={altaGuardando ? "Guardando…" : "Crear excepción"}
        >
          <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <p className="font-semibold">Tasa fija: 0,6% + 0,6% = 1,2% total</p>
            <p className="text-xs text-blue-700 mt-1">
              Este impuesto se presenta una vez por semana.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="ex-email">Email</Label>
              <Input
                id="ex-email"
                value={alta.email}
                onChange={(e) => setAlta({ ...alta, email: e.target.value })}
                placeholder="usuario@dominio.com"
              />
            </div>
            <div>
              <Label htmlFor="ex-cuit">CUIT</Label>
              <Input
                id="ex-cuit"
                value={alta.cuit}
                onChange={(e) => setAlta({ ...alta, cuit: e.target.value })}
                placeholder="20111111111"
                inputMode="numeric"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                11 dígitos, sin guiones ni puntos.
              </p>
            </div>
            <div>
              <Label htmlFor="ex-direccion">Dirección</Label>
              <select
                id="ex-direccion"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                value={alta.direccion}
                onChange={(e) => setAlta({ ...alta, direccion: e.target.value as DireccionForm })}
              >
                <option value="Ambos">Ambos</option>
                <option value="Entrantes">Entrantes</option>
                <option value="Salientes">Salientes</option>
              </select>
              {alta.direccion === "Ambos" && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Se crearán 2 registros (uno por dirección).
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="ex-autorizacion">Código de autorización (opcional)</Label>
              <Input
                id="ex-autorizacion"
                value={alta.autorizacion}
                onChange={(e) => setAlta({ ...alta, autorizacion: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ex-motivo">Motivo</Label>
              <Input
                id="ex-motivo"
                value={alta.motivo}
                onChange={(e) => setAlta({ ...alta, motivo: e.target.value })}
                placeholder="Ej: Exento por convenio"
              />
            </div>
            <div>
              <Label htmlFor="ex-desde">Vigencia desde</Label>
              <Input
                id="ex-desde"
                type="date"
                value={alta.desde}
                onChange={(e) => setAlta({ ...alta, desde: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Presentación semanal.</p>
            </div>
            <div>
              <Label htmlFor="ex-hasta">Vigencia hasta (opcional)</Label>
              <Input
                id="ex-hasta"
                type="date"
                value={alta.hasta}
                onChange={(e) => setAlta({ ...alta, hasta: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Presentación semanal.</p>
            </div>
          </div>
          {!altaValido && (
            <p className="text-xs text-muted-foreground mt-2">
              Completá email válido, CUIT de 11 dígitos y el motivo para poder guardar.
            </p>
          )}
        </FormDialog>
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
