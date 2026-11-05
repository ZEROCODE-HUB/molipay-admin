import { useState } from "react";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { Input,Label } from "@/shared/ui/form-controls";
import { Download,Search } from "lucide-react";
import { BtnOutline } from "@/shared/ui/button";
import { downloadXlsx } from "@/shared/lib/download";
import { MOVEMENTS } from "@/features/regulatory-reports/reports.rules";
import { type Movimiento } from "@/features/regulatory-reports/reports.types";

export function ReportsMovements() {
  const [cuit, setCuit] = useState("");
  const [consulta, setConsulta] = useState("");
  const valid = /^\d{11}$/.test(cuit);
  const rows = consulta ? (MOVEMENTS[consulta] ?? []) : [];

  const columns: Column<Movimiento>[] = [
    {
      key: "coelsaId",
      label: "ID COELSA",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono text-xs">{r.coelsaId}</span>,
    },
    {
      key: "legajo",
      label: "Legajo",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.legajo}</span>,
    },
    { key: "email", label: "Email", filterable: true, render: (r) => r.email },
    {
      key: "cvu",
      label: "CVU",
      filterable: true,
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.cvu}</span>,
    },
    {
      key: "dia",
      label: "Día",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.dia}</span>,
    },
    {
      key: "hora",
      label: "Hora",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.hora}</span>,
    },
    {
      key: "tipo",
      label: "Tipo",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Depósito", "Retiro"],
      render: (r) => r.tipo,
    },
    {
      key: "monto",
      label: "Monto",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.monto}</span>,
    },
    {
      key: "cvuRemitente",
      label: "CVU remitente",
      filterable: true,
      render: (r) => (
        <span className="font-mono text-xs tabular-nums">{r.cvuRemitente || "—"}</span>
      ),
    },
    {
      key: "cuitRemitente",
      label: "CUIT remitente",
      filterable: true,
      render: (r) => (
        <span className="font-mono tabular-nums text-xs">{r.cuitRemitente || "—"}</span>
      ),
    },
    {
      key: "nombreRemitente",
      label: "Nombre remitente",
      filterable: true,
      render: (r) => r.nombreRemitente || "—",
    },
  ];

  const excelRows = rows.map((r) => ({
    "ID COELSA": r.coelsaId,
    Legajo: r.legajo,
    Email: r.email,
    CVU: r.cvu,
    Día: r.dia,
    Hora: r.hora,
    Tipo: r.tipo,
    Monto: r.monto,
    "CVU remitente": r.cvuRemitente,
    "CUIT remitente": r.cuitRemitente,
    "Nombre remitente": r.nombreRemitente,
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ingresá un CUIT (11 dígitos) para consultar y descargar en Excel los movimientos de personas
        físicas y jurídicas fuera de la plataforma.
      </p>
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <Label htmlFor="cuit-mov">CUIT</Label>
          <Input
            id="cuit-mov"
            value={cuit}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 11);
              setCuit(v);
              if (v.length !== 11) setConsulta("");
            }}
            placeholder="Ej: 20123456789"
          />
        </div>
        <button
          disabled={!valid}
          onClick={() => setConsulta(cuit)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Search size={14} /> Buscar
        </button>
      </div>
      {cuit.length > 0 && !valid && (
        <p className="text-xs text-amber-600">El CUIT debe tener 11 dígitos numéricos.</p>
      )}
      {valid && consulta && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BtnOutline onClick={() => downloadXlsx(`movimientos_${consulta}.xlsx`, excelRows)}>
              <Download size={14} /> Descargar Excel
            </BtnOutline>
            <span className="text-sm text-muted-foreground">
              {rows.length} movimientos encontrados
            </span>
          </div>
        </div>
      )}
      {consulta &&
        valid &&
        (rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No se encontraron movimientos para el CUIT consultado.
          </p>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.coelsaId}
            pageSize={10}
            showDownloadButton={false}
          />
        ))}
    </div>
  );
}
