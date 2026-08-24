import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Plus,
  PlayCircle,
  Power,
  PowerOff,
  X,
  Search,
  ShieldCheck,
  MousePointerClick,
  AlertTriangle,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge, Input, Label, BtnPrimary, BtnOutline } from "@/components/portal-shell";
import { KpiCard } from "@/components/kpi-card";
import { PermissionGuard } from "@/components/permission-guard";
import { useCan } from "@/lib/permissions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDcExcepciones, useDcSyncRetroactivos } from "@/hooks/useDcExcepciones";
import {
  createDcExcepcion,
  createDcExcepcionAmbos,
  setDcExcepcionEstado,
  createDcSyncRetroactivo,
  setDcSyncRetroactivoAplicado,
} from "@/lib/api/dc-excepciones";
import { DataAccessError } from "@/lib/api/errors";
import type {
  DcExcepcion,
  DireccionDcExcepcion,
  TipoDcExcepcion,
  DcSyncRetroactivo,
} from "@/lib/api/types";

export const Route = createFileRoute("/admin/comercios/impuestos/debitos-creditos")({
  head: () => ({ meta: [{ title: "Débitos y créditos — Admin — Moli" }] }),
  component: Page,
});

const PAGE_SIZE = 25;

type SrInfo = {
  icon: LucideIcon;
  title: string;
  text: string;
};

const srInfo: SrInfo[] = [
  {
    icon: Search,
    title: "Qué va a hacer el preview",
    text: "Analiza asociaciones e históricos. Revisa asociaciones de Débitos y Créditos y cargos históricos dentro del rango indicado.",
  },
  {
    icon: ShieldCheck,
    title: "No persiste cambios",
    text: "El primer paso sólo devuelve el impacto esperado para que puedas validar antes de aplicar.",
  },
  {
    icon: MousePointerClick,
    title: "Aplicación manual posterior",
    text: "Si el preview es correcto, desde este mismo modal podés confirmar la ejecución real.",
  },
];

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

// --- Sync retroactivo ------------------------------------------------------------

type SyncPreviewKPIs = {
  usuariosAnalizados?: number;
  impuestosActualizados?: number;
  cargosAjustados?: number;
  registrosOmitidos?: number;
  errores?: number;
  diferencias?: string;
};

function SyncPreviewModal({
  sync,
  onClose,
  onConfirm,
}: {
  sync: DcSyncRetroactivo;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const kpis = (sync.previewJson ?? {}) as SyncPreviewKPIs;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display font-semibold text-lg">
              Preview de sincronización retroactiva
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              CUIT {sync.cuit} · {formatFecha(sync.desde)} →{" "}
              {sync.hasta ? formatFecha(sync.hasta) : "presente"}
              {sync.aplicado && (
                <span className="ml-2 inline-flex">
                  <Badge tone="success">Ya aplicado</Badge>
                </span>
              )}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCard label="Usuarios analizados" value={kpis.usuariosAnalizados ?? 0} />
            <KpiCard label="Impuestos actualizados" value={kpis.impuestosActualizados ?? 0} />
            <KpiCard label="Cargos ajustados" value={kpis.cargosAjustados ?? 0} />
            <KpiCard label="Omitidos" value={kpis.registrosOmitidos ?? 0} />
            <KpiCard label="Con error" value={kpis.errores ?? 0} />
            <KpiCard label="Diferencia total" value={kpis.diferencias ?? "$ 0"} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {srInfo.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="rounded-lg border border-border bg-muted/30 p-4">
                  <Icon size={20} className="text-primary mb-2" />
                  <h4 className="text-sm font-semibold">{s.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex justify-end gap-2">
          <BtnOutline type="button" onClick={onClose}>
            Cerrar
          </BtnOutline>
          {!sync.aplicado && (
            <BtnPrimary type="button" onClick={onConfirm}>
              Confirmar ejecución
            </BtnPrimary>
          )}
        </div>
      </div>
    </div>
  );
}

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

  // Sync retroactivo
  const [showSync, setShowSync] = useState(false);
  const [srForm, setSrForm] = useState({ cuit: "", desde: "", hasta: "" });
  const [srGuardando, setSrGuardando] = useState(false);
  const [previewSync, setPreviewSync] = useState<DcSyncRetroactivo | null>(null);
  const [confirmEjecucion, setConfirmEjecucion] = useState(false);

  const { rows: syncRows, refetch: refetchSync } = useDcSyncRetroactivos({
    page: 0,
    pageSize: 5,
  });

  const err = error instanceof DataAccessError ? error : null;
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
    const base = {
      email: alta.email,
      cuit: alta.cuit,
      tipo: "Alta manual" as TipoDcExcepcion,
      motivo: alta.motivo,
      vigencia_desde: alta.desde,
      vigencia_hasta: alta.hasta || null,
      autorizacion_codigo: alta.autorizacion || null,
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
      const dErr = e as DataAccessError;
      const esCheck = dErr.code === "23514";
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

  const srValido = /^[0-9]{11}$/.test(srForm.cuit.replace(/[^0-9]/g, "")) && srForm.desde !== "";

  const generarSyncPreview = async () => {
    if (!srValido || srGuardando) return;
    setSrGuardando(true);
    try {
      const sync = await createDcSyncRetroactivo({
        cuit: srForm.cuit.replace(/[^0-9]/g, ""),
        desde: srForm.desde,
        hasta: srForm.hasta || null,
      });
      setShowSync(false);
      setSrForm({ cuit: "", desde: "", hasta: "" });
      setPreviewSync(sync);
      void refetchSync();
    } catch (e) {
      setConfirmAction({
        title: "No se pudo generar el preview",
        message: (e as Error).message,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
    setSrGuardando(false);
  };

  const confirmarEjecucion = async () => {
    if (!previewSync) return;
    try {
      const actualizado = await setDcSyncRetroactivoAplicado(previewSync.id, true);
      setPreviewSync(actualizado);
      void refetchSync();
      setBanner("Sincronización retroactiva aplicada correctamente.");
    } catch (e) {
      setConfirmAction({
        title: "No se pudo aplicar",
        message: (e as Error).message,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
    setConfirmEjecucion(false);
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

  const syncColumns: Column<DcSyncRetroactivo>[] = [
    {
      key: "cuit",
      label: "CUIT",
      render: (r) => <span className="font-mono tabular-nums text-xs">{r.cuit}</span>,
    },
    {
      key: "desde",
      label: "Desde",
      render: (r) => <span className="font-mono tabular-nums text-xs">{formatFecha(r.desde)}</span>,
    },
    {
      key: "hasta",
      label: "Hasta",
      render: (r) => <span className="font-mono tabular-nums text-xs">{formatFecha(r.hasta)}</span>,
    },
    {
      key: "aplicado",
      label: "Estado",
      render: (r) =>
        r.aplicado ? <Badge tone="success">Aplicado</Badge> : <Badge tone="warn">Pendiente</Badge>,
    },
    {
      key: "acciones-preview",
      label: "",
      render: (r) =>
        r.aplicado ? null : (
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => setPreviewSync(r)}
          >
            Ver preview
          </button>
        ),
    },
  ];

  return (
    <PermissionGuard recurso="impuestos">
      <PageHeader
        title="Débitos y créditos"
        description="Excepciones manuales y sincronización retroactiva de impuestos débito/crédito."
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

      {/* Sincronización retroactiva */}
      <section className="bg-card border rounded-lg p-5 space-y-4 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-base">Sincronización retroactiva</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Analiza históricos de un CUIT en un rango de fechas. Primero generá un preview; nada
              se aplica hasta que lo confirmes.
            </p>
          </div>
          <BtnPrimary type="button" onClick={() => setShowSync(true)} disabled={!puedeCrear}>
            <PlayCircle size={16} /> Ejecutar análisis
          </BtnPrimary>
        </div>

        {syncRows.length > 0 && (
          <DataTable
            columns={syncColumns}
            data={syncRows}
            keyExtractor={(r) => r.id}
            pageSize={5}
            showDownloadButton={false}
          />
        )}
      </section>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>
            <div>
              <Label htmlFor="ex-hasta">Vigencia hasta (opcional)</Label>
              <Input
                id="ex-hasta"
                type="date"
                value={alta.hasta}
                onChange={(e) => setAlta({ ...alta, hasta: e.target.value })}
              />
            </div>
          </div>
          {!altaValido && (
            <p className="text-xs text-muted-foreground mt-2">
              Completá email válido, CUIT de 11 dígitos y el motivo para poder guardar.
            </p>
          )}
        </FormDialog>
      )}

      {/* Modal: sync retroactivo */}
      {showSync && (
        <FormDialog
          open
          onClose={() => setShowSync(false)}
          title="Sincronización retroactiva de Débitos y Créditos"
          description="Ingresá el CUIT y el rango de fechas a analizar."
          onSubmit={generarSyncPreview}
          submitLabel={srGuardando ? "Generando…" : "Generar preview"}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="sr-cuit">CUIT</Label>
              <Input
                id="sr-cuit"
                value={srForm.cuit}
                onChange={(e) => setSrForm({ ...srForm, cuit: e.target.value })}
                placeholder="20111111111"
                inputMode="numeric"
              />
            </div>
            <div>
              <Label htmlFor="sr-desde">Desde</Label>
              <Input
                id="sr-desde"
                type="date"
                value={srForm.desde}
                onChange={(e) => setSrForm({ ...srForm, desde: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sr-hasta">Hasta (opcional)</Label>
              <Input
                id="sr-hasta"
                type="date"
                value={srForm.hasta}
                onChange={(e) => setSrForm({ ...srForm, hasta: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {srInfo.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="rounded-lg border border-border bg-muted/30 p-4">
                  <Icon size={20} className="text-primary mb-2" />
                  <h4 className="text-sm font-semibold">{s.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.text}</p>
                </div>
              );
            })}
          </div>

          {!srValido && (
            <p className="text-xs text-muted-foreground mt-2">
              Ingresá un CUIT de 11 dígitos y la fecha inicial.
            </p>
          )}
        </FormDialog>
      )}

      {previewSync && (
        <SyncPreviewModal
          sync={previewSync}
          onClose={() => setPreviewSync(null)}
          onConfirm={() => setConfirmEjecucion(true)}
        />
      )}

      <ConfirmDialog
        open={confirmEjecucion}
        onClose={() => setConfirmEjecucion(false)}
        title="Confirmar ejecución"
        message="¿Aplicar la sincronización retroactiva? Los cambios serán definitivos."
        confirmLabel="Confirmar ejecución"
        variant="default"
        onConfirm={confirmarEjecucion}
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
