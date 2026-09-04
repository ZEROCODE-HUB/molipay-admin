import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Ban, XCircle, Trash2, AlertTriangle, Inbox, Link2, Copy } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Badge, Card } from "@/components/portal-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { DataAccessError } from "@/lib/api/errors";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listEnlaces, updateEnlaceEstado, deleteEnlace, ESTADOS_ENLACE } from "@/lib/api/enlaces-pago";
import type { EnlacePago } from "@/lib/api/enlaces-pago";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/comercios/link-pago/")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Enlaces de pago — Admin — Moli" },
      { name: "description", content: "Enlaces de pago creados desde Enterprise." },
    ],
  }),
});

const PAGE_SIZE = 25;

function tone(e: string): "success" | "neutral" | "warn" | "danger" {
  if (e === "Activado") return "success";
  if (e === "Rechazado" || e === "Eliminado") return "danger";
  if (e === "Suspendido") return "danger";
  if (e === "Desactivado") return "neutral";
  return "warn";
}

function EnlaceDetalle({ enlace, onClose }: { enlace: EnlacePago; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div>
            <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Link2 size={18}/> Enlace de pago</h3>
            <p className="text-sm text-muted-foreground break-all">{enlace.url ?? "—"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md"><XCircle size={18}/></button>
        </div>
        <div className="p-6 space-y-4">
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Enlace</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2"><span className="text-muted-foreground">URL</span><div className="font-mono text-xs break-all flex items-center gap-2">{enlace.url ?? "—"} {enlace.url && <button onClick={()=>{ navigator.clipboard.writeText(enlace.url!); toast.success("Copiado"); }} className="h-6 px-2 rounded border text-xs"><Copy size={12}/></button>}</div></div>
              <div><span className="text-muted-foreground">Comercio</span><div className="font-semibold">{enlace.comercioNombre}</div></div>
              <div><span className="text-muted-foreground">Usuario</span><div className="font-semibold">{enlace.usuario ?? enlace.clienteLegajo}</div></div>
              <div><span className="text-muted-foreground">Cajero</span><div className="font-semibold">{enlace.cajero ?? "—"}</div></div>
              <div><span className="text-muted-foreground">Estado</span><div><Badge tone={tone(enlace.estado)}>{enlace.estado}</Badge></div></div>
              <div><span className="text-muted-foreground">Monto</span><div className="font-mono font-semibold">{enlace.monto != null ? `$ ${Number(enlace.monto).toLocaleString("es-AR")}` : "—"}</div></div>
              <div><span className="text-muted-foreground">Referencia</span><div className="font-mono text-xs">{enlace.referencia ?? "—"}</div></div>
              <div><span className="text-muted-foreground">Expira</span><div className="font-mono text-xs">{enlace.expiraEn ? new Date(enlace.expiraEn).toLocaleDateString("es-AR") : "—"}</div></div>
              <div><span className="text-muted-foreground">Pagos parciales</span><div>{enlace.pagosParciales ? "Sí" : "No"}</div></div>
              <div><span className="text-muted-foreground">Métodos</span><div className="text-xs">{enlace.metodosPago?.join(", ") ?? "—"}</div></div>
              <div className="col-span-2"><span className="text-muted-foreground">Notas</span><div className="text-xs">{enlace.notas ?? "—"}</div></div>
              <div><span className="text-muted-foreground">Vistas</span><div className="font-mono">{enlace.vistas}</div></div>
              <div><span className="text-muted-foreground">Pagos</span><div className="font-mono">{enlace.pagos}</div></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<string>("");
  const { can } = useCan();
  const puedeModificar = can("modificar","comercios");
  const puedeBorrar = can("borrar","comercios");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["enlaces-pago", page, search, estado],
    queryFn: () => listEnlaces({ page, pageSize: PAGE_SIZE, search: search || undefined, estado: estado || undefined }),
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const [detail, setDetail] = useState<EnlacePago | null>(null);
  const [confirm, setConfirm] = useState<{ title:string; message:string; confirmLabel:string; variant:"default"|"danger"; onConfirm:()=>void }|null>(null);

  const cambiar = async (row: EnlacePago, nuevo: string) => {
    try {
      await updateEnlaceEstado(row.id, nuevo);
      qc.invalidateQueries({ queryKey: ["enlaces-pago"] });
    } catch (e) {
      setConfirm({ title:"No se pudo actualizar", message:(e as Error).message, confirmLabel:"Cerrar", variant:"danger", onConfirm:()=>setConfirm(null) });
    }
  };
  const eliminar = async (row: EnlacePago) => {
    try {
      await deleteEnlace(row.id);
      qc.invalidateQueries({ queryKey: ["enlaces-pago"] });
    } catch (e) {
      setConfirm({ title:"No se pudo eliminar", message:(e as Error).message, confirmLabel:"Cerrar", variant:"danger", onConfirm:()=>setConfirm(null) });
    }
  };

  const getActions = (r: EnlacePago): ActionItem[] => {
    const items: ActionItem[] = [{ label:"Ver detalles", icon:Eye, onClick:()=>setDetail(r) }];
    if (r.estado !== "Desactivado") items.push({ label:"Desactivar", icon:Ban, disabled:!puedeModificar, variant:"danger" as const, onClick:()=>setConfirm({ title:"Desactivar enlace", message:`¿Desactivar ${r.url ?? r.id}?`, confirmLabel:"Desactivar", variant:"danger", onConfirm:()=>{ setConfirm(null); void cambiar(r,"Desactivado"); } }) });
    if (r.estado !== "Rechazado") items.push({ label:"Rechazar", icon:XCircle, disabled:!puedeModificar, variant:"danger" as const, onClick:()=>setConfirm({ title:"Rechazar enlace", message:`¿Rechazar ${r.url ?? r.id}?`, confirmLabel:"Rechazar", variant:"danger", onConfirm:()=>{ setConfirm(null); void cambiar(r,"Rechazado"); } }) });
    if (r.estado !== "Suspendido") items.push({ label:"Suspender", icon:Ban, disabled:!puedeModificar, variant:"danger" as const, onClick:()=>setConfirm({ title:"Suspender enlace", message:`¿Suspender ${r.url ?? r.id}?`, confirmLabel:"Suspender", variant:"danger", onConfirm:()=>{ setConfirm(null); void cambiar(r,"Suspendido"); } }) });
    items.push({ label:"Eliminar", icon:Trash2, disabled:!puedeBorrar, variant:"danger" as const, onClick:()=>setConfirm({ title:"Eliminar enlace", message:`¿Eliminar ${r.url ?? r.id}?`, confirmLabel:"Eliminar", variant:"danger", onConfirm:()=>{ setConfirm(null); void eliminar(r); } }) });
    return items;
  };

  const columns: import("@/components/data-table").Column<EnlacePago>[] = [
    { key:"url", label:"Enlace de pago", filterable:true, render:(r)=> <span className="font-mono text-xs break-all flex items-center gap-1"><Link2 size={12}/>{r.url ?? "—"}</span> },
    { key:"comercioNombre", label:"Comercio", filterable:true, render:(r)=> r.comercioNombre },
    { key:"usuario", label:"Usuario", render:(r)=> r.usuario ?? r.clienteLegajo },
    { key:"cajero", label:"Cajero", render:(r)=> r.cajero ?? "—" },
    { key:"monto", label:"Monto", render:(r)=> <span className="font-mono tabular-nums text-xs">{r.monto != null ? `$ ${Number(r.monto).toLocaleString("es-AR")}` : "—"}</span> },
    { key:"estado", label:"Estado", filterable:"enum", filterOptions:[...ESTADOS_ENLACE], render:(r)=><Badge tone={tone(r.estado)}>{r.estado}</Badge> },
    { key:"createdAt", label:"Fecha", render:(r)=><span className="font-mono text-xs">{new Date(r.createdAt).toLocaleDateString("es-AR")}</span> },
  ];

  const err = error instanceof DataAccessError ? error : null;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader title="Enlaces de pago" description="Enlaces creados desde Enterprise. Payway activa; Admin gestiona estados." />
      <div className="flex flex-wrap gap-3 mb-4">
        <input className="h-10 px-3 rounded-md border bg-card text-sm flex-1 min-w-[200px]" placeholder="Buscar enlace, comercio, usuario, cajero..." value={search} onChange={(e)=>{ setSearch(e.target.value); setPage(0); }} />
        <select className="h-10 px-3 rounded-md border bg-card text-sm" value={estado} onChange={(e)=>{ setEstado(e.target.value); setPage(0); }}>
          <option value="">Todos los estados</option>
          {ESTADOS_ENLACE.map((e)=><option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      {isLoading ? <div className="flex items-center justify-center rounded-xl border bg-card py-16 text-sm text-muted-foreground"><span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2"/>Cargando enlaces…</div>
      : isError ? <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700"><AlertTriangle size={28}/><p>{err?.message ?? "Error"}</p><button onClick={()=>refetch()} className="h-9 px-4 rounded-md bg-primary text-primary-foreground">Reintentar</button></div>
      : rows.length===0 ? <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-sm text-muted-foreground"><Inbox size={28}/><p>No hay enlaces de pago.</p><p className="text-xs">Crea un enlace en Enterprise → aparecerá aquí como Pendiente de aprobación.</p></div>
      : <>
          <DataTable columns={columns} data={rows} keyExtractor={(r)=>r.id} actions={(r)=> <ActionsDropdown actions={getActions(r)} />} />
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground"><span>{total} enlace(s) · página {page+1} de {totalPages}</span><div className="flex gap-2"><button disabled={page===0||isFetching} onClick={()=>setPage((p)=>Math.max(0,p-1))} className="h-9 px-3 rounded-md border bg-card disabled:opacity-50">Anterior</button><button disabled={page+1>=totalPages||isFetching} onClick={()=>setPage((p)=>p+1)} className="h-9 px-3 rounded-md border bg-card disabled:opacity-50">Siguiente</button></div></div>
        </>}
      {detail && <EnlaceDetalle enlace={detail} onClose={()=>setDetail(null)} />}
      {confirm && <ConfirmDialog open={!!confirm} onClose={()=>setConfirm(null)} title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} variant={confirm.variant} onConfirm={confirm.onConfirm} />}
    </PermissionGuard>
  );
}
