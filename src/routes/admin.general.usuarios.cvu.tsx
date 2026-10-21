import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Eye, Edit3, XCircle, AlertTriangle, Inbox, Search, Zap, Wallet, ShieldCheck, Coins } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column, type TableServerFilters } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BtnPrimary, Badge, Input, Label } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";
import { LegajoCell, LEGAJO_TOOLTIP } from "@/components/legajo-label";
import { Pagination } from "@/components/pagination";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { listAllCvus, updateSubcuenta } from "@/lib/api/subcuentas";
import { asignarCvuParaNuevo, asignarCvuParaExistente } from "@/lib/api/cvu";
import { getClienteByCorreo, formatCuit } from "@/lib/api/clientes";
import { useClientesForSelect } from "@/hooks/useComercios";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toast } from "sonner";
import type { CvuRow, SubcuentaTipo } from "@/lib/api/subcuentas";

export const Route = createFileRoute("/admin/general/usuarios/cvu")({
  head: () => ({
    meta: [
      { title: "Usuarios con CVU — Usuarios — Admin Molly" },
      { name: "description", content: "Usuarios con CVU (Cuenta Virtual) habilitada." },
    ],
  }),
  component: CvuPage,
});

const PAGE_SIZES = [10, 20, 50];

function estadoBadge(e: string) {
  const map: Record<string, { label: string; tone: "success" | "danger" | "warn" | "neutral" }> = {
    Activa: { label: "Habilitado", tone: "success" },
    Pausada: { label: "Deshabilitado", tone: "danger" },
    Habilitado: { label: "Habilitado", tone: "success" },
    Deshabilitado: { label: "Deshabilitado", tone: "danger" },
    Suspendido: { label: "Suspendido", tone: "warn" },
  };
  const m = map[e] ?? { label: e, tone: "neutral" as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

/**
 * Mapea el `subcuentas.tipo` (4 valores oficiales: Operativa | Recaudacion | Garantias | Sueldos)
 * a un badge con color e ícono. Etiqueta y "kind" se usan también en el dropdown del modal.
 */
const TIPO_SUBCUENTA_META: Record<SubcuentaTipo, { label: string; icon: typeof Wallet }> = {
  Operativa: { label: "Operativa", icon: Wallet },
  Recaudacion: { label: "Recaudación", icon: Coins },
  Garantias: { label: "Garantías", icon: ShieldCheck },
  Sueldos: { label: "Sueldos", icon: Wallet },
};

function tipoSubcuentaBadge(tipo: SubcuentaTipo) {
  const meta = TIPO_SUBCUENTA_META[tipo] ?? { label: tipo, icon: Wallet };
  const Icon = meta.icon;
  const tone =
    tipo === "Operativa" ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : tipo === "Recaudacion" ? "bg-blue-100 text-blue-800 border-blue-200"
        : tipo === "Garantias" ? "bg-amber-100 text-amber-800 border-amber-200"
          : "bg-purple-100 text-purple-800 border-purple-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${tone}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

function CvuPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [estadoFilter, setEstadoFilter] = useState<string>("");

  // Buscar y fecha de la card: server-side contra toda la base.
  const [filtrosPanel, setFiltrosPanel] = useState<TableServerFilters>({
    global: "",
    enums: {},
    dates: {},
  });
  const search = useDebouncedValue(filtrosPanel.global.trim(), 350);
  const rangoFecha = Object.values(filtrosPanel.dates)[0];
  const aplicarFiltros = (f: TableServerFilters) => {
    setPage(0);
    setFiltrosPanel(f);
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["cvus", page, pageSize, estadoFilter, search, rangoFecha?.from, rangoFecha?.to],
    queryFn: () =>
      listAllCvus({
        page,
        pageSize,
        estado: (estadoFilter as never) || undefined,
        search: search || undefined,
        fechaDesde: rangoFecha?.from || undefined,
        fechaHasta: rangoFecha?.to || undefined,
      }),
  });

  const rows = (data?.rows ?? []) as CvuRow[];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [showNuevo, setShowNuevo] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formAlias, setFormAlias] = useState("");
  const [formTipo, setFormTipo] = useState<SubcuentaTipo>("Operativa");
  const [formSearch, setFormSearch] = useState("");
  const debouncedFormSearch = useDebouncedValue(formSearch, 350);
  const { data: clientesOpt } = useClientesForSelect(debouncedFormSearch || undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [viewing, setViewing] = useState<CvuRow | null>(null);
  const [editTarget, setEditTarget] = useState<CvuRow | null>(null);
  const [editAlias, setEditAlias] = useState("");

  const { can } = useCan();
  const puedeCrear = can("crear", "usuarios");
  const puedeModificar = can("modificar", "usuarios");

  const crear = async () => {
    const email = formEmail.trim() || formSearch.trim();
    if (!email) {
      toast.error("Seleccioná un usuario por email");
      return;
    }
    setSaving(true);
    try {
      const cliente = await getClienteByCorreo(email.toLowerCase());
      if (!cliente) {
        toast.error("No existe un cliente con ese email");
        setSaving(false);
        return;
      }
      // Llamada centralizada: mismo flujo BDC + audit + fallback que el
      // boton "Generar CVU" del menu. Asi NO se inventan CVUs locales
      // para el CVU inicial del titular (que es el camino mas importante
      // regulatoriamente).
      const result = await asignarCvuParaNuevo({
        cliente: {
          id: cliente.id,
          legajo: cliente.legajo,
          correo: cliente.correo,
          cuit: cliente.cuit,
          nombre: cliente.nombre,
          tipoPersona: cliente.tipoPersona,
        },
        alias: formAlias.trim() || undefined,
        tipo: formTipo,
        origin: "admin",
      });

      // Si BDC rechazo explicitamente (alias_taken o cuit_invalid), el helper
      // ya mostro el toast y NO creo la subcuenta. Salimos sin cerrar el modal
      // para que el operador pueda corregir el alias.
      if (result.kind === "rechazado") {
        setSaving(false);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["cvus"] });
      queryClient.invalidateQueries({ queryKey: ["subcuentas", cliente.legajo] });
      setShowNuevo(false);
      setFormEmail("");
      setFormAlias("");
      setFormSearch("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const guardarEdicion = async () => {
    if (!editTarget) return;
    try {
      await updateSubcuenta(editTarget.clienteLegajo, editTarget.id, { cbu: editTarget.cbu ?? undefined });
      // alias not stored in subcuenta, but we keep edit for demo (no column)
      toast.success("Actualizado");
      queryClient.invalidateQueries({ queryKey: ["cvus"] });
      queryClient.invalidateQueries({ queryKey: ["subcuentas", editTarget.clienteLegajo] });
      setEditTarget(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const getActions = (row: CvuRow): ActionItem[] => {
  const items: ActionItem[] = [
    { label: "Ver detalles", icon: Eye, onClick: () => setViewing(row) },
  ];

  // Acción contextual: si la subcuenta no tiene CVU todavia, el operador
  // puede pedir la asignacion contra BDC/COELSA. Toda la logica vive en
  // `asignarCvuParaExistente` (centralizada en `lib/api/cvu.ts`) para que
  // modal y menu compartan exactamente el mismo flow.
  if (!row.cbu) {
    items.push({
      label: "Generar CVU (BDC/COELSA)",
      icon: Zap,
      disabled: !puedeModificar,
      onClick: async () => {
        const cuit = (row.cliente?.cuit ?? "").replace(/\D/g, "");
        if (!row.legajo || !cuit) {
          toast.error("No se pudo identificar el titular (legajo o CUIT faltante).");
          return;
        }
        const result = await asignarCvuParaExistente({
          cliente: {
            id: row.id,
            legajo: row.legajo,
            correo: row.cliente?.correo ?? row.email ?? "",
            cuit,
            nombre: `${row.nombre} ${row.apellido}`.trim() || row.nombre,
            tipoPersona:
              row.cliente?.tipoPersona === "juridica" ? "juridica" : "fisica",
          },
          subcuentaId: row.id,
          tipo: row.tipo,
          origin: "admin",
        });
        if (result.kind === "rechazado") {
          return;
        }
        queryClient.invalidateQueries({ queryKey: ["cvus"] });
        queryClient.invalidateQueries({ queryKey: ["subcuentas", row.clienteLegajo] });
      },
    });
  }

  items.push({
    label: "Editar",
    icon: Edit3,
    disabled: !puedeModificar,
    onClick: () => {
      setEditTarget(row);
      setEditAlias(row.cbu?.slice(-6) ?? "");
    },
  });

  items.push({
    label: row.estado === "Activa" ? "Deshabilitar" : "Habilitar",
    icon: XCircle,
    variant: row.estado === "Activa" ? ("danger" as const) : undefined,
    disabled: !puedeModificar,
    onClick: async () => {
      try {
        await updateSubcuenta(row.clienteLegajo, row.id, {
          estado: row.estado === "Activa" ? "Pausada" : "Activa",
        });
        queryClient.invalidateQueries({ queryKey: ["cvus"] });
        queryClient.invalidateQueries({ queryKey: ["subcuentas", row.clienteLegajo] });
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  return items;
};

  const err = error instanceof DataAccessError ? error : null;

  return (
    <PermissionGuard recurso="usuarios">
      <PageHeader
        title="Usuarios con CVU"
        description="Cuentas Virtuales creadas — búsqueda rápida por email, refleja en detalle Subcuentas y CVUs recientes."
        action={
          <BtnPrimary onClick={() => setShowNuevo(true)} disabled={!puedeCrear}>
            <Plus size={16} /> Nuevo CVU
          </BtnPrimary>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border bg-card py-16 text-sm text-muted-foreground"><span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />Cargando CVU…</div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700"><AlertTriangle size={28} /><p>{err?.message ?? "Error"}</p><button onClick={() => refetch()} className="h-9 px-4 rounded-md bg-primary text-primary-foreground">Reintentar</button></div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground"><Inbox size={28} /><p>No hay CVU que coincidan.</p></div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows.map((r) => ({
              ...r,
              _legajo: r.legajo,
              _cuit: r.cliente?.cuit ?? "",
              _correo: r.cliente?.correo ?? r.email,
              _nombre: r.nombre,
              _apellido: r.apellido,
              _tipo: r.tipo,
              _cvu: r.cbu ?? null,
              _cbk: r.cbu ? `CBK-${r.cbu.slice(-12)}` : "—",
              _alias: r.cbu ? r.cbu.slice(-6) : "—",
              _estado: r.estado,
              _fechaAlta: r.createdAt ? new Date(r.createdAt).toLocaleDateString("es-AR") : "—",
              _fechaAltaRaw: r.createdAt,
            }))}
            keyExtractor={(r: any) => r.id}
            actions={(r: any) => <ActionsDropdown actions={getActions(r as CvuRow)} />}
            hidePagination
            serverFilterState={filtrosPanel}
            onServerFilterChange={aplicarFiltros}
            serverResultCount={total}
            extraFilters={
              <div>
                <label className="text-xs font-medium text-muted-foreground">Estado</label>
                <select value={estadoFilter} onChange={(e) => { setEstadoFilter(e.target.value); setPage(0); }} className="w-full sm:min-w-[130px] h-8 px-2 rounded-md border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-ring/40">
                  <option value="">Todos</option>
                  <option value="Activa">Habilitado</option>
                  <option value="Pausada">Deshabilitado</option>
                </select>
              </div>
            }
          />
          <Pagination
            page={page + 1}
            totalPages={totalPages}
            pageSize={pageSize}
            total={total}
            countLabel="CVU"
            pageSizes={PAGE_SIZES}
            disabled={isFetching}
            onPageChange={(p) => setPage(p - 1)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(0);
            }}
          />
        </>
      )}

      {viewing && (
        <FormDialog open={!!viewing} onClose={() => setViewing(null)} title="Detalle de CVU" description={`CVU de ${viewing.nombre} ${viewing.apellido}`} onSubmit={() => setViewing(null)} submitLabel="Cerrar">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Legajo:</span> <LegajoCell legajo={viewing.legajo} /></div>
            <div><span className="text-muted-foreground">Correo:</span> <span className="font-medium">{viewing.cliente?.correo ?? viewing.email}</span></div>
            <div><span className="text-muted-foreground">Nombre:</span> <span className="font-medium">{viewing.nombre}</span></div>
            <div><span className="text-muted-foreground">Apellido:</span> <span className="font-medium">{viewing.apellido}</span></div>
            <div><span className="text-muted-foreground">CVU:</span> <span className="font-mono font-medium">{viewing.cbu ?? "—"}</span></div>
            <div><span className="text-muted-foreground">Alias:</span> <span className="font-medium">{viewing.cbu ? viewing.cbu.slice(-6) : "—"}</span></div>
          </div>
        </FormDialog>
      )}

      {editTarget && (
        <FormDialog open={!!editTarget} onClose={() => setEditTarget(null)} title="Editar CVU" description={`Editando CVU de ${editTarget.nombre}`} onSubmit={guardarEdicion} submitLabel="Guardar">
          <div><Label>Alias (derivado del CVU)</Label><Input value={editAlias} onChange={(e) => setEditAlias(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">El CVU es inmutable; alias es informativo.</p>
        </FormDialog>
      )}

      <FormDialog open={showNuevo} onClose={() => setShowNuevo(false)} title="Nuevo CVU" description="Crear CVU asociado a un usuario existente (búsqueda rápida por email, funciona con miles)." onSubmit={crear} submitLabel={saving ? "Creando..." : "Crear CVU"}>
        <div className="relative">
          <Label>Email del usuario</Label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={formSearch}
              onChange={(e) => { setFormSearch(e.target.value); setFormOpen(true); setFormEmail(e.target.value); }}
              onFocus={() => setFormOpen(true)}
              onBlur={() => setTimeout(() => setFormOpen(false), 150)}
              placeholder="Buscar por email, legajo o nombre..."
              className="pl-9"
              autoComplete="off"
            />
          </div>
          {formOpen && (clientesOpt?.length ?? 0) > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-md border bg-card shadow-lg max-h-60 overflow-auto">
              {(clientesOpt ?? []).map((c) => (
                <button key={c.legajo} type="button" onMouseDown={(e) => { e.preventDefault(); setFormEmail(c.correo); setFormSearch(c.correo); setFormOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex flex-col">
                  <span className="font-medium">{c.correo}</span>
                  <span className="text-xs text-muted-foreground font-mono">{c.legajo} · {c.nombre}</span>
                </button>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-1">Seleccioná un email de la lista (20 resultados, server-side). Funciona para PF y PJ.</p>
        </div>
        <div><Label>Alias (opcional)</Label><Input value={formAlias} onChange={(e) => setFormAlias(e.target.value)} placeholder="mi.alias (se genera automático si vacío)" /></div>
        <div>
          <Label>Tipo de cuenta</Label>
          <select
            className="w-full h-10 px-3 rounded-md border bg-card text-sm"
            value={formTipo}
            onChange={(e) => setFormTipo(e.target.value as SubcuentaTipo)}
          >
            {(Object.keys(TIPO_SUBCUENTA_META) as SubcuentaTipo[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_SUBCUENTA_META[t].label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Operativa: saldo líquido para retiros y transferencias.
            Recaudación: cobros / ventas.
            Garantías: contracargos y retenciones.
            Sueldos: nómina y pagos a empleados.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Se generará un CVU de 22 dígitos y alias, y se guardará como subcuenta. Aparecerá en el detalle del usuario en Subcuentas y CVUs recientes.</p>
      </FormDialog>
    </PermissionGuard>
  );
}

const columns: Column<any>[] = [
  {
    key: "_legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    render: (r) => (
      <div className="flex flex-col">
        <LegajoCell legajo={r._legajo} />
        <span className="text-[11px] text-muted-foreground font-mono">{formatCuit(r._cuit)}</span>
      </div>
    ),
  },
  { key: "_correo", label: "Usuario", filterable: true, render: (r) => r._correo },
  { key: "_nombre", label: "Nombre", filterable: true, render: (r) => r._nombre },
  { key: "_apellido", label: "Apellido", filterable: true, render: (r) => r._apellido },
  {
    key: "_tipo",
    label: "Tipo",
    minWidth: 140,
    filterable: true,
    render: (r) => tipoSubcuentaBadge(r._tipo),
  },
  {
    key: "_cvu",
    label: "CVU",
    filterable: true,
    render: (r) =>
      r._cvu && r._cvu !== "—" ? (
        <span className="font-mono tabular-nums">{r._cvu}</span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-[11px] font-medium">
          Pendiente de asignación
        </span>
      ),
  },
  { key: "_cbk", label: "CBK", render: (r) => <span className="font-mono tabular-nums">{r._cbk}</span> },
  { key: "_alias", label: "Alias", render: (r) => r._alias },
  { key: "_estado", label: "Estado", render: (row) => estadoBadge(row._estado) },
  { key: "_fechaAlta", label: "Fecha de alta", render: (r) => <span className="font-mono tabular-nums text-xs">{r._fechaAlta}</span> },
];
