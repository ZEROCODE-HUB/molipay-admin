import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Eye, CheckCircle2, Circle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { Badge, BtnPrimary, BtnOutline } from "@/components/portal-shell";
import { reportesIniciales, type ReporteImpuesto } from "@/data/impuestos";

export const Route = createFileRoute("/admin/modulos/impuestos/ingresos-brutos/reportes")({
  head: () => ({ meta: [{ title: "Reportes de Impuestos — Admin — Moli" }] }),
  component: Page,
});

function downloadCsv(rows: ReporteImpuesto[]) {
  const header = [
    "ID",
    "Periodo",
    "Tramo",
    "FechaCreacion",
    "Presentado",
    "Pagado",
    "TotalMovimientos",
    "TotalMontos",
    "TotalRetenciones",
  ];
  const lines = rows.map((r) =>
    [
      r.id,
      r.periodo,
      r.tramo,
      r.fechaCreacion,
      r.presentado ? "Sí" : "No",
      r.pagado ? "Sí" : "No",
      r.totalMovimientos,
      r.totalMontos,
      r.totalRetenciones,
    ].join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reportes-impuestos.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function Page() {
  const [data, setData] = useState<ReporteImpuesto[]>(reportesIniciales);
  const [detailId, setDetailId] = useState<number | null>(null);
  const detail = data.find((r) => r.id === detailId) ?? null;

  const marcar = (id: number, campo: "presentado" | "pagado") => {
    setData((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: true } : r)));
  };

  const columns: Column<ReporteImpuesto>[] = [
    {
      key: "periodo",
      label: "Período",
      sortable: true,
      filterable: true,
      render: (r) => r.periodo,
    },
    { key: "tramo", label: "Tramo", sortable: true, filterable: true, render: (r) => r.tramo },
    {
      key: "fechaCreacion",
      label: "Fecha de creación",
      sortable: true,
      filterable: "date",
      render: (r) => r.fechaCreacion,
    },
    {
      key: "presentado",
      label: "Presentado",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Sí", "No"],
      render: (r) =>
        r.presentado ? <Badge tone="success">Sí</Badge> : <Badge tone="neutral">No</Badge>,
    },
    {
      key: "pagado",
      label: "Pagado",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Sí", "No"],
      render: (r) =>
        r.pagado ? <Badge tone="success">Sí</Badge> : <Badge tone="neutral">No</Badge>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Reportes de Impuestos"
        description="Reportes de presentación de impuestos por período y tramo."
        action={
          <BtnOutline onClick={() => downloadCsv(data)}>
            <Download size={16} /> Descargar ZIP
          </BtnOutline>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        pageSize={10}
        actions={(r) => (
          <button
            onClick={() => setDetailId(r.id)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Eye size={14} /> Ver detalle
          </button>
        )}
      />

      {detail && (
        <FormDialog
          open
          onClose={() => setDetailId(null)}
          title={`Reporte ${detail.periodo} — ${detail.tramo}`}
          description={`ID #${detail.id}`}
          onSubmit={() => setDetailId(null)}
          submitLabel="Cerrar"
        >
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <Field label="Período" value={detail.periodo} />
            <Field label="Tramo" value={detail.tramo} />
            <Field label="Fecha de creación" value={detail.fechaCreacion} />
            <Field label="Total de movimientos" value={String(detail.totalMovimientos)} />
            <Field label="Total de montos" value={`$ ${detail.totalMontos.toLocaleString()}`} />
            <Field
              label="Total de retenciones"
              value={`$ ${detail.totalRetenciones.toLocaleString()}`}
            />
            <div>
              <span className="text-xs text-muted-foreground">Presentado</span>
              <div className="font-medium">
                {detail.presentado ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 size={14} /> Sí
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Circle size={14} /> No
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Pagado</span>
              <div className="font-medium">
                {detail.pagado ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 size={14} /> Sí
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Circle size={14} /> No
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <BtnPrimary
              type="button"
              disabled={detail.presentado}
              onClick={() => marcar(detail.id, "presentado")}
            >
              Marcar como presentado
            </BtnPrimary>
            <BtnPrimary
              type="button"
              disabled={detail.pagado}
              onClick={() => marcar(detail.id, "pagado")}
            >
              Marcar como pagado
            </BtnPrimary>
          </div>
        </FormDialog>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="font-medium">{value}</div>
    </div>
  );
}
