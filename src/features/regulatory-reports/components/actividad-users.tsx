import { useState } from "react";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { Input,Label } from "@/shared/ui/form-controls";
import { Download,Search } from "lucide-react";
import { BtnOutline } from "@/shared/ui/button";
import { downloadXlsx } from "@/shared/lib/download";
import { ACTIVIDAD_BASE,parseDateDMY } from "@/features/regulatory-reports/reports.rules";
import { type Actividad } from "@/features/regulatory-reports/reports.types";

export function ActividadUsers() {
  const [legajo, setLegajo] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [consultado, setConsultado] = useState(false);

  const filtrados = consultado
    ? (ACTIVIDAD_BASE[legajo] ?? []).filter(
        (a) =>
          (!from || (parseDateDMY(a.fecha) ?? 0) >= (parseDateDMY(from) ?? 0)) &&
          (!to || (parseDateDMY(a.fecha) ?? 0) <= (parseDateDMY(to) ?? 0)),
      )
    : [];

  const columns: Column<Actividad>[] = [
    {
      key: "campo",
      label: "Campo actualizado",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-medium">{r.campo}</span>,
    },
    {
      key: "valorAnterior",
      label: "Valor anterior",
      render: (r) => <span className="text-muted-foreground line-through">{r.valorAnterior}</span>,
    },
    {
      key: "valorNuevo",
      label: "Valor nuevo",
      sortable: true,
      filterable: true,
      render: (r) => <span className="text-foreground font-medium">{r.valorNuevo}</span>,
    },
    {
      key: "fecha",
      label: "Fecha y hora",
      sortable: true,
      filterable: "date",
      render: (r) => (
        <span className="text-muted-foreground tabular-nums">
          {r.fecha} {r.hora}
        </span>
      ),
    },
    {
      key: "usuario",
      label: "Actualizado por",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono text-xs">{r.usuario}</span>,
    },
  ];

  const excelRows = filtrados.map((a) => ({
    "Campo actualizado": a.campo,
    "Valor anterior": a.valorAnterior,
    "Valor nuevo": a.valorNuevo,
    "Fecha y hora": `${a.fecha} ${a.hora}`,
    "Actualizado por": a.usuario,
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ingresá un Legajo para consultar la actividad del usuario. Los datos se muestran como en el
        historial de cambios del detalle del usuario.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px]">
          <Label htmlFor="act-legajo">Legajo</Label>
          <Input
            id="act-legajo"
            value={legajo}
            onChange={(e) => {
              setLegajo(e.target.value);
              setConsultado(false);
            }}
            placeholder="Ej: ADM-001"
          />
        </div>
        <div className="min-w-[160px]">
          <Label htmlFor="act-desde">Desde</Label>
          <input
            id="act-desde"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setConsultado(false);
            }}
            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
        <div className="min-w-[160px]">
          <Label htmlFor="act-hasta">Hasta</Label>
          <input
            id="act-hasta"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setConsultado(false);
            }}
            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
        <button
          disabled={!legajo}
          onClick={() => setConsultado(true)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Search size={14} /> Buscar
        </button>
      </div>
      {consultado && filtrados.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BtnOutline onClick={() => downloadXlsx(`actividad_${legajo}.xlsx`, excelRows)}>
              <Download size={14} /> Descargar reporte
            </BtnOutline>
            <span className="text-sm text-muted-foreground">
              {filtrados.length} registros encontrados
            </span>
          </div>
        </div>
      )}
      {consultado && filtrados.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No se encontraron registros para la búsqueda realizada.
        </p>
      ) : consultado ? (
        <DataTable
          columns={columns}
          data={filtrados}
          keyExtractor={(r) => r.fecha + r.hora + r.campo}
          pageSize={10}
          showDownloadButton={false}
        />
      ) : null}
    </div>
  );
}
