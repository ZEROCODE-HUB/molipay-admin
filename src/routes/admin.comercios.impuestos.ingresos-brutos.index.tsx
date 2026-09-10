import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, Download, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge, Input, Label, BtnPrimary, BtnOutline } from "@/components/portal-shell";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { FileDropzone } from "@/components/file-dropzone";
import { KpiCard } from "@/components/kpi-card";
import { FormDialog } from "@/components/form-dialog";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { useImpuestosForAsignacion } from "@/hooks/useImpuestos";
import { createIbPadron } from "@/lib/api/impuestos";
import { reportesIniciales, type ReporteImpuesto } from "@/data/impuestos";

export const Route = createFileRoute("/admin/comercios/impuestos/ingresos-brutos/")({
  head: () => ({ meta: [{ title: "Ingresos Brutos — Admin — Moli" }] }),
  component: Page,
});

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- Reportes: TXT padrón + usuarios por tramo ----------

type UsuarioIB = {
  cuit: string;
  nombre: string;
  tasa: number;
  monto: number;
  retencion: number;
};

const NOMBRES_MOCK = [
  "Juan Pérez",
  "María López",
  "Carlos Gómez",
  "Romina Díaz",
  "Federico Silva",
  "Ana Ríos",
  "Joaquín Torres",
  "Lucía Castro",
  "Pablo Ramos",
  "Valentina Duarte",
  "Marta Ruiz",
  "Esteban Escobar",
  "Sofía Núñez",
  "Julieta Campos",
  "Diego Martínez",
  "Camila Fernández",
  "Lucas Herrera",
  "Florencia Álvarez",
  "Martín Sosa",
  "Agustina Romero",
];

function generarUsuariosParaReporte(r: ReporteImpuesto): UsuarioIB[] {
  // cantidad determinística 10-20 según id
  const count = 10 + (r.id % 11); // 10..20
  const base = r.id * 7919;
  return Array.from({ length: count }, (_, i) => {
    const seed = base + i * 37;
    const cuitNum = String(20000000000 + (seed % 8999999999)).padStart(11, "0");
    const cuit = `${cuitNum.slice(0, 2)}-${cuitNum.slice(2, 10)}-${cuitNum.slice(10)}`;
    const nombre = NOMBRES_MOCK[(seed + i) % NOMBRES_MOCK.length];
    const tasa = Number((1.5 + ((seed % 35) / 10)).toFixed(2)); // 1.5% - 4.9% variable
    const monto = 50000 + ((seed * 13) % 450000); // 50k - 500k
    const retencion = Math.round(monto * (tasa / 100));
    return { cuit, nombre, tasa, monto, retencion };
  });
}

function padronTxtContent(r: ReporteImpuesto, usuarios: UsuarioIB[]): string {
  const header = [
    `Padrón Ingresos Brutos — Período ${r.periodo} — ${r.tramo}`,
    `Fecha de generación: ${r.fechaCreacion}`,
    `Presentado: ${r.presentado ? "Sí" : "No"} | Pagado: ${r.pagado ? "Sí" : "No"}`,
    `Total movimientos: ${r.totalMovimientos} | Total montos: $ ${r.totalMontos.toLocaleString()} | Total retenciones: $ ${r.totalRetenciones.toLocaleString()}`,
    `Detalle por usuario (CUIT;Nombre;Tasa;Monto;Retención)`,
    `------------------------------------------------------------`,
  ].join("\n");
  const lines = usuarios.map((u) => `${u.cuit};${u.nombre};${u.tasa.toFixed(2)}%;${u.monto};${u.retencion}`);
  return `${header}\n${lines.join("\n")}\n`;
}

function ReporteDetalleModal({
  reporte,
  onClose,
}: {
  reporte: ReporteImpuesto;
  onClose: () => void;
}) {
  const usuarios = generarUsuariosParaReporte(reporte);
  const impuestoPorMovimiento = reporte.totalMovimientos ? reporte.totalRetenciones / reporte.totalMovimientos : 0;

  const handleDownload = () => {
    const txt = padronTxtContent(reporte, usuarios);
    const filename = `padron-${reporte.periodo}-${reporte.tramo.replace(/\s+/g, "-").toLowerCase()}.txt`;
    downloadFile(filename, txt);
  };

  const columnsUsuarios: Column<UsuarioIB>[] = [
    {
      key: "cuit",
      label: "CUIT",
      render: (u) => <span className="font-mono tabular-nums text-xs">{u.cuit}</span>,
    },
    { key: "nombre", label: "Nombre", render: (u) => u.nombre },
    {
      key: "tasa",
      label: "Tasa (%)",
      sortable: true,
      render: (u) => <span className="font-mono tabular-nums">{u.tasa.toFixed(2)}%</span>,
    },
    {
      key: "monto",
      label: "Monto",
      sortable: true,
      render: (u) => <span className="font-mono tabular-nums">$ {u.monto.toLocaleString()}</span>,
    },
    {
      key: "retencion",
      label: "Retención",
      sortable: true,
      render: (u) => <span className="font-mono tabular-nums">$ {u.retencion.toLocaleString()}</span>,
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display font-semibold text-lg">
              Reporte {reporte.periodo} — {reporte.tramo}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              ID #{reporte.id} · Fecha de creación {reporte.fechaCreacion} · Lista completa de usuarios que pagan IB en este tramo
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total movimientos" value={reporte.totalMovimientos.toLocaleString()} />
            <KpiCard label="Monto total" value={`$ ${reporte.totalMontos.toLocaleString()}`} />
            <KpiCard label="Total montos" value={`$ ${reporte.totalMontos.toLocaleString()}`} />
            <KpiCard label="Total retenciones" value={`$ ${reporte.totalRetenciones.toLocaleString()}`} />
            <KpiCard label="Impuesto por movimiento" value={`$ ${impuestoPorMovimiento.toFixed(2)}`} sub="Retenciones / Movimientos" />
            <KpiCard label="Total movimientos" value={reporte.totalMovimientos.toLocaleString()} sub="Usuarios en padrón" />
            <KpiCard label="Monto total" value={`$ ${reporte.totalMontos.toLocaleString()}`} sub="Suma de montos del período" />
            <KpiCard label="Usuarios en tramo" value={usuarios.length} sub="Tasa variable por usuario" />
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Usuarios / Movimientos que pagan IB en este tramo</h4>
            <DataTable
              columns={columnsUsuarios}
              data={usuarios}
              keyExtractor={(u) => u.cuit}
              pageSize={10}
              showDownloadButton={false}
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex justify-end gap-2">
          <BtnOutline type="button" onClick={onClose}>
            Cerrar
          </BtnOutline>
          <BtnPrimary type="button" onClick={handleDownload}>
            <Download size={16} /> Descargar TXT
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}

function ReportesMock() {
  const [detail, setDetail] = useState<ReporteImpuesto | null>(null);

  const handleDownloadTxt = (r: ReporteImpuesto) => {
    const usuarios = generarUsuariosParaReporte(r);
    const txt = padronTxtContent(r, usuarios);
    const filename = `padron-${r.periodo}-${r.tramo.replace(/\s+/g, "-").toLowerCase()}.txt`;
    downloadFile(filename, txt);
  };

  const getActions = (r: ReporteImpuesto): ActionItem[] => [
    { label: "Ver detalle", icon: Eye, onClick: () => setDetail(r) },
    { label: "Descargar TXT", icon: Download, onClick: () => handleDownloadTxt(r) },
  ];

  const columns: Column<ReporteImpuesto>[] = [
    {
      key: "periodo",
      label: "Periodo",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.periodo}</span>,
    },
    { key: "tramo", label: "Tramo", sortable: true, render: (r) => r.tramo },
    {
      key: "fechaCreacion",
      label: "Fecha de creación",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.fechaCreacion}</span>,
    },
    {
      key: "totalMovimientos",
      label: "Total movimientos",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.totalMovimientos.toLocaleString()}</span>,
    },
    {
      key: "totalMontos",
      label: "Monto total",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">$ {r.totalMontos.toLocaleString()}</span>,
    },
    {
      key: "totalMontos2",
      label: "Total montos",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">$ {r.totalMontos.toLocaleString()}</span>,
    },
    {
      key: "totalRetenciones",
      label: "Total retenciones",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">$ {r.totalRetenciones.toLocaleString()}</span>,
    },
    {
      key: "impuestoPorMovimiento",
      label: "Impuesto por movimiento",
      sortable: true,
      render: (r) => {
        const v = r.totalMovimientos ? r.totalRetenciones / r.totalMovimientos : 0;
        return <span className="font-mono tabular-nums">$ {v.toFixed(2)}</span>;
      },
    },
    {
      key: "presentado",
      label: "Presentado",
      sortable: true,
      render: (r) => (r.presentado ? <Badge tone="success">Sí</Badge> : <Badge tone="neutral">No</Badge>),
    },
    {
      key: "pagado",
      label: "Pagado",
      sortable: true,
      render: (r) => (r.pagado ? <Badge tone="success">Sí</Badge> : <Badge tone="neutral">No</Badge>),
    },
  ];

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-display font-semibold text-base">Reportes de Impuestos — Ingresos Brutos</h3>
        <Badge tone="neutral">Demo</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-4 -mt-2">
        Cada registro representa un tramo/período. El archivo TXT es el padrón cargado. Ver detalle muestra la lista completa de
        usuarios que pagan IB en ese tramo (tasa variable). Tramos: 1 (d1-10), 2 (d10-20), 3 (d20-30) y Mensual (resumen).
      </p>
      <DataTable
        columns={columns}
        data={reportesIniciales}
        keyExtractor={(r) => String(r.id)}
        pageSize={10}
        showDownloadButton={false}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />

      {detail && <ReporteDetalleModal reporte={detail} onClose={() => setDetail(null)} />}
    </>
  );
}

// --- Página --------------------------------------------------------------------

function Page() {
  const queryClient = useQueryClient();
  const { can } = useCan();
  const puedeCrear = can("crear", "impuestos");

  // Alta de padrón
  const [impuestoId, setImpuestoId] = useState("");
  const [nombre, setNombre] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPadronPopup, setShowPadronPopup] = useState(false);

  const { rows: impuestosDisponibles } = useImpuestosForAsignacion();

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["ib_padrones"] });

  const cargarPadron = async () => {
    if (!impuestoId || !nombre.trim() || !file) {
      setFormError("Completá impuesto, nombre del padrón y seleccioná un archivo TXT.");
      return;
    }
    if (file && !file.name.toLowerCase().endsWith(".txt")) {
      setFormError("El archivo debe ser .txt (padrón TXT).");
      return;
    }
    setFormError(null);
    try {
      await createIbPadron({
        impuesto_id: impuestoId,
        nombre: nombre.trim(),
        archivo: file.name,
      });
      invalidar();
      setImpuestoId("");
      setNombre("");
      setFile(null);
    } catch (e) {
      setFormError((e as Error).message);
    }
  };

  return (
    <PermissionGuard recurso="impuestos">
      <PageHeader
        title="Ingresos Brutos"
        description="Gestión de padrones TXT de Ingresos Brutos."
        action={
          <BtnPrimary onClick={()=> setShowPadronPopup(true)} disabled={!puedeCrear}>
            Cargar padrón
          </BtnPrimary>
        }
      />

      {showPadronPopup && (
        <FormDialog
          open
          onClose={()=> { setShowPadronPopup(false); setFormError(null); }}
          title="Cargar padrón TXT"
          description="Cargá un padrón TXT para un impuesto determinado."
          onSubmit={async ()=> { await cargarPadron(); setShowPadronPopup(false); }}
          submitLabel="Cargar padrón"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="ib-impuesto">Impuesto</Label>
              <select
                id="ib-impuesto"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                value={impuestoId}
                onChange={(e) => setImpuestoId(e.target.value)}
                disabled={!puedeCrear}
              >
                <option value="">Seleccionar…</option>
                {impuestosDisponibles.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.codigo} — {i.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="ib-nombre">Nombre del padrón</Label>
              <Input
                id="ib-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Padrón CABA Q3"
                disabled={!puedeCrear}
              />
            </div>
            <div>
              <Label>Archivo</Label>
              <FileDropzone onFile={setFile} accept=".txt" />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
        </FormDialog>
      )}

      <section className="bg-card border rounded-lg p-5">
        <ReportesMock />
      </section>
    </PermissionGuard>
  );
}
