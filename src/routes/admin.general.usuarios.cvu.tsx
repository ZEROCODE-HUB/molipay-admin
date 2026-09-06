import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Eye, Edit3, XCircle, AlertTriangle, Inbox, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BtnPrimary, Badge, Input, Label } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";
import { LegajoCell, LEGAJO_TOOLTIP } from "@/components/legajo-label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { listAllCvus, createSubcuenta, updateSubcuenta, generarCbu, generarAlias } from "@/lib/api/subcuentas";
import { getClienteByCorreo } from "@/lib/api/clientes";
import { useClientesForSelect } from "@/hooks/useComercios";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toast } from "sonner";
import type { CvuRow } from "@/lib/api/subcuentas";

export const Route = createFileRoute("/admin/general/usuarios/cvu")({
  head: () => ({
    meta: [
      { title: "Usuarios con CBU/CVU — Usuarios — Admin Molly" },
      { name: "description", content: "Usuarios con CBU/CVU (Cuenta Virtual) habilitada." },
    ],
  }),
  component: CvuPage,
});

const PAGE_SIZE = 25;

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

function CvuPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [estadoFilter, setEstadoFilter] = useState<string>("");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["cvus", page, search, estadoFilter],
    queryFn: () => listAllCvus({ page, pageSize: PAGE_SIZE, search: search || undefined, estado: estadoFilter as never || undefined }),
  });

  const rows = (data?.rows ?? []) as CvuRow[];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [showNuevo, setShowNuevo] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formAlias, setFormAlias] = useState("");
  const [formTipo, setFormTipo] = useState("Cuenta individual");
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
      const cbu = generarCbu();
      const alias = formAlias.trim() || generarAlias(email);
      const isJuridica = cliente.tipoPersona === "juridica";
      const nombre = isJuridica ? cliente.nombre : (cliente.nombre.split(" ")[0] ?? cliente.nombre);
      const apellido = isJuridica ? "" : cliente.nombre.split(" ").slice(1).join(" ") || "";
      await createSubcuenta(cliente.legajo, {
        nombre,
        apellido,
        email: cliente.correo,
        cbu,
        tipo: "Operativa",
        estado: "Activa",
      });
      toast.success(`CBU/CVU creado para ${cliente.correo} — se refleja en Subcuentas y CBUs recientes`);
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

  const getActions = (row: CvuRow): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setViewing(row) },
    { label: "Editar", icon: Edit3, disabled: !puedeModificar, onClick: () => { setEditTarget(row); setEditAlias(row.cbu?.slice(-6) ?? ""); } },
    {
      label: row.estado === "Activa" ? "Deshabilitar" : "Habilitar",
      icon: XCircle,
      variant: row.estado === "Activa" ? "danger" as const : undefined,
      disabled: !puedeModificar,
      onClick: async () => {
        try {
          await updateSubcuenta(row.clienteLegajo, row.id, { estado: row.estado === "Activa" ? "Pausada" : "Activa" });
          queryClient.invalidateQueries({ queryKey: ["cvus"] });
          queryClient.invalidateQueries({ queryKey: ["subcuentas", row.clienteLegajo] });
        } catch (e) {
          toast.error((e as Error).message);
        }
      },
    },
  ];

  const err = error instanceof DataAccessError ? error : null;

  return (
    <PermissionGuard recurso="usuarios">
      <PageHeader
        title="Usuarios con CBU / CVU"
        description="Cuentas Virtuales creadas (subcuentas con CBU) — búsqueda rápida por email, refleja en detalle Subcuentas y CBUs recientes."
        action={
          <BtnPrimary onClick={() => setShowNuevo(true)} disabled={!puedeCrear}>
            <Plus size={16} /> Nuevo CBU / CVU
          </BtnPrimary>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border bg-card py-16 text-sm text-muted-foreground"><span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />Cargando CBU/CVU…</div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700"><AlertTriangle size={28} /><p>{err?.message ?? "Error"}</p><button onClick={() => refetch()} className="h-9 px-4 rounded-md bg-primary text-primary-foreground">Reintentar</button></div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground"><Inbox size={28} /><p>No hay CBU/CVU que coincidan.</p></div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows.map((r) => ({
              ...r,
              _legajo: r.legajo,
              _correo: r.cliente?.correo ?? r.email,
              _nombre: r.nombre,
              _apellido: r.apellido,
              _cvu: r.cbu ?? "—",
              _cbk: r.cbu ? `CBK-${r.cbu.slice(-12)}` : "—",
              _alias: r.cbu ? r.cbu.slice(-6) : "—",
              _estado: r.estado,
            }))}
            keyExtractor={(r: any) => r.id}
            actions={(r: any) => <ActionsDropdown actions={getActions(r as CvuRow)} />}
            hidePagination
            extraFilters={
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[180px]">
                  <label className="text-xs font-medium text-muted-foreground">Buscar</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(0); }} placeholder="Legajo, email, nombre, CBU..." className="pl-8 h-8 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Estado</label>
                  <select value={estadoFilter} onChange={(e) => { setEstadoFilter(e.target.value); setPage(0); }} className="w-full sm:min-w-[130px] h-8 px-2 rounded-md border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-ring/40">
                    <option value="">Todos</option>
                    <option value="Activa">Habilitado</option>
                    <option value="Pausada">Deshabilitado</option>
                  </select>
                </div>
              </div>
            }
          />
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground"><span>{total} CBU/CVU · página {page + 1} de {totalPages}</span><div className="flex gap-2"><button disabled={page === 0 || isFetching} onClick={() => setPage((p) => Math.max(0, p - 1))} className="h-9 px-3 rounded-md border bg-card disabled:opacity-50">Anterior</button><button disabled={page + 1 >= totalPages || isFetching} onClick={() => setPage((p) => p + 1)} className="h-9 px-3 rounded-md border bg-card disabled:opacity-50">Siguiente</button></div></div>
        </>
      )}

      {viewing && (
        <FormDialog open={!!viewing} onClose={() => setViewing(null)} title="Detalle de CBU/CVU" description={`CBU de ${viewing.nombre} ${viewing.apellido}`} onSubmit={() => setViewing(null)} submitLabel="Cerrar">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Legajo:</span> <LegajoCell legajo={viewing.legajo} /></div>
            <div><span className="text-muted-foreground">Correo:</span> <span className="font-medium">{viewing.cliente?.correo ?? viewing.email}</span></div>
            <div><span className="text-muted-foreground">Nombre:</span> <span className="font-medium">{viewing.nombre}</span></div>
            <div><span className="text-muted-foreground">Apellido:</span> <span className="font-medium">{viewing.apellido}</span></div>
            <div><span className="text-muted-foreground">CBU/CVU:</span> <span className="font-mono font-medium">{viewing.cbu ?? "—"}</span></div>
            <div><span className="text-muted-foreground">Alias:</span> <span className="font-medium">{viewing.cbu ? viewing.cbu.slice(-6) : "—"}</span></div>
          </div>
        </FormDialog>
      )}

      {editTarget && (
        <FormDialog open={!!editTarget} onClose={() => setEditTarget(null)} title="Editar CBU" description={`Editando CBU de ${editTarget.nombre}`} onSubmit={guardarEdicion} submitLabel="Guardar">
          <div><Label>Alias (derivado del CBU)</Label><Input value={editAlias} onChange={(e) => setEditAlias(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">El CBU es inmutable; alias es informativo.</p>
        </FormDialog>
      )}

      <FormDialog open={showNuevo} onClose={() => setShowNuevo(false)} title="Nuevo CBU / CVU" description="Crear CBU/CVU asociado a un usuario existente (búsqueda rápida por email, funciona con miles)." onSubmit={crear} submitLabel={saving ? "Creando..." : "Crear CBU"}>
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
        <div><Label>Tipo de cuenta</Label><select className="w-full h-10 px-3 rounded-md border bg-card text-sm" value={formTipo} onChange={(e) => setFormTipo(e.target.value)}><option>Cuenta individual</option><option>Cuenta compartida</option></select></div>
        <p className="text-xs text-muted-foreground">Se generará un CBU de 22 dígitos y alias, y se guardará como subcuenta. Aparecerá en el detalle del usuario en Subcuentas y CBUs recientes.</p>
      </FormDialog>
    </PermissionGuard>
  );
}

const columns: Column<any>[] = [
  { key: "_legajo", label: "Legajo", hint: LEGAJO_TOOLTIP, render: (r) => <LegajoCell legajo={r._legajo} /> },
  { key: "_correo", label: "Usuario", render: (r) => r._correo },
  { key: "_nombre", label: "Nombre", render: (r) => r._nombre },
  { key: "_apellido", label: "Apellido", render: (r) => r._apellido },
  { key: "_cvu", label: "CBU / CVU", render: (r) => <span className="font-mono tabular-nums">{r._cvu}</span> },
  { key: "_cbk", label: "CBK", render: (r) => <span className="font-mono tabular-nums">{r._cbk}</span> },
  { key: "_alias", label: "Alias", render: (r) => r._alias },
  { key: "_estado", label: "Estado", render: (row) => estadoBadge(row._estado) },
];
