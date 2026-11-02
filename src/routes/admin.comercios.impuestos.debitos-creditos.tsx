import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Download,
  Eye,
  Inbox,
  Loader2,
  Plus,
  Power,
  PowerOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge, BtnOutline, BtnPrimary, Input, Label } from "@/components/portal-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { useCan } from "@/lib/permissions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useImpuestosForAsignacion } from "@/hooks/useImpuestos";
import { DataAccessError } from "@/lib/api/errors";
import {
  CERTIFICADO_TIPOS,
  QK_EXENCIONES,
  SITUACIONES_EXENCION,
  TIPOS_EXENCION,
  buscarClientePorCuit,
  contarVencidasActivas,
  crearExencion,
  listExenciones,
  listExencionesParaExportar,
  setEstadoExencion,
  situacion,
  urlCertificado,
  verificarVencidas,
  type DireccionExencion,
  type Exencion,
  type ExencionFilters,
  type SituacionExencion,
  type TipoExencion,
  type VencidaExencion,
} from "@/lib/api/exenciones";

export const Route = createFileRoute("/admin/comercios/impuestos/debitos-creditos")({
  head: () => ({ meta: [{ title: "Exenciones impositivas — Admin — Moli" }] }),
  component: Page,
});

const PAGE_SIZE = 10;

const selectCls =
  "w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

const fechaHora = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Sin fecha";

const TONO_SITUACION: Record<SituacionExencion, "success" | "warn" | "danger" | "neutral"> = {
  Vigente: "success",
  Programada: "warn",
  Vencida: "danger",
  Inactiva: "neutral",
};

/** datetime-local (hora local) -> ISO; vacio -> null. */
const localAIso = (v: string) => (v ? new Date(v).toISOString() : null);

function SituacionBadge({ e }: { e: Exencion }) {
  const s = situacion(e);
  return <Badge tone={TONO_SITUACION[s]}>{s}</Badge>;
}

async function abrirCertificado(path: string) {
  try {
    window.open(await urlCertificado(path), "_blank", "noopener,noreferrer");
  } catch (err) {
    toast.error((err as Error).message);
  }
}

function TarjetaAccion({
  titulo,
  texto,
  children,
}: {
  titulo: string;
  texto: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
      <div>
        <h3 className="font-semibold text-sm">{titulo}</h3>
        <p className="text-xs text-muted-foreground mt-1">{texto}</p>
      </div>
      <div className="mt-auto">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alta
// ---------------------------------------------------------------------------

type AltaForm = {
  cuit: string;
  impuestoId: string;
  direccion: DireccionExencion | "Ambos";
  tipo: TipoExencion;
  motivo: string;
  desde: string;
  hasta: string;
  codigo: string;
  certificado: File | null;
};

function NuevaExencionDialog({ onClose, onCreada }: { onClose: () => void; onCreada: () => void }) {
  const { rows: impuestos } = useImpuestosForAsignacion();
  const [f, setF] = useState<AltaForm>({
    cuit: "",
    impuestoId: "",
    direccion: "Ambos",
    tipo: "Certificado de exención",
    motivo: "",
    desde: "",
    hasta: "",
    codigo: "",
    certificado: null,
  });
  const [guardando, setGuardando] = useState(false);

  // Impuesto por defecto: Debitos y Creditos.
  const impuestoId =
    f.impuestoId ||
    impuestos.find((i) => /DEBITOS|^DC$/i.test(i.codigo))?.id ||
    impuestos[0]?.id ||
    "";
  const impuesto = impuestos.find((i) => i.id === impuestoId);
  const esPadron = impuesto?.fuenteAlicuota === "Padrón";
  const direccion = esPadron ? "Entrantes" : f.direccion;

  const cuit = f.cuit.replace(/\D/g, "");
  const cuitOk = /^\d{11}$/.test(cuit);
  const cliente = useQuery({
    queryKey: ["clientes", "por-cuit", cuit],
    queryFn: () => buscarClientePorCuit(cuit),
    enabled: cuitOk,
    staleTime: 60_000,
  });

  const fechasOk = !f.desde || !f.hasta || new Date(f.hasta) >= new Date(f.desde);
  const valido = cuitOk && !!impuestoId && f.motivo.trim() !== "" && fechasOk;

  const guardar = async () => {
    if (!valido || guardando) return;
    setGuardando(true);
    try {
      const n = await crearExencion({
        cuit,
        email: cliente.data?.correo ?? null,
        impuestoId,
        direccion,
        tipo: f.tipo,
        motivo: f.motivo,
        desde: localAIso(f.desde),
        hasta: localAIso(f.hasta),
        codigoAutorizacion: f.codigo,
        certificado: f.certificado,
      });
      toast.success(
        n > 1 ? "Exención creada (2 altas: entrantes y salientes)." : "Exención creada.",
      );
      onCreada();
      onClose();
    } catch (e) {
      toast.error(
        e instanceof DataAccessError || e instanceof Error
          ? e.message
          : "No se pudo crear la exención",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Nueva exención"
      description="Mientras esté vigente, el impuesto elegido se calcula en 0% para ese CUIT."
      onSubmit={guardar}
      submitLabel={guardando ? "Creando…" : "Crear exención"}
      size="lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="ex-cuit">CUIT</Label>
          <Input
            id="ex-cuit"
            inputMode="numeric"
            value={f.cuit}
            onChange={(e) => setF({ ...f, cuit: e.target.value })}
            placeholder="Exactamente 11 dígitos"
          />
          <p className="text-[11px] mt-1">
            {!cuit ? (
              <span className="text-muted-foreground">Exactamente 11 dígitos.</span>
            ) : !cuitOk ? (
              <span className="text-red-600">Tiene que tener 11 dígitos.</span>
            ) : cliente.isLoading ? (
              <span className="text-muted-foreground">Buscando cliente…</span>
            ) : cliente.data ? (
              <span className="text-emerald-700">
                {cliente.data.nombre} · <span className="font-mono">{cliente.data.legajo}</span>
              </span>
            ) : (
              <span className="text-amber-700">
                No hay un cliente con ese CUIT (se guarda igual por CUIT).
              </span>
            )}
          </p>
        </div>
        <div>
          <Label htmlFor="ex-impuesto">Impuesto</Label>
          <select
            id="ex-impuesto"
            className={selectCls}
            value={impuestoId}
            onChange={(e) => setF({ ...f, impuestoId: e.target.value })}
          >
            {impuestos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.codigo} · {i.nombre}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">
            Cada impuesto lleva su propia exención.
          </p>
        </div>
        <div>
          <Label htmlFor="ex-direccion">Dirección</Label>
          <select
            id="ex-direccion"
            className={selectCls}
            value={direccion}
            disabled={esPadron}
            onChange={(e) => setF({ ...f, direccion: e.target.value as AltaForm["direccion"] })}
          >
            <option value="Ambos">Ambos</option>
            <option value="Entrantes">Entrantes</option>
            <option value="Salientes">Salientes</option>
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">
            {esPadron
              ? "IIBB solo se retiene en los ingresos: la exención va en Entrantes."
              : "Con Ambos se crean dos altas (entrantes y salientes), desactivables por separado."}
          </p>
        </div>
        <div>
          <Label htmlFor="ex-tipo">Tipo</Label>
          <select
            id="ex-tipo"
            className={selectCls}
            value={f.tipo}
            onChange={(e) => setF({ ...f, tipo: e.target.value as TipoExencion })}
          >
            {TIPOS_EXENCION.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ex-motivo">Motivo</Label>
          <Input
            id="ex-motivo"
            value={f.motivo}
            onChange={(e) => setF({ ...f, motivo: e.target.value })}
            placeholder="Ej: Certificado de exención AFIP — cooperativa"
          />
        </div>
        <div>
          <Label htmlFor="ex-desde">Vigencia desde</Label>
          <Input
            id="ex-desde"
            type="datetime-local"
            value={f.desde}
            onChange={(e) => setF({ ...f, desde: e.target.value })}
          />
          <p className="text-[11px] text-muted-foreground mt-1">Vacío: desde ahora.</p>
        </div>
        <div>
          <Label htmlFor="ex-hasta">Vigencia hasta</Label>
          <Input
            id="ex-hasta"
            type="datetime-local"
            value={f.hasta}
            onChange={(e) => setF({ ...f, hasta: e.target.value })}
          />
          <p className={`text-[11px] mt-1 ${fechasOk ? "text-muted-foreground" : "text-red-600"}`}>
            {fechasOk
              ? "Puede quedar vacío (sin vencimiento)."
              : "Tiene que ser posterior a la fecha desde."}
          </p>
        </div>
        <div>
          <Label htmlFor="ex-codigo">Código de autorización (opcional)</Label>
          <Input
            id="ex-codigo"
            value={f.codigo}
            onChange={(e) => setF({ ...f, codigo: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="ex-cert">Certificado (opcional)</Label>
          <input
            id="ex-cert"
            type="file"
            accept={CERTIFICADO_TIPOS.join(",")}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-card file:px-3 file:py-1.5 file:text-sm"
            onChange={(e) => setF({ ...f, certificado: e.target.files?.[0] ?? null })}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            PDF, JPG, PNG o WEBP · hasta 10 MB.
          </p>
        </div>
      </div>
      {!valido && (
        <p className="text-xs text-muted-foreground">
          Completá CUIT de 11 dígitos, impuesto y motivo.
        </p>
      )}
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Verificar vencidas
// ---------------------------------------------------------------------------

function VerificarVencidasDialog({
  onClose,
  onHecho,
}: {
  onClose: () => void;
  onHecho: () => void;
}) {
  const preview = useQuery({
    queryKey: ["tax_exemptions", "vencidas"],
    queryFn: () => verificarVencidas(true),
  });
  const [aplicando, setAplicando] = useState(false);

  const aplicar = async () => {
    setAplicando(true);
    try {
      const r = await verificarVencidas(false);
      toast.success(
        r.total > 0
          ? `${r.total} exención(es) vencida(s) pasaron a inactivas.`
          : "No había exenciones vencidas.",
      );
      onHecho();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAplicando(false);
    }
  };

  const columns: Column<VencidaExencion>[] = [
    {
      key: "cuit",
      label: "CUIT",
      render: (v) => (
        <div className="leading-tight">
          <div className="font-mono tabular-nums">{v.cuit}</div>
          <div className="text-[11px] text-muted-foreground">
            {v.clienteNombre ?? v.clienteLegajo ?? "—"}
          </div>
        </div>
      ),
    },
    {
      key: "impuesto",
      label: "Impuesto",
      render: (v) => <span className="font-mono text-xs">{v.impuestoCodigo}</span>,
    },
    { key: "direccion", label: "Dirección", render: (v) => v.direccion },
    {
      key: "hasta",
      label: "Venció",
      render: (v) => <span className="text-xs">{fechaHora(v.hasta)}</span>,
    },
  ];

  const total = preview.data?.total ?? 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={aplicando ? undefined : onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div>
            <h3 className="font-display text-lg font-semibold">Verificar vencidas</h3>
            <p className="text-sm text-muted-foreground">
              Exenciones activas con la vigencia vencida. El cálculo ya no las aplica; al confirmar
              quedan inactivas.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={aplicando}
            className="p-1.5 hover:bg-muted rounded-md"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">
          {preview.isLoading ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Buscando vencidas…
            </div>
          ) : preview.isError ? (
            <p className="text-sm text-red-700">{(preview.error as Error).message}</p>
          ) : total === 0 ? (
            <div className="flex items-center gap-2 text-sm">
              <Badge tone="success">Al día</Badge> No hay exenciones vencidas activas.
            </div>
          ) : (
            <>
              <p className="text-sm mb-3">
                <span className="font-semibold">{total}</span> exención(es) vencida(s)
                {total > (preview.data?.items.length ?? 0)
                  ? ` (se muestran las primeras ${preview.data?.items.length})`
                  : ""}
                .
              </p>
              <DataTable
                columns={columns}
                data={preview.data?.items ?? []}
                keyExtractor={(v) => v.id}
                pageSize={8}
                showGlobalFilter={false}
                showDownloadButton={false}
              />
            </>
          )}
        </div>
        <div className="border-t px-6 py-3 flex justify-end gap-2">
          <BtnOutline onClick={onClose} disabled={aplicando}>
            Cerrar
          </BtnOutline>
          {total > 0 && (
            <BtnPrimary onClick={aplicar} disabled={aplicando}>
              {aplicando ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Desactivando…
                </>
              ) : (
                `Desactivar ${total} vencida(s)`
              )}
            </BtnPrimary>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detalle
// ---------------------------------------------------------------------------

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-medium mt-0.5 break-words">{children}</div>
    </div>
  );
}

function DetalleExencion({ e, onClose }: { e: Exencion; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="border-b px-6 py-4 flex justify-between items-start">
          <div>
            <h3 className="font-display text-lg font-semibold">
              Exención {e.impuestoCodigo} · {e.direccion}
            </h3>
            <p className="text-sm text-muted-foreground">
              {e.clienteNombre ?? "Sin cliente vinculado"} ·{" "}
              <span className="font-mono">{e.cuit}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Campo label="Estado">
            <SituacionBadge e={e} />
          </Campo>
          <Campo label="Impuesto">
            {e.impuestoNombre}{" "}
            <span className="font-mono text-xs text-muted-foreground">({e.impuestoCodigo})</span>
          </Campo>
          <Campo label="Tipo">{e.tipo}</Campo>
          <Campo label="Dirección">{e.direccion}</Campo>
          <Campo label="Vigencia desde">{fechaHora(e.desde)}</Campo>
          <Campo label="Vigencia hasta">{e.hasta ? fechaHora(e.hasta) : "Sin vencimiento"}</Campo>
          <Campo label="Cliente">
            {e.clienteLegajo ? <span className="font-mono">{e.clienteLegajo}</span> : "—"}
          </Campo>
          <Campo label="Email">{e.email ?? "—"}</Campo>
          <Campo label="Código de autorización">{e.codigoAutorizacion ?? "—"}</Campo>
          <Campo label="Certificado">
            {e.certificado ? (
              <button
                type="button"
                className="text-primary underline"
                onClick={() => abrirCertificado(e.certificado!)}
              >
                Ver certificado
              </button>
            ) : (
              "—"
            )}
          </Campo>
          <div className="sm:col-span-2">
            <Campo label="Motivo">{e.motivo ?? "—"}</Campo>
          </div>
          <Campo label="Alta">{fechaHora(e.createdAt)}</Campo>
          <Campo label="Actualización">{fechaHora(e.updatedAt)}</Campo>
          {e.bajaAt && (
            <div className="sm:col-span-2">
              <Campo label="Baja">
                {fechaHora(e.bajaAt)} · {e.bajaMotivo}
              </Campo>
            </div>
          )}
        </div>
        <div className="border-t px-6 py-3 flex justify-end">
          <BtnOutline onClick={onClose}>Cerrar</BtnOutline>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagina
// ---------------------------------------------------------------------------

function Page() {
  const qc = useQueryClient();
  const { can } = useCan();
  const puedeCrear = can("crear", "impuestos");
  const puedeModificar = can("modificar", "impuestos");
  const { rows: impuestos } = useImpuestosForAsignacion();

  const [page, setPage] = useState(0);
  const [cuitInput, setCuitInput] = useState("");
  const cuit = useDebouncedValue(cuitInput, 350);
  const [impuestoId, setImpuestoId] = useState("");
  const [direccion, setDireccion] = useState<DireccionExencion | "">("");
  const [estado, setEstado] = useState<SituacionExencion | "">("");
  const filtros: Omit<ExencionFilters, "page" | "pageSize"> = {
    cuit: cuit || undefined,
    impuestoId: impuestoId || undefined,
    direccion: direccion || undefined,
    situacion: estado || undefined,
  };
  // Cualquier cambio de filtro vuelve a la primera pagina.
  useEffect(() => setPage(0), [cuit, impuestoId, direccion, estado]);

  const query = useQuery({
    queryKey: [...QK_EXENCIONES, "list", page, filtros],
    queryFn: () => listExenciones({ page, pageSize: PAGE_SIZE, ...filtros }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const vencidas = useQuery({
    queryKey: [...QK_EXENCIONES, "vencidas-activas"],
    queryFn: contarVencidasActivas,
    staleTime: 60_000,
  });

  const [nueva, setNueva] = useState(false);
  const [verificar, setVerificar] = useState(false);
  const [detalle, setDetalle] = useState<Exencion | null>(null);
  const [exportando, setExportando] = useState(false);

  const refrescar = () => void qc.invalidateQueries({ queryKey: QK_EXENCIONES });

  const cambiarEstado = async (e: Exencion) => {
    try {
      await setEstadoExencion(e.id, e.estado === "Activa" ? "Inactiva" : "Activa");
      toast.success(e.estado === "Activa" ? "Exención desactivada." : "Exención activada.");
      refrescar();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const exportar = async () => {
    setExportando(true);
    try {
      const filas = await listExencionesParaExportar(filtros);
      const cab = [
        "Usuario",
        "Legajo",
        "CUIT",
        "Impuesto",
        "Dirección",
        "Tipo",
        "Motivo",
        "Vigencia desde",
        "Vigencia hasta",
        "Estado",
        "Alta",
        "Actualización",
      ];
      const lineas = filas.map((e) =>
        [
          e.clienteNombre ?? e.email ?? "",
          e.clienteLegajo ?? "",
          e.cuit,
          e.impuestoCodigo,
          e.direccion,
          e.tipo,
          e.motivo ?? "",
          fechaHora(e.desde),
          e.hasta ? fechaHora(e.hasta) : "Sin fecha",
          situacion(e),
          fechaHora(e.createdAt),
          fechaHora(e.updatedAt),
        ]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(";"),
      );
      const blob = new Blob(["﻿" + [cab.join(";"), ...lineas].join("\n")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "exenciones.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setExportando(false);
    }
  };

  const getActions = (e: Exencion): ActionItem[] => [
    { label: "Ver", icon: Eye, onClick: () => setDetalle(e) },
    {
      label: e.estado === "Activa" ? "Desactivar" : "Activar",
      icon: e.estado === "Activa" ? PowerOff : Power,
      disabled: !puedeModificar,
      onClick: () => cambiarEstado(e),
    },
  ];

  const columns: Column<Exencion>[] = [
    {
      key: "usuario",
      label: "Usuario",
      render: (e) => (
        <div className="leading-tight">
          <div className="font-medium">{e.clienteNombre ?? e.email ?? "—"}</div>
          <div className="text-[11px] text-muted-foreground font-mono">
            {e.clienteLegajo ?? "sin cliente"}
          </div>
        </div>
      ),
    },
    {
      key: "cuit",
      label: "CUIT",
      render: (e) => <span className="font-mono tabular-nums text-xs">{e.cuit}</span>,
    },
    {
      key: "impuesto",
      label: "Impuesto",
      render: (e) => <span className="font-mono text-xs">{e.impuestoCodigo}</span>,
    },
    {
      key: "direccion",
      label: "Dirección",
      render: (e) => <Badge tone="neutral">{e.direccion}</Badge>,
    },
    {
      key: "motivo",
      label: "Motivo",
      render: (e) => <span className="text-xs line-clamp-2 max-w-[220px]">{e.motivo ?? "—"}</span>,
    },
    {
      key: "desde",
      label: "Vigencia desde",
      render: (e) => <span className="text-xs whitespace-nowrap">{fechaHora(e.desde)}</span>,
    },
    {
      key: "hasta",
      label: "Vigencia hasta",
      render: (e) => <span className="text-xs whitespace-nowrap">{fechaHora(e.hasta)}</span>,
    },
    { key: "estado", label: "Estado", render: (e) => <SituacionBadge e={e} /> },
    {
      key: "alta",
      label: "Alta",
      render: (e) => <span className="text-xs whitespace-nowrap">{fechaHora(e.createdAt)}</span>,
    },
    {
      key: "actualizacion",
      label: "Actualización",
      render: (e) => <span className="text-xs whitespace-nowrap">{fechaHora(e.updatedAt)}</span>,
    },
  ];

  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hayFiltros = cuitInput || impuestoId || direccion || estado;
  const nVencidas = vencidas.data ?? 0;

  return (
    <PermissionGuard recurso="impuestos">
      <PageHeader
        title="Exenciones impositivas"
        description="Exenciones por CUIT de Débitos y Créditos, Ingresos Brutos y otros impuestos."
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <TarjetaAccion
          titulo="Alta manual de exenciones"
          texto="Crea una exención por CUIT e impuesto. Si elegís Ambos, se crean dos altas: entrantes y salientes."
        >
          <BtnPrimary onClick={() => setNueva(true)} disabled={!puedeCrear}>
            <Plus size={14} /> Nueva exención
          </BtnPrimary>
        </TarjetaAccion>
        <TarjetaAccion
          titulo="Verificar vencidas"
          texto="Lista las exenciones activas con la vigencia vencida y las pasa a inactivas. El cálculo ya no las aplica."
        >
          <div className="flex flex-wrap items-center gap-2">
            <BtnOutline onClick={() => setVerificar(true)} disabled={!puedeModificar}>
              <CalendarClock size={14} /> Verificar vencidas
            </BtnOutline>
            {nVencidas > 0 && <Badge tone="danger">{nVencidas} vencida(s) activas</Badge>}
          </div>
        </TarjetaAccion>
        <TarjetaAccion
          titulo="Sync retroactivo"
          texto="Devolver lo retenido antes de cargar un certificado con fecha pasada (preview y aplicar)."
        >
          <div className="flex items-center gap-2">
            <BtnOutline disabled>Ver preview</BtnOutline>
            <Badge tone="neutral">Próximamente</Badge>
          </div>
        </TarjetaAccion>
      </div>

      <h3 className="font-display font-semibold text-base mb-3">Exenciones</h3>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="f-cuit">CUIT</Label>
          <Input
            id="f-cuit"
            inputMode="numeric"
            value={cuitInput}
            onChange={(e) => setCuitInput(e.target.value)}
            placeholder="CUIT o comienzo del CUIT…"
          />
        </div>
        <div className="min-w-[170px]">
          <Label htmlFor="f-impuesto">Impuesto</Label>
          <select
            id="f-impuesto"
            className={selectCls}
            value={impuestoId}
            onChange={(e) => setImpuestoId(e.target.value)}
          >
            <option value="">Todos los impuestos</option>
            {impuestos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.codigo}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[170px]">
          <Label htmlFor="f-direccion">Dirección</Label>
          <select
            id="f-direccion"
            className={selectCls}
            value={direccion}
            onChange={(e) => setDireccion(e.target.value as DireccionExencion | "")}
          >
            <option value="">Todas las direcciones</option>
            <option value="Entrantes">Entrantes</option>
            <option value="Salientes">Salientes</option>
          </select>
        </div>
        <div className="min-w-[170px]">
          <Label htmlFor="f-estado">Estado</Label>
          <select
            id="f-estado"
            className={selectCls}
            value={estado}
            onChange={(e) => setEstado(e.target.value as SituacionExencion | "")}
          >
            <option value="">Todos los estados</option>
            {SITUACIONES_EXENCION.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {hayFiltros && (
          <BtnOutline
            onClick={() => {
              setCuitInput("");
              setImpuestoId("");
              setDireccion("");
              setEstado("");
            }}
          >
            Limpiar
          </BtnOutline>
        )}
        <BtnOutline onClick={exportar} disabled={exportando || total === 0}>
          {exportando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}{" "}
          Exportar
        </BtnOutline>
      </div>

      {query.isLoading ? (
        <div className="flex items-center justify-center rounded-xl border bg-card py-16 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin mr-2" /> Cargando exenciones…
        </div>
      ) : query.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
          <AlertTriangle size={28} />
          <p>{(query.error as Error).message}</p>
          <BtnOutline onClick={() => query.refetch()}>Reintentar</BtnOutline>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <Inbox size={28} />
          <p>No hay exenciones que coincidan con los filtros.</p>
        </div>
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
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>
              {total} exención(es) · página {page + 1} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <BtnOutline
                disabled={page === 0 || query.isFetching}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Anterior
              </BtnOutline>
              <BtnOutline
                disabled={page + 1 >= totalPaginas || query.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </BtnOutline>
            </div>
          </div>
        </>
      )}

      {nueva && <NuevaExencionDialog onClose={() => setNueva(false)} onCreada={refrescar} />}
      {verificar && (
        <VerificarVencidasDialog onClose={() => setVerificar(false)} onHecho={refrescar} />
      )}
      {detalle && <DetalleExencion e={detalle} onClose={() => setDetalle(null)} />}
    </PermissionGuard>
  );
}
