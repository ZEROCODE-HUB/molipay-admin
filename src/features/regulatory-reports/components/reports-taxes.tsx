import { useState } from "react";
import { toast } from "sonner";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Download,FileText,Plus } from "lucide-react";
import { downloadText } from "@/shared/lib/download";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Label,Select } from "@/shared/ui/form-controls";
import { type Tax } from "@/features/regulatory-reports/reports.types";
import {
TAXES_AVAILABLES,
generateTxtTax,
generateXmlTax,
taxesData,
} from "@/features/regulatory-reports/reports.rules";
import { TaxDetailModal } from "./tax-detail-modal";

export function ReportsTaxes() {
  const [data, setData] = useState<Tax[]>(taxesData);
  const [detail, setDetail] = useState<Tax | null>(null);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ fecha: "", impuesto: "", tramo: "" });

  const markFiled = (id: string) => {
    setData((prev) => prev.map((d) => (d.id === id ? { ...d, presentado: "Sí" } : d)));
    setDetail((prev) => (prev && prev.id === id ? { ...prev, presentado: "Sí" } : prev));
    toast.success("Reporte marcado como presentado");
  };

  const markPaid = (id: string) => {
    setData((prev) => prev.map((d) => (d.id === id ? { ...d, pagado: "Sí" } : d)));
    setDetail((prev) => (prev && prev.id === id ? { ...prev, pagado: "Sí" } : prev));
    toast.success("Reporte marcado como pagado");
  };

  const generateReport = () => {
    if (!form.fecha || !form.impuesto || !form.tramo) return;
    const id = `IMP-${String(data.length + 1).padStart(4, "0")}`;
    setData((prev) => [
      ...prev,
      {
        id,
        reporte: form.impuesto,
        periodo: form.fecha.slice(0, 7),
        tramo: form.tramo,
        creado: form.fecha,
        presentado: "No",
        pagado: "No",
        totalRegistros: 0,
        totalMovimientos: 0,
        totalMonto: "$ 0",
        totalRetenciones: "$ 0",
      },
    ]);
    setForm({ fecha: "", impuesto: "", tramo: "" });
    setGenerating(false);
    toast.success("Reporte generado correctamente");
  };

  const columns: Column<Tax>[] = [
    {
      key: "periodo",
      label: "Período",
      filterable: true,
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.periodo}</span>,
    },
    {
      key: "tramo",
      label: "Tramo",
      filterable: "enum",
      filterOptions: ["Tramo 1", "Tramo 2", "Tramo 3"],
      render: (r) => r.tramo,
    },
    {
      key: "creado",
      label: "Fecha de creación",
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.creado}</span>,
    },
    {
      key: "presentado",
      label: "Presentado",
      filterable: "enum",
      filterOptions: ["Sí", "No"],
      render: (r) => (
        <Badge tone={r.presentado === "Sí" ? "success" : "danger"}>{r.presentado}</Badge>
      ),
    },
    {
      key: "pagado",
      label: "Pagado",
      filterable: "enum",
      filterOptions: ["Sí", "No"],
      render: (r) => <Badge tone={r.pagado === "Sí" ? "success" : "danger"}>{r.pagado}</Badge>,
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground">
          Reportes de presentación de impuestos por período y tramo.
        </p>
        <BtnPrimary type="button" className="h-9 text-sm" onClick={() => setGenerating(true)}>
          <Plus size={14} /> Generar reporte
        </BtnPrimary>
      </div>

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        pageSize={10}
        showDownloadButton={false}
        actions={(r) => (
          <div className="flex items-center gap-1">
            <BtnOutline
              className="h-7 px-2 text-xs"
              onClick={() => setDetail(r)}
              title="Ver detalle"
            >
              <FileText size={14} /> Ver detalle
            </BtnOutline>
            <BtnOutline
              className="h-7 px-2 text-xs"
              onClick={() => downloadText(`${r.reporte}_${r.periodo}.txt`, generateTxtTax(r))}
              title="Descargar TXT"
            >
              <Download size={14} /> TXT
            </BtnOutline>
            <BtnOutline
              className="h-7 px-2 text-xs"
              onClick={() => downloadText(`${r.reporte}_${r.periodo}.xml`, generateXmlTax(r))}
              title="Descargar XML"
            >
              <Download size={14} /> XML
            </BtnOutline>
            <BtnOutline
              className="h-7 px-2 text-xs"
              onClick={() => downloadText(`${r.reporte}_${r.periodo}.zip`, "")}
              title="Descargar ZIP"
            >
              <Download size={14} /> ZIP
            </BtnOutline>
          </div>
        )}
      />

      {detail && (
        <TaxDetailModal
          impuesto={detail}
          onClose={() => setDetail(null)}
          onMarcarPresentado={markFiled}
          onMarcarPagado={markPaid}
        />
      )}

      {generating && (
        <FormDialog
          open
          onClose={() => setGenerating(false)}
          title="Generar reporte"
          description="Completá los datos para generar un nuevo reporte de impuesto."
          onSubmit={generateReport}
          submitLabel="Generar reporte"
          size="md"
        >
          <div>
            <Label htmlFor="ri-fecha">Fecha</Label>
            <input
              id="ri-fecha"
              type="date"
              value={form.fecha}
              onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <Label htmlFor="ri-impuesto">Impuesto para el reporte</Label>
            <Select
              id="ri-impuesto"
              value={form.impuesto}
              onChange={(e) => setForm((f) => ({ ...f, impuesto: e.target.value }))}
            >
              <option value="">Seleccionar impuesto</option>
              {TAXES_AVAILABLES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ri-tramo">Tramo</Label>
            <Select
              id="ri-tramo"
              value={form.tramo}
              onChange={(e) => setForm((f) => ({ ...f, tramo: e.target.value }))}
            >
              <option value="">Seleccionar tramo</option>
              <option value="Tramo 1">Tramo 1</option>
              <option value="Tramo 2">Tramo 2</option>
              <option value="Tramo 3">Tramo 3</option>
            </Select>
          </div>
        </FormDialog>
      )}
    </div>
  );
}
