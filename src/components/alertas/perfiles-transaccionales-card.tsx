import { useMemo, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit3, Trash2, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column, type TableServerFilters } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { BtnPrimary } from "@/components/portal-shell";
import { Pagination } from "@/components/pagination";
import { LegajoCell } from "@/components/legajo-label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useClientesForSelect } from "@/hooks/useComercios";
import {
  deleteTransactionProfile,
  descargarCsv,
  listAllTransactionProfiles,
  listTransactionProfiles,
  saveTransactionProfile,
  type TransactionProfile,
} from "@/lib/api/alert-rules";

const PAGE_SIZES = [10, 20, 50];
const fmtMonto = (n: number) => `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const inputCls = "w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

type Draft = { legajo: string; correo: string; monto: string; operaciones: string; notas: string; editando: boolean };
const vacio: Draft = { legajo: "", correo: "", monto: "", operaciones: "", notas: "", editando: false };

/** Consumo del mes respecto del perfil (para ver de un vistazo quién está cerca del límite). */
function Consumo({ actual, perfil }: { actual: number; perfil: number }) {
  if (perfil <= 0) return <span className="text-muted-foreground">—</span>;
  const pct = Math.round((actual / perfil) * 100);
  const tono = pct > 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="min-w-[120px]">
      <div className="flex justify-between text-[11px] tabular-nums"><span>{fmtMonto(actual)}</span><span className="font-semibold">{pct}%</span></div>
      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${tono}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

export function PerfilesTransaccionalesCard() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filtros, setFiltros] = useState<TableServerFilters>({ global: "", enums: {}, dates: {} });
  const search = useDebouncedValue(filtros.global.trim(), 350);

  const lista = useQuery({
    queryKey: ["transaction_profiles", page, pageSize, search],
    queryFn: () => listTransactionProfiles({ page, pageSize, search: search || undefined }),
    placeholderData: keepPreviousData,
  });
  const filas = lista.data?.rows ?? [];
  const total = lista.data?.total ?? 0;

  const [dialogo, setDialogo] = useState(false);
  const [draft, setDraft] = useState<Draft>(vacio);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState<TransactionProfile | null>(null);

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ["transaction_profiles"] });

  const abrir = (p?: TransactionProfile) => {
    setDraft(
      p
        ? {
            legajo: p.legajo,
            correo: p.correo,
            monto: String(p.monthlyAmount),
            operaciones: p.monthlyOperations == null ? "" : String(p.monthlyOperations),
            notas: p.notes ?? "",
            editando: true,
          }
        : vacio,
    );
    setError(null);
    setDialogo(true);
  };

  const guardar = async () => {
    if (!draft.legajo) return setError("Seleccioná un cliente de la lista.");
    const monto = Number(draft.monto);
    if (draft.monto.trim() === "" || !Number.isFinite(monto) || monto < 0) return setError("Ingresá el volumen mensual esperado.");
    const ops = draft.operaciones.trim() === "" ? null : Number(draft.operaciones);
    if (ops !== null && (!Number.isInteger(ops) || ops < 0)) return setError("La cantidad de operaciones debe ser un entero.");
    setGuardando(true);
    setError(null);
    try {
      await saveTransactionProfile({
        legajo: draft.legajo,
        monthlyAmount: Math.round(monto * 100) / 100,
        monthlyOperations: ops,
        notes: draft.notas.trim() || null,
      });
      await refrescar();
      toast.success("Perfil transaccional guardado");
      setDialogo(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!borrando) return;
    try {
      await deleteTransactionProfile(borrando.id);
      await refrescar();
      toast.success("Perfil eliminado: el cliente deja de evaluarse por exceso de perfil");
    } catch (e) {
      toast.error(`No se pudo eliminar: ${(e as Error).message}`);
    } finally {
      setBorrando(null);
    }
  };

  const exportar = async () => {
    try {
      const todos = await listAllTransactionProfiles(search || undefined);
      descargarCsv(
        `perfiles-transaccionales-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Legajo", "Usuario", "Nombre", "Actividad", "Volumen mensual esperado", "Operaciones mensuales", "Volumen del mes", "Operaciones del mes", "Notas"],
        todos.map((p) => [p.legajo, p.correo, p.nombre, p.actividad ?? "", p.monthlyAmount, p.monthlyOperations ?? "", p.currentMonthAmount, p.currentMonthOperations, p.notes ?? ""]),
      );
    } catch (e) {
      toast.error(`No se pudo exportar: ${(e as Error).message}`);
    }
  };

  const getActions = (p: TransactionProfile): ActionItem[] => [
    { label: "Editar", icon: Edit3, onClick: () => abrir(p) },
    { label: "Eliminar", icon: Trash2, variant: "danger", onClick: () => setBorrando(p) },
  ];

  const columns: Column<TransactionProfile>[] = useMemo(
    () => [
      { key: "legajo", label: "Legajo", minWidth: 130, render: (r) => <LegajoCell legajo={r.legajo} /> },
      { key: "correo", label: "Usuario", minWidth: 180, render: (r) => r.correo },
      { key: "actividad", label: "Actividad", minWidth: 140, render: (r) => r.actividad ?? <span className="text-muted-foreground">—</span> },
      { key: "monto", label: "Volumen mensual esperado", minWidth: 150, render: (r) => <span className="font-mono tabular-nums">{fmtMonto(r.monthlyAmount)}</span> },
      { key: "ops", label: "Operaciones / mes", minWidth: 110, render: (r) => <span className="font-mono tabular-nums">{r.monthlyOperations ?? "—"}</span> },
      { key: "consumo", label: "Consumo del mes", minWidth: 160, render: (r) => <Consumo actual={r.currentMonthAmount} perfil={r.monthlyAmount} /> },
    ],
    [],
  );

  return (
    <div className="bg-card border rounded-lg p-6 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">Perfil transaccional esperado por cliente</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Base de la alerta "Exceso del perfil transaccional". Volumen mensual = depósitos + transferencias salientes (sin internas).
          </p>
        </div>
        <BtnPrimary onClick={() => abrir()}>
          <Plus size={14} /> Cargar perfil
        </BtnPrimary>
      </div>

      {lista.isError ? (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle size={14} /> No se pudieron cargar los perfiles: {(lista.error as Error).message}
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={filas}
            keyExtractor={(r) => r.id}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
            loading={lista.isLoading}
            hidePagination
            serverFilterState={filtros}
            onServerFilterChange={(f) => {
              setPage(0);
              setFiltros(f);
            }}
            serverResultCount={total}
            onDownloadCSV={() => void exportar()}
            emptyMessage="No hay perfiles transaccionales cargados."
          />
          <Pagination
            page={page + 1}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            pageSize={pageSize}
            total={total}
            countLabel="perfil(es)"
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

      {dialogo && (
        <FormDialog
          open
          onClose={() => setDialogo(false)}
          title={draft.editando ? "Editar perfil transaccional" : "Cargar perfil transaccional"}
          onSubmit={() => void guardar()}
          submitLabel={guardando ? "Guardando…" : "Guardar"}
        >
          <div className="space-y-3">
            {draft.editando ? (
              <div className="text-sm">
                <span className="text-xs text-muted-foreground block">Cliente</span>
                <span className="font-medium">{draft.correo}</span> <span className="font-mono text-xs text-muted-foreground">{draft.legajo}</span>
              </div>
            ) : (
              <BuscadorCliente onSelect={(legajo, correo) => setDraft((d) => ({ ...d, legajo, correo }))} seleccionado={draft.legajo} />
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold mb-1.5 block">Volumen mensual esperado ($)</label>
                <input type="number" min={0} step="0.01" value={draft.monto} onChange={(e) => setDraft((d) => ({ ...d, monto: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block">Operaciones por mes (opcional)</label>
                <input type="number" min={0} step={1} value={draft.operaciones} onChange={(e) => setDraft((d) => ({ ...d, operaciones: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Fundamento (opcional)</label>
              <textarea
                value={draft.notas}
                onChange={(e) => setDraft((d) => ({ ...d, notas: e.target.value }))}
                placeholder="Ej.: declaración jurada de ingresos, balance, facturación estimada…"
                className="w-full h-20 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
              />
            </div>
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          </div>
        </FormDialog>
      )}

      <ConfirmDialog
        open={borrando !== null}
        onClose={() => setBorrando(null)}
        onConfirm={eliminar}
        title="Eliminar perfil transaccional"
        message="El cliente deja de evaluarse por exceso de perfil hasta que se le cargue uno nuevo."
        confirmLabel="Eliminar"
      />
    </div>
  );
}

function BuscadorCliente({ onSelect, seleccionado }: { onSelect: (legajo: string, correo: string) => void; seleccionado: string }) {
  const [busqueda, setBusqueda] = useState("");
  const debounced = useDebouncedValue(busqueda, 300);
  const { data: opciones } = useClientesForSelect(debounced || undefined);
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="relative">
      <label className="text-xs font-semibold mb-1.5 block">Cliente</label>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            onSelect("", "");
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
                onSelect(c.legajo, c.correo);
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
      {seleccionado && <p className="text-[11px] text-emerald-700 mt-1">Seleccionado: <span className="font-mono">{seleccionado}</span></p>}
    </div>
  );
}
