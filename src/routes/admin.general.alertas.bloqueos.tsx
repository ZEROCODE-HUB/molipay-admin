import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, CheckCircle, Unlock, Plus, ArrowRightLeft, AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column, type TableServerFilters } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge, BtnPrimary } from "@/components/portal-shell";
import { Pagination } from "@/components/pagination";
import { LegajoCell } from "@/components/legajo-label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useClientesForSelect } from "@/hooks/useComercios";
import { listSubcuentas } from "@/lib/api/subcuentas";
import { descargarCsv } from "@/lib/api/alert-rules";
import {
  acceptBlock,
  createManualBlock,
  listAllBlocks,
  listBlocks,
  releaseBlock,
  type AccountBlock,
  type BlockFilters,
  type BlockScope,
} from "@/lib/api/compliance";

export const Route = createFileRoute("/admin/general/alertas/bloqueos")({
  head: () => ({ meta: [{ title: "Listado de bloqueos — Admin Panel" }] }),
  component: Page,
});

const PAGE_SIZES = [10, 20, 50];
const ESTADO_LABEL = { active: "Bloqueado", released: "Desbloqueado" } as const;
const COMPLIANCE_LABEL = { pending: "Pendiente", accepted: "Aceptado" } as const;
const ALCANCE_LABEL: Record<BlockScope, string> = { client: "Toda la cuenta", subaccount: "Subcuenta" };

const fmtFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtMonto = (n: number) => `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const invertir = <K extends string>(m: Record<K, string>) => new Map(Object.entries(m).map(([k, v]) => [v as string, k as K]));
const ESTADO_BY_LABEL = invertir(ESTADO_LABEL);
const COMPLIANCE_BY_LABEL = invertir(COMPLIANCE_LABEL);
const ALCANCE_BY_LABEL = invertir(ALCANCE_LABEL);

function Page() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [panel, setPanel] = useState<TableServerFilters>({ global: "", enums: {}, dates: {} });
  const search = useDebouncedValue(panel.global.trim(), 350);

  const filtros: BlockFilters = useMemo(
    () => ({
      search: search || undefined,
      blockStatus: panel.enums.estado ? ESTADO_BY_LABEL.get(panel.enums.estado) : undefined,
      complianceStatus: panel.enums.compliance ? COMPLIANCE_BY_LABEL.get(panel.enums.compliance) : undefined,
      scope: panel.enums.alcance ? ALCANCE_BY_LABEL.get(panel.enums.alcance) : undefined,
      blockedFrom: panel.dates.blockedAt?.from || undefined,
      blockedTo: panel.dates.blockedAt?.to || undefined,
      acceptedFrom: panel.dates.acceptedAt?.from || undefined,
      acceptedTo: panel.dates.acceptedAt?.to || undefined,
    }),
    [search, panel.enums, panel.dates],
  );

  const lista = useQuery({
    queryKey: ["account_blocks", filtros, page, pageSize],
    queryFn: () => listBlocks({ ...filtros, page, pageSize }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
  const rows = lista.data?.rows ?? [];
  const total = lista.data?.total ?? 0;

  const [detalle, setDetalle] = useState<AccountBlock | null>(null);
  const [aceptando, setAceptando] = useState<AccountBlock | null>(null);
  const [liberando, setLiberando] = useState<AccountBlock | null>(null);
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [nuevo, setNuevo] = useState(false);

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ["account_blocks"] });

  const aceptar = async () => {
    if (!aceptando) return;
    try {
      await acceptBlock(aceptando.id);
      toast.success("Bloqueo aceptado por Compliance (sigue activo hasta liberarlo)");
      await refrescar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAceptando(null);
    }
  };

  const liberar = async () => {
    if (!liberando) return;
    if (notas.trim().length < 5) {
      toast.error("Indicá el motivo de la liberación (al menos 5 caracteres)");
      return;
    }
    setEnviando(true);
    try {
      const r = await releaseBlock(liberando.id, notas.trim());
      toast.success(
        r.depositos_liberados > 0
          ? `Bloqueo liberado. Se liberaron ${r.depositos_liberados} depósito(s) retenido(s) por ${fmtMonto(Number(r.monto_liberado))}.`
          : "Bloqueo liberado.",
      );
      setLiberando(null);
      setDetalle(null);
      await refrescar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const exportar = async () => {
    try {
      const todos = await listAllBlocks(filtros);
      descargarCsv(
        `bloqueos-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Legajo", "Usuario", "Nombre", "Origen", "Alcance", "Subcuenta", "Motivo", "Estado", "Compliance", "Fecha de bloqueo", "Fecha de aceptación", "Fecha de liberación", "Retenido"],
        todos.map((b) => [
          b.legajo, b.correo, b.nombre, b.origin === "rule" ? `Regla: ${b.ruleName ?? ""}` : "Manual",
          ALCANCE_LABEL[b.scope], b.subcuentaNombre ?? "", b.reason, ESTADO_LABEL[b.blockStatus],
          COMPLIANCE_LABEL[b.complianceStatus], b.blockedAt, b.acceptedAt ?? "", b.releasedAt ?? "", b.heldAmount,
        ]),
      );
    } catch (e) {
      toast.error(`No se pudo exportar: ${(e as Error).message}`);
    }
  };

  const getActions = (b: AccountBlock): ActionItem[] => [
    { label: "Ver detalle", icon: Eye, onClick: () => setDetalle(b) },
    ...(b.complianceStatus === "pending" ? [{ label: "Aceptar (Compliance)", icon: CheckCircle, onClick: () => setAceptando(b) }] : []),
    ...(b.blockStatus === "active"
      ? [{ label: "Desbloquear", icon: Unlock, variant: "danger" as const, onClick: () => { setNotas(""); setLiberando(b); } }]
      : []),
    ...(b.idTxn
      ? [{ label: "Ver operación", icon: ArrowRightLeft, onClick: () => navigate({ to: "/admin/general/movimientos", search: { txid: b.idTxn! } }) }]
      : []),
  ];

  const columns: Column<AccountBlock>[] = [
    { key: "legajo", label: "Legajo", minWidth: 130, render: (r) => <LegajoCell legajo={r.legajo} /> },
    { key: "correo", label: "Usuario", minWidth: 180, maxWidth: 260, render: (r) => r.correo },
    { key: "nombre", label: "Nombre", minWidth: 160, maxWidth: 240, render: (r) => r.nombre },
    {
      key: "alcance",
      label: "Tipo / alcance",
      filterable: "enum",
      filterOptions: Object.values(ALCANCE_LABEL),
      minWidth: 190,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{r.origin === "rule" ? r.ruleName ?? "Regla" : "Manual"}</span>
          <span className="text-[11px] text-muted-foreground">
            {ALCANCE_LABEL[r.scope]}{r.scope === "subaccount" && r.subcuentaNombre ? `: ${r.subcuentaNombre}` : ""}
          </span>
        </div>
      ),
    },
    { key: "reason", label: "Motivo", minWidth: 200, maxWidth: 300, tooltip: (r) => r.reason, render: (r) => r.reason },
    {
      key: "estado",
      label: "Estado",
      filterable: "enum",
      filterOptions: Object.values(ESTADO_LABEL),
      minWidth: 120,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <Badge tone={r.blockStatus === "active" ? "danger" : "success"}>{ESTADO_LABEL[r.blockStatus]}</Badge>
          {r.heldAmount > 0 && <span className="text-[11px] text-muted-foreground">Retenido {fmtMonto(r.heldAmount)}</span>}
        </div>
      ),
    },
    {
      key: "compliance",
      label: "Compliance",
      filterable: "enum",
      filterOptions: Object.values(COMPLIANCE_LABEL),
      minWidth: 110,
      render: (r) => <Badge tone={r.complianceStatus === "accepted" ? "success" : "warn"}>{COMPLIANCE_LABEL[r.complianceStatus]}</Badge>,
    },
    { key: "blockedAt", label: "Fecha de bloqueo", filterable: "date", minWidth: 150, render: (r) => <span className="font-mono tabular-nums text-xs">{fmtFecha(r.blockedAt)}</span> },
    { key: "acceptedAt", label: "Fecha de aceptación", filterable: "date", minWidth: 150, render: (r) => <span className="font-mono tabular-nums text-xs">{fmtFecha(r.acceptedAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        title="Listado de bloqueos"
        description="Bloqueos preventivos vigentes e históricos. Un bloqueo activo impide los egresos de la cuenta o subcuenta y retiene los depósitos entrantes."
        action={
          <BtnPrimary onClick={() => setNuevo(true)}>
            <Plus size={14} /> Nuevo bloqueo manual
          </BtnPrimary>
        }
      />

      {lista.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
          <AlertTriangle size={24} />
          <p>No se pudieron cargar los bloqueos: {(lista.error as Error).message}</p>
          <button type="button" onClick={() => lista.refetch()} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.id}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
            loading={lista.isLoading}
            hidePagination
            serverFilterState={panel}
            onServerFilterChange={(f) => {
              setPage(0);
              setPanel(f);
            }}
            serverResultCount={total}
            onDownloadCSV={() => void exportar()}
            emptyMessage="No hay bloqueos que coincidan con los filtros."
          />
          <Pagination
            page={page + 1}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            pageSize={pageSize}
            total={total}
            countLabel="bloqueo(s)"
            pageSizes={PAGE_SIZES}
            disabled={lista.isFetching}
            onPageChange={(p) => setPage(p - 1)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(0);
            }}
          />
        </>
      )}

      {detalle && (
        <FormDialog open onClose={() => setDetalle(null)} title="Detalle del bloqueo" description={`${detalle.legajo} · ${detalle.nombre}`} onSubmit={() => setDetalle(null)} submitLabel="Cerrar" size="lg">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Campo label="Cliente" value={`${detalle.nombre} · ${detalle.correo}`} />
            <Campo label="Origen" value={detalle.origin === "rule" ? `Regla: ${detalle.ruleName ?? "—"}` : "Manual"} />
            <Campo label="Alcance" value={detalle.scope === "client" ? "Toda la cuenta" : `Subcuenta ${detalle.subcuentaNombre ?? ""} ${detalle.subcuentaCvu ?? ""}`} />
            <Campo label="Estado" value={`${ESTADO_LABEL[detalle.blockStatus]} · Compliance ${COMPLIANCE_LABEL[detalle.complianceStatus].toLowerCase()}`} />
            <Campo label="Bloqueado" value={`${fmtFecha(detalle.blockedAt)} · ${detalle.blockedByName ?? "Sistema"}`} />
            <Campo label="Aceptado" value={detalle.acceptedAt ? `${fmtFecha(detalle.acceptedAt)} · ${detalle.acceptedByName ?? "—"}` : "—"} />
            <Campo label="Liberado" value={detalle.releasedAt ? `${fmtFecha(detalle.releasedAt)} · ${detalle.releasedByName ?? "—"}` : "—"} />
            <Campo label="Fondos retenidos" value={fmtMonto(detalle.heldAmount)} />
            <Campo label="Motivo" value={detalle.reason} full />
            {detalle.releaseNotes && <Campo label="Motivo de liberación" value={detalle.releaseNotes} full />}
            {detalle.idTxn && <Campo label="Operación (TXID)" value={detalle.idTxn} mono />}
          </div>
        </FormDialog>
      )}

      <ConfirmDialog
        open={aceptando !== null}
        onClose={() => setAceptando(null)}
        onConfirm={aceptar}
        title="Aceptar bloqueo"
        message="Compliance confirma el bloqueo. La cuenta sigue bloqueada hasta que se libere explícitamente."
        confirmLabel="Aceptar"
      />

      {liberando && (
        <FormDialog
          open
          onClose={() => setLiberando(null)}
          title="Desbloquear"
          description={`${liberando.legajo} · ${ALCANCE_LABEL[liberando.scope]}`}
          onSubmit={() => void liberar()}
          submitLabel={enviando ? "Liberando…" : "Desbloquear"}
        >
          {liberando.heldAmount > 0 && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Se liberarán {fmtMonto(liberando.heldAmount)} de depósitos retenidos: pasan de saldo retenido a disponible con su asiento contable.
            </div>
          )}
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Motivo de la liberación</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="w-full h-24 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
          />
        </FormDialog>
      )}

      {nuevo && <NuevoBloqueoDialog onClose={() => setNuevo(false)} onDone={refrescar} />}
    </>
  );
}

function Campo({ label, value, mono, full }: { label: string; value: string; mono?: boolean; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-medium break-words ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}

function NuevoBloqueoDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [busqueda, setBusqueda] = useState("");
  const debounced = useDebouncedValue(busqueda, 300);
  const { data: opciones } = useClientesForSelect(debounced || undefined);
  const [abierto, setAbierto] = useState(false);
  const [cliente, setCliente] = useState<{ legajo: string; correo: string } | null>(null);
  const [subcuenta, setSubcuenta] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const subs = useQuery({
    queryKey: ["subcuentas", cliente?.legajo],
    queryFn: () => listSubcuentas(cliente!.legajo),
    enabled: Boolean(cliente?.legajo),
  });

  const inputCls = "w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  const guardar = async () => {
    if (!cliente) {
      toast.error("Seleccioná un cliente de la lista");
      return;
    }
    if (motivo.trim().length < 5) {
      toast.error("Indicá el motivo del bloqueo (al menos 5 caracteres)");
      return;
    }
    setEnviando(true);
    try {
      await createManualBlock({ legajo: cliente.legajo, subaccountId: subcuenta || null, reason: motivo.trim() });
      toast.success("Bloqueo creado: ya impide los egresos del alcance elegido");
      onDone();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <FormDialog open onClose={onClose} title="Nuevo bloqueo manual" description="Suspende los egresos y retiene los depósitos del alcance elegido." onSubmit={() => void guardar()} submitLabel={enviando ? "Bloqueando…" : "Bloquear"}>
      <div className="space-y-3">
        <div className="relative">
          <label className="text-xs font-semibold mb-1.5 block">Cliente</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setCliente(null);
                setSubcuenta("");
                setAbierto(true);
              }}
              onFocus={() => setAbierto(true)}
              onBlur={() => setTimeout(() => setAbierto(false), 150)}
              placeholder="Buscar por legajo, correo o nombre…"
              className={`${inputCls} pl-9`}
              autoComplete="off"
            />
          </div>
          {abierto && (opciones?.length ?? 0) > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-md border border-input bg-card shadow-lg max-h-56 overflow-auto">
              {(opciones ?? []).map((c) => (
                <button
                  key={c.legajo}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setBusqueda(c.correo);
                    setCliente({ legajo: c.legajo, correo: c.correo });
                    setAbierto(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex flex-col"
                >
                  <span className="font-medium">{c.correo}</span>
                  <span className="text-xs text-muted-foreground font-mono">{c.legajo} · {c.nombre}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block">Alcance</label>
          <select value={subcuenta} onChange={(e) => setSubcuenta(e.target.value)} disabled={!cliente} className={inputCls}>
            <option value="">Toda la cuenta del cliente</option>
            {(subs.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>Subcuenta {s.nombre} — {s.cbu ?? "sin CVU"}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block">Motivo</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full h-24 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
          />
        </div>
      </div>
    </FormDialog>
  );
}
