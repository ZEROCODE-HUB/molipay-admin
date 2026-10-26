import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, ShieldAlert, Plus, Eye, Edit3, Trash2, Loader2, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
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
  deleteClientBlockParameter,
  descargarCsv,
  listAlertRules,
  listAllClientBlockParameters,
  listClientBlockParameters,
  saveAlertRules,
  saveClientBlockParameter,
  type ClientBlockParameter,
} from "@/lib/api/alert-rules";
import { readSmvm, saveSmvm } from "@/lib/api/compliance";

/** Valor del SMVM: referencia de todas las reglas expresadas en salarios mínimos. */
function SmvmCard() {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["smvm"], queryFn: readSmvm });
  const [valor, setValor] = useState("");
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    if (q.data !== undefined) setValor(q.data > 0 ? String(q.data) : "");
  }, [q.data]);

  const guardar = async () => {
    const n = Number(valor);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Ingresá el valor vigente del SMVM (mayor a 0)");
      return;
    }
    setGuardando(true);
    try {
      await saveSmvm(Math.round(n * 100) / 100);
      await queryClient.invalidateQueries({ queryKey: ["smvm"] });
      toast.success("Valor del SMVM guardado");
    } catch (e) {
      toast.error(`No se pudo guardar: ${(e as Error).message}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-card border rounded-lg p-6 mb-6">
      <h3 className="font-display text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">
        Salario mínimo vital y móvil (SMVM)
      </h3>
      {q.isError ? (
        <p className="text-xs text-red-600">No se pudo cargar: {(q.error as Error).message}</p>
      ) : (
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px]">
            <label htmlFor="smvm" className="block text-xs font-semibold text-muted-foreground mb-1">Valor vigente (ARS)</label>
            <input
              id="smvm"
              type="number"
              min={0}
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Sin configurar"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={guardando || q.isLoading || valor === (q.data && q.data > 0 ? String(q.data) : "")}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar SMVM
          </button>
          {q.data === 0 && (
            <p className="w-full text-[11px] font-medium text-amber-700">
              Sin SMVM configurado, las reglas expresadas en salarios mínimos (alertas y bloqueos) no se evalúan.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/admin/general/alertas/parametros-bloqueos")({
  head: () => ({ meta: [{ title: "Parámetros de bloqueos — Admin Panel" }] }),
  component: Page,
});

const PAGE_SIZES = [10, 20, 50];
const REGLA_GLOBAL = "deposit_min_wages_block";

type Draft = {
  id?: string;
  legajo: string;
  correo: string;
  /** Texto para no perder lo que se tipea; vacío = usa el general. */
  persona: string;
  empresa: string;
};

const vacio: Draft = { legajo: "", correo: "", persona: "", empresa: "" };

/** Entero >= 0 o vacío (= usa el general). */
function leerUmbral(v: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = v.trim();
  if (t === "") return { ok: true, value: null };
  const n = Number(t);
  if (!Number.isFinite(n)) return { ok: false, error: "Ingresá un número" };
  if (n < 0) return { ok: false, error: "No puede ser negativo" };
  if (!Number.isInteger(n)) return { ok: false, error: "Debe ser un número entero" };
  return { ok: true, value: n };
}

const fmtUmbral = (v: number | null) => (v == null ? "General" : String(v));

function ClienteParamFields({
  draft,
  onChange,
  editando,
  generales,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  editando: boolean;
  generales: { persona: number | null; empresa: number | null };
}) {
  const [busqueda, setBusqueda] = useState(draft.correo || draft.legajo);
  const debounced = useDebouncedValue(busqueda, 300);
  const { data: opciones } = useClientesForSelect(debounced || undefined);
  const [abierto, setAbierto] = useState(false);
  const inputCls =
    "w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 relative">
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Cliente</label>
        {editando ? (
          <div className="h-9 flex items-center rounded-md border bg-muted px-3 text-sm">
            <span className="font-mono text-xs mr-2">{draft.legajo}</span>
            <span className="text-muted-foreground truncate">{draft.correo}</span>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  onChange({ ...draft, legajo: "", correo: "" });
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
                      onChange({ ...draft, legajo: c.legajo, correo: c.correo });
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
            {draft.legajo && (
              <p className="text-[11px] text-emerald-700 mt-1">Seleccionado: <span className="font-mono">{draft.legajo}</span></p>
            )}
          </>
        )}
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Salarios mínimos por persona</label>
        <input
          type="number"
          min={0}
          step={1}
          value={draft.persona}
          onChange={(e) => onChange({ ...draft, persona: e.target.value })}
          placeholder={`General: ${generales.persona ?? "—"}`}
          className={inputCls}
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Salarios mínimos por empresa</label>
        <input
          type="number"
          min={0}
          step={1}
          value={draft.empresa}
          onChange={(e) => onChange({ ...draft, empresa: e.target.value })}
          placeholder={`General: ${generales.empresa ?? "—"}`}
          className={inputCls}
        />
      </div>
      <p className="col-span-2 text-[11px] text-muted-foreground">
        Dejá un campo vacío para que ese cliente use el valor general.
      </p>
    </div>
  );
}

function Page() {
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------- generales
  const reglas = useQuery({ queryKey: ["alert_rules"], queryFn: listAlertRules });
  const regla = reglas.data?.find((r) => r.code === REGLA_GLOBAL);
  const generales = {
    persona: typeof regla?.parameters.individual_min_wages === "number" ? (regla.parameters.individual_min_wages as number) : null,
    empresa: typeof regla?.parameters.company_min_wages === "number" ? (regla.parameters.company_min_wages as number) : null,
  };
  const [params, setParams] = useState({ persona: "", empresa: "" });
  const [errGen, setErrGen] = useState<{ persona?: string; empresa?: string }>({});
  const [guardandoGen, setGuardandoGen] = useState(false);

  useEffect(() => {
    if (regla) setParams({ persona: String(generales.persona ?? ""), empresa: String(generales.empresa ?? "") });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regla?.updatedAt]);

  const genSinCambios = params.persona === String(generales.persona ?? "") && params.empresa === String(generales.empresa ?? "");

  const guardarGenerales = async () => {
    if (!regla) return;
    const p = leerUmbral(params.persona);
    const e = leerUmbral(params.empresa);
    const errs = {
      persona: !p.ok ? p.error : p.value == null ? "Obligatorio" : undefined,
      empresa: !e.ok ? e.error : e.value == null ? "Obligatorio" : undefined,
    };
    setErrGen(errs);
    if (errs.persona || errs.empresa || !p.ok || !e.ok) return;
    setGuardandoGen(true);
    try {
      await saveAlertRules([
        {
          code: REGLA_GLOBAL,
          isEnabled: regla.isEnabled,
          parameters: { ...regla.parameters, individual_min_wages: p.value, company_min_wages: e.value },
        },
      ]);
      await queryClient.invalidateQueries({ queryKey: ["alert_rules"] });
      toast.success("Parámetros generales de bloqueos guardados");
    } catch (err) {
      toast.error(`No se pudo guardar: ${(err as Error).message}`);
    } finally {
      setGuardandoGen(false);
    }
  };

  // -------------------------------------------------------------- por cliente
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filtros, setFiltros] = useState<TableServerFilters>({ global: "", enums: {}, dates: {} });
  const search = useDebouncedValue(filtros.global.trim(), 350);

  const lista = useQuery({
    queryKey: ["client_block_parameters", page, pageSize, search],
    queryFn: () => listClientBlockParameters({ page, pageSize, search: search || undefined }),
    placeholderData: keepPreviousData,
  });
  const filas = lista.data?.rows ?? [];
  const total = lista.data?.total ?? 0;

  const [dialogo, setDialogo] = useState<"nuevo" | "editar" | null>(null);
  const [draft, setDraft] = useState<Draft>(vacio);
  const [errDraft, setErrDraft] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [viendo, setViendo] = useState<ClientBlockParameter | null>(null);
  const [borrando, setBorrando] = useState<ClientBlockParameter | null>(null);

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ["client_block_parameters"] });

  const abrirNuevo = () => {
    setDraft(vacio);
    setErrDraft(null);
    setDialogo("nuevo");
  };
  const abrirEditar = (r: ClientBlockParameter) => {
    setDraft({
      id: r.id,
      legajo: r.legajo,
      correo: r.correo,
      persona: r.individualMinWages == null ? "" : String(r.individualMinWages),
      empresa: r.companyMinWages == null ? "" : String(r.companyMinWages),
    });
    setErrDraft(null);
    setDialogo("editar");
  };

  const guardarDraft = async () => {
    if (!draft.legajo) {
      setErrDraft("Seleccioná un cliente de la lista.");
      return;
    }
    const p = leerUmbral(draft.persona);
    const e = leerUmbral(draft.empresa);
    if (!p.ok || !e.ok) {
      setErrDraft(`Salarios mínimos: ${!p.ok ? p.error : !e.ok ? e.error : ""}`);
      return;
    }
    if (p.value == null && e.value == null) {
      setErrDraft("Completá al menos uno de los dos umbrales.");
      return;
    }
    setGuardando(true);
    setErrDraft(null);
    try {
      await saveClientBlockParameter({ id: draft.id, legajo: draft.legajo, individualMinWages: p.value, companyMinWages: e.value });
      await refrescar();
      toast.success(dialogo === "nuevo" ? "Parámetros del cliente agregados" : "Parámetros del cliente actualizados");
      setDialogo(null);
    } catch (err) {
      setErrDraft((err as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!borrando) return;
    try {
      await deleteClientBlockParameter(borrando.id);
      await refrescar();
      toast.success("Configuración individual eliminada: el cliente vuelve a usar los valores generales");
    } catch (err) {
      toast.error(`No se pudo eliminar: ${(err as Error).message}`);
    } finally {
      setBorrando(null);
    }
  };

  const exportar = async () => {
    try {
      const todas = await listAllClientBlockParameters(search || undefined);
      descargarCsv(
        `parametros-bloqueos-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Legajo", "Usuario (correo)", "Nombre", "Salarios mínimos por persona", "Salarios mínimos por empresa"],
        todas.map((r) => [r.legajo, r.correo, r.nombre, r.individualMinWages ?? "General", r.companyMinWages ?? "General"]),
      );
    } catch (err) {
      toast.error(`No se pudo exportar: ${(err as Error).message}`);
    }
  };

  const getActions = (r: ClientBlockParameter): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setViendo(r) },
    { label: "Editar", icon: Edit3, onClick: () => abrirEditar(r) },
    { label: "Eliminar", icon: Trash2, variant: "danger", onClick: () => setBorrando(r) },
  ];

  const columns: Column<ClientBlockParameter>[] = useMemo(
    () => [
      { key: "legajo", label: "Legajo", filterable: true, render: (r) => <LegajoCell legajo={r.legajo} /> },
      { key: "correo", label: "Usuario (correo)", filterable: true, render: (r) => r.correo },
      {
        key: "persona",
        label: "Cantidad de salarios mínimos depositados por persona",
        render: (r) => <span className={`font-mono tabular-nums ${r.individualMinWages == null ? "text-muted-foreground" : ""}`}>{fmtUmbral(r.individualMinWages)}</span>,
      },
      {
        key: "empresa",
        label: "Cantidad de salarios mínimos depositados por empresa",
        render: (r) => <span className={`font-mono tabular-nums ${r.companyMinWages == null ? "text-muted-foreground" : ""}`}>{fmtUmbral(r.companyMinWages)}</span>,
      },
    ],
    [],
  );

  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <PageHeader
        title="Parámetros de bloqueos"
        description="Umbrales que activan bloqueo automático de cuenta hasta revisión de compliance"
      />

      <div className="bg-moli-red-light border border-moli-red/20 rounded-lg p-4 mb-6 flex gap-3 max-w-2xl">
        <ShieldAlert size={18} className="text-moli-red shrink-0 mt-0.5" />
        <div className="text-sm text-moli-red-dark">
          <strong>Importante:</strong> Un <strong>bloqueo</strong> suspende la cuenta
          automáticamente al cumplirse el umbral. La cuenta queda bloqueada hasta que compliance la
          revise y la reactive manualmente.
        </div>
      </div>

      <SmvmCard />

      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">
          Parámetros generales de bloqueos
        </h3>
        {reglas.isLoading ? (
          <div className="flex items-center text-sm text-muted-foreground py-4">
            <Loader2 size={14} className="animate-spin mr-2" /> Cargando…
          </div>
        ) : reglas.isError || !regla ? (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle size={14} />
            {reglas.isError ? `No se pudo cargar: ${(reglas.error as Error).message}` : "Falta la regla de bloqueo en la base: aplicá la migración de configuración de alertas."}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {([
                ["persona", "Cantidad de salarios mínimos depositados por persona", "Si una persona física supera este acumulado de depósitos, la cuenta se bloquea automáticamente."],
                ["empresa", "Cantidad de salarios mínimos depositados por empresa", "Si una persona jurídica supera este acumulado de depósitos, la cuenta se bloquea automáticamente."],
              ] as const).map(([k, label, ayuda]) => (
                <div key={k}>
                  <label htmlFor={`gen-${k}`} className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
                  <input
                    id={`gen-${k}`}
                    type="number"
                    min={0}
                    step={1}
                    value={params[k]}
                    onChange={(e) => setParams((p) => ({ ...p, [k]: e.target.value }))}
                    aria-invalid={Boolean(errGen[k])}
                    className={`w-full h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 ${errGen[k] ? "border-red-400" : "border-input"}`}
                  />
                  {errGen[k] ? (
                    <p className="text-[11px] font-medium text-red-600 mt-1">{errGen[k]}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-1">{ayuda}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => void guardarGenerales()}
                disabled={guardandoGen || genSinCambios}
                className="inline-flex items-center gap-2 h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {guardandoGen ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {guardandoGen ? "Guardando…" : "Guardar configuración"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="bg-card border rounded-lg p-6 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Parámetros de usuarios</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Umbrales de depósitos configurados individualmente por usuario (reemplazan a los generales)
            </p>
          </div>
          <BtnPrimary onClick={abrirNuevo}>
            <Plus size={14} /> Agregar nuevos parámetros de usuario
          </BtnPrimary>
        </div>

        {lista.isError ? (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle size={14} /> No se pudieron cargar los parámetros: {(lista.error as Error).message}
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
              emptyMessage="No hay parámetros individuales cargados."
            />
            <Pagination
              page={page + 1}
              totalPages={totalPaginas}
              pageSize={pageSize}
              total={total}
              countLabel="usuario(s)"
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
      </div>

      {dialogo && (
        <FormDialog
          open
          onClose={() => setDialogo(null)}
          title={dialogo === "nuevo" ? "Agregar nuevos parámetros de usuario" : "Editar parámetros de usuario"}
          description={dialogo === "nuevo" ? "Configure umbrales de depósitos para un usuario" : `Editando parámetros de ${draft.correo}`}
          onSubmit={() => void guardarDraft()}
          submitLabel={guardando ? "Guardando…" : dialogo === "nuevo" ? "Agregar" : "Guardar cambios"}
        >
          {errDraft && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {errDraft}
            </div>
          )}
          <ClienteParamFields draft={draft} onChange={setDraft} editando={dialogo === "editar"} generales={generales} />
        </FormDialog>
      )}

      {viendo && (
        <FormDialog
          open
          onClose={() => setViendo(null)}
          title="Detalle de parámetros de usuario"
          description={`Parámetros de ${viendo.correo}`}
          onSubmit={() => setViendo(null)}
          submitLabel="Cerrar"
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Legajo:</span> <span className="font-mono tabular-nums font-medium">{viendo.legajo}</span></div>
            <div><span className="text-muted-foreground">Usuario:</span> <span className="font-medium">{viendo.correo}</span></div>
            <div><span className="text-muted-foreground">Nombre:</span> <span className="font-medium">{viendo.nombre}</span></div>
            <div><span className="text-muted-foreground">Actualizado:</span> <span className="font-medium">{new Date(viendo.updatedAt).toLocaleString("es-AR")}</span></div>
            <div><span className="text-muted-foreground">Salarios mínimos por persona:</span> <span className="font-mono tabular-nums font-medium">{viendo.individualMinWages ?? `General (${generales.persona ?? "—"})`}</span></div>
            <div><span className="text-muted-foreground">Salarios mínimos por empresa:</span> <span className="font-mono tabular-nums font-medium">{viendo.companyMinWages ?? `General (${generales.empresa ?? "—"})`}</span></div>
          </div>
        </FormDialog>
      )}

      <ConfirmDialog
        open={borrando !== null}
        onClose={() => setBorrando(null)}
        onConfirm={eliminar}
        title="Eliminar parámetros individuales"
        message={`El cliente ${borrando?.legajo ?? ""} volverá a usar los umbrales generales. ¿Continuar?`}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </>
  );
}
