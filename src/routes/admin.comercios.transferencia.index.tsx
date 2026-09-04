import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Eye, Edit3, XCircle, Ban, Trash2, AlertTriangle, Inbox, QrCode, Download, Printer } from "lucide-react";
import QRCode from "qrcode";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Badge, Card } from "@/components/portal-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { DataAccessError } from "@/lib/api/errors";
import { Badge as BadgeComp } from "@/components/portal-shell";
import { LegajoCell } from "@/components/legajo-label";
import { useQuery } from "@tanstack/react-query";
import { listQrPos, updateQrEstado, deleteQrPos } from "@/lib/api/qr-pos";
import type { PuntoVenta, EstadoQr } from "@/lib/api/types";

export const Route = createFileRoute("/admin/comercios/transferencia/")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Pagos con QR — Admin Molly" },
      { name: "description", content: "QRs/POS creados por comercios desde Enterprise." },
    ],
  }),
});

const PAGE_SIZE = 25;
const ESTADOS_QR: EstadoQr[] = ["Pendiente de aprobación","Activado","Desactivado","Rechazado","Suspendido","Eliminado"];

function tone(estado: string): "success" | "neutral" | "warn" | "danger" {
  if (estado === "Activado") return "success";
  if (estado === "Rechazado" || estado === "Eliminado") return "danger";
  if (estado === "Suspendido") return "danger";
  if (estado === "Desactivado") return "neutral";
  return "warn";
}

function QrDetalle({ qr, onClose }: { qr: PuntoVenta; onClose: () => void }) {
  const qrValue = qr.qrUrl || `https://molipay.com.ar/qr/pdv/${qr.id}`;
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(qrValue, { width: 260, margin: 2 }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    }).catch(() => setQrDataUrl(""));
    return () => { cancelled = true; };
  }, [qrValue]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div>
            <h3 className="font-display text-lg font-semibold flex items-center gap-2"><QrCode size={18}/> Detalle QR/POS</h3>
            <p className="text-sm text-muted-foreground">QR: {qr.nombre} · POS asociado: {qr.nombre}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md"><XCircle size={18}/></button>
        </div>
        <div className="p-6 space-y-4">
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">QR — claramente identificado</h4>
            <div className="grid grid-cols-[1fr_auto] gap-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Nombre QR/POS</span><div className="font-semibold">{qr.nombre}</div></div>
                <div><span className="text-muted-foreground">Tipo</span><div className="font-semibold">{qr.tipo ?? "QR"}</div></div>
                <div><span className="text-muted-foreground">Alias</span><div className="font-mono text-xs">{qr.alias ?? "—"}</div></div>
                <div><span className="text-muted-foreground">Estado</span><div><BadgeComp tone={tone(qr.estado)}>{qr.estado}</BadgeComp></div></div>
                <div className="col-span-2"><span className="text-muted-foreground">QR URL</span><div className="font-mono text-xs break-all">{qrValue}</div></div>
                <div><span className="text-muted-foreground">Cajero</span><div className="font-semibold">{qr.cajero ?? "—"}</div></div>
                <div><span className="text-muted-foreground">ID</span><div className="font-mono text-xs">{qr.id.slice(0,8)}</div></div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="border-2 rounded-xl p-2 bg-white">
                  {qrDataUrl ? <img src={qrDataUrl} alt="QR" className="w-32 h-32" /> : <div className="w-32 h-32 bg-muted animate-pulse rounded" />}
                </div>
                <span className="text-[10px] text-muted-foreground text-center">QR para cobro<br/>{qr.nombre}</span>
                <div className="flex gap-1">
                  <button onClick={() => { if (qrDataUrl) { const a=document.createElement("a"); a.href=qrDataUrl; a.download=`qr-${qr.id}.png`; a.click(); } }} className="h-7 px-2 rounded border text-xs flex items-center gap-1"><Download size={12}/>PNG</button>
                  <button onClick={() => { if (qrDataUrl) { const w=window.open(); if(w) w.document.write(`<img src="${qrDataUrl}" onload="window.print()"/>`); } }} className="h-7 px-2 rounded border text-xs flex items-center gap-1"><Printer size={12}/>Imprimir</button>
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">POS asociado</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Nombre POS</span><div className="font-semibold">{qr.nombre}</div></div>
              <div><span className="text-muted-foreground">Fecha creación</span><div className="font-mono text-xs">{new Date(qr.createdAt).toLocaleDateString("es-AR")}</div></div>
              <div><span className="text-muted-foreground">Comercio</span><div className="font-semibold">{qr.comercio?.usuario ?? "—"}</div></div>
              <div><span className="text-muted-foreground">ID POS</span><div className="font-mono text-xs">{qr.id.slice(0,8)}</div></div>
            </div>
          </Card>
          <Card className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Comercio / Usuario</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Comercio</span><div className="font-semibold">{qr.comercio?.usuario ?? "—"}</div></div>
              <div><span className="text-muted-foreground">Legajo comercio</span><div className="font-mono text-xs">{qr.comercio?.legajo ?? "—"}</div></div>
              <div><span className="text-muted-foreground">Usuario</span><div className="font-semibold">{qr.comercio?.clienteCorreo ?? qr.comercio?.usuario ?? "—"}</div></div>
              <div><span className="text-muted-foreground">Cliente</span><div className="font-semibold">{qr.comercio?.clienteNombre ?? "—"}</div></div>
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
  const [estado, setEstado] = useState<EstadoQr | "">("");
  const { can } = useCan();
  const puedeModificar = can("modificar","comercios");
  const puedeBorrar = can("borrar","comercios");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["qr-pos", page, search, estado],
    queryFn: () => listQrPos({ page, pageSize: PAGE_SIZE, search: search || undefined, estado: estado || undefined }),
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const [detail, setDetail] = useState<PuntoVenta | null>(null);
  const [confirm, setConfirm] = useState<{ title:string; message:string; confirmLabel:string; variant:"default"|"danger"; onConfirm:()=>void }|null>(null);

  const cambiar = async (row: PuntoVenta, nuevo: EstadoQr) => {
    try {
      await updateQrEstado(row.id, nuevo);
      qc.invalidateQueries({ queryKey: ["qr-pos"] });
    } catch (e) {
      setConfirm({ title:"No se pudo actualizar", message:(e as Error).message, confirmLabel:"Cerrar", variant:"danger", onConfirm:()=>setConfirm(null) });
    }
  };

  const eliminar = async (row: PuntoVenta) => {
    try {
      await deleteQrPos(row.id);
      qc.invalidateQueries({ queryKey: ["qr-pos"] });
    } catch (e) {
      setConfirm({ title:"No se pudo eliminar", message:(e as Error).message, confirmLabel:"Cerrar", variant:"danger", onConfirm:()=>setConfirm(null) });
    }
  };

  const getActions = (r: PuntoVenta): ActionItem[] => {
    const items: ActionItem[] = [{ label:"Ver detalles", icon:Eye, onClick:()=>setDetail(r) }];
    // Admin no activa manualmente
    if (r.estado !== "Desactivado") items.push({ label:"Desactivar", icon:Ban, disabled:!puedeModificar, variant:"danger" as const, onClick:()=>setConfirm({ title:"Desactivar QR", message:`¿Desactivar ${r.nombre}?`, confirmLabel:"Desactivar", variant:"danger", onConfirm:()=>{ setConfirm(null); void cambiar(r,"Desactivado"); } }) });
    if (r.estado !== "Rechazado") items.push({ label:"Rechazar", icon:XCircle, disabled:!puedeModificar, variant:"danger" as const, onClick:()=>setConfirm({ title:"Rechazar QR", message:`¿Rechazar ${r.nombre}?`, confirmLabel:"Rechazar", variant:"danger", onConfirm:()=>{ setConfirm(null); void cambiar(r,"Rechazado"); } }) });
    if (r.estado !== "Suspendido") items.push({ label:"Suspender", icon:Ban, disabled:!puedeModificar, variant:"danger" as const, onClick:()=>setConfirm({ title:"Suspender QR", message:`¿Suspender ${r.nombre}?`, confirmLabel:"Suspender", variant:"danger", onConfirm:()=>{ setConfirm(null); void cambiar(r,"Suspendido"); } }) });
    items.push({ label:"Eliminar", icon:Trash2, disabled:!puedeBorrar, variant:"danger" as const, onClick:()=>setConfirm({ title:"Eliminar QR", message:`¿Eliminar ${r.nombre}?`, confirmLabel:"Eliminar", variant:"danger", onConfirm:()=>{ setConfirm(null); void eliminar(r); } }) });
    return items;
  };

  const columns: import("@/components/data-table").Column<PuntoVenta>[] = [
    { key:"nombre", label:"QR / POS", filterable:true, render:(r)=> <span className="font-semibold flex items-center gap-1.5"><QrCode size={14}/> {r.nombre} <span className="text-xs text-muted-foreground">({r.tipo ?? "QR"})</span></span> },
    { key:"comercio", label:"Comercio", render:(r)=> <span>{r.comercio?.usuario ?? "—"}</span> },
    { key:"usuario", label:"Usuario", render:(r)=> <span>{r.comercio?.clienteCorreo ?? r.comercio?.usuario ?? "—"}</span> },
    { key:"cajero", label:"Cajero", render:(r)=> <span>{r.cajero ?? "—"}</span> },
    { key:"estado", label:"Estado", filterable:"enum", filterOptions:[...ESTADOS_QR], render:(r)=><Badge tone={tone(r.estado)}>{r.estado}</Badge> },
    { key:"createdAt", label:"Fecha", render:(r)=><span className="font-mono text-xs">{new Date(r.createdAt).toLocaleDateString("es-AR")}</span> },
  ];

  const err = error instanceof DataAccessError ? error : null;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader title="Pagos con QR" description="QRs/POS creados por comercios desde Enterprise. Payway activa; Admin gestiona estados." />
      <div className="flex flex-wrap gap-3 mb-4">
        <input className="h-10 px-3 rounded-md border bg-card text-sm flex-1 min-w-[200px]" placeholder="Buscar QR, comercio, cajero..." value={search} onChange={(e)=>{ setSearch(e.target.value); setPage(0); }} />
        <select className="h-10 px-3 rounded-md border bg-card text-sm" value={estado} onChange={(e)=>{ setEstado(e.target.value as EstadoQr | ""); setPage(0); }}>
          <option value="">Todos los estados</option>
          {ESTADOS_QR.map((e)=><option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      {isLoading ? <div className="flex items-center justify-center rounded-xl border bg-card py-16 text-sm text-muted-foreground"><span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2"/>Cargando QRs…</div>
      : isError ? <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700"><AlertTriangle size={28}/><p>{err?.message ?? "Error"}</p><button onClick={()=>refetch()} className="h-9 px-4 rounded-md bg-primary text-primary-foreground">Reintentar</button></div>
      : rows.length===0 ? <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-sm text-muted-foreground"><Inbox size={28}/><p>No hay QRs/POS.</p><p className="text-xs">Crea un QR en Enterprise → aparecerá aquí como Pendiente de aprobación.</p></div>
      : <>
          <DataTable columns={columns} data={rows} keyExtractor={(r)=>r.id} actions={(r)=> <ActionsDropdown actions={getActions(r)} />} />
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground"><span>{total} QR(s) · página {page+1} de {totalPages}</span><div className="flex gap-2"><button disabled={page===0||isFetching} onClick={()=>setPage((p)=>Math.max(0,p-1))} className="h-9 px-3 rounded-md border bg-card disabled:opacity-50">Anterior</button><button disabled={page+1>=totalPages||isFetching} onClick={()=>setPage((p)=>p+1)} className="h-9 px-3 rounded-md border bg-card disabled:opacity-50">Siguiente</button></div></div>
        </>}
      {detail && <QrDetalle qr={detail} onClose={()=>setDetail(null)} />}
      {confirm && <ConfirmDialog open={!!confirm} onClose={()=>setConfirm(null)} title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} variant={confirm.variant} onConfirm={confirm.onConfirm} />}
    </PermissionGuard>
  );
}
