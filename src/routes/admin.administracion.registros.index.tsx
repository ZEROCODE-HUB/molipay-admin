import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Eye } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge } from "@/components/portal-shell";

type Fondo = {
  legajo: string;
  email: string;
  nombre: string;
  cvu: string;
  alias: string;
  balance: string;
  estado: string;
  alerta?: string;
};

const mock: Fondo[] = [
  {
    legajo: "LPF-20123456789",
    email: "jperez@empresa.com",
    nombre: "Juan Pérez",
    cvu: "1234567890123456789012",
    alias: "juanp.moli",
    balance: "$ 1.690.000.00",
    estado: "Activo",
  },
  {
    legajo: "LPF-20123456789",
    email: "jperez@empresa.com",
    nombre: "Juan Pérez",
    cvu: "1234567890123456789013",
    alias: "juanp.sueldos",
    balance: "$ 340.000.00",
    estado: "Activo",
  },
  {
    legajo: "LPF-27234567890",
    email: "mgarcia@corp.com",
    nombre: "María García",
    cvu: "1234567890123456789023",
    alias: "mariag.corp",
    balance: "$ 2.550.000.00",
    estado: "Activo",
  },
  {
    legajo: "LPF-27234567890",
    email: "mgarcia@corp.com",
    nombre: "María García",
    cvu: "1234567890123456789024",
    alias: "mariag.sueldos",
    balance: "$ 450.000.00",
    estado: "Activo",
  },
  {
    legajo: "LPF-20345678901",
    email: "carlosm@firma.com",
    nombre: "Carlos Martínez",
    cvu: "1234567890123456789034",
    alias: "carlos.firma",
    balance: "$ 610.000.00",
    estado: "Activo",
    alerta: "Diferencia vs banco: -$12.000",
  },
  {
    legajo: "LPF-27456789012",
    email: "analopez@sa.com",
    nombre: "Ana López",
    cvu: "1234567890123456789045",
    alias: "analopez.sa",
    balance: "$ 3.400.000.00",
    estado: "Activo",
  },
  {
    legajo: "LPF-20567890123",
    email: "robertod@com.com",
    nombre: "Roberto Díaz",
    cvu: "1234567890123456789056",
    alias: "roberto.com",
    balance: "$ 180.000.00",
    estado: "Suspendido",
  },
];

export const Route = createFileRoute("/admin/administracion/registros/")({
  head: () => ({ meta: [{ title: "Fondos por usuario — Admin Panel" }] }),
  component: Page,
});

function downloadExcel(filename: string, rows: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reporte");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function Page() {
  const [viewing, setViewing] = useState<Fondo | null>(null);

  const getActions = (r: Fondo): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setViewing(r) },
  ];

  const columns: Column<Fondo>[] = [
    {
      key: "legajo",
      label: "Legajo",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.legajo}</span>,
    },
    { key: "email", label: "Email", filterable: true, render: (r) => r.email },
    { key: "nombre", label: "Nombre", filterable: true, render: (r) => r.nombre },
    {
      key: "cvu",
      label: "CVU",
      filterable: true,
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.cvu}</span>,
    },
    { key: "alias", label: "Alias", filterable: true, render: (r) => r.alias },
    {
      key: "balance",
      label: "Balance",
      sortable: true,
      render: (r) => <span className="font-semibold font-mono text-xs">{r.balance}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      filterable: "enum",
      filterOptions: ["Activo", "Suspendido"],
      render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "danger"}>{r.estado}</Badge>,
    },
  ];

  const excelRows = (data: Fondo[]) =>
    data.map((r) => ({
      Legajo: r.legajo,
      Email: r.email,
      Nombre: r.nombre,
      CVU: r.cvu,
      Alias: r.alias,
      Balance: r.balance,
    }));

  return (
    <>
      <PageHeader
        title="Fondos por usuario"
        description="Incluye subcuentas por usuario"
        action={
          <button
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
            onClick={() => {
              downloadExcel("fondos_por_usuario.xlsx", excelRows(mock));
              toast.success("Archivo Excel descargado correctamente");
            }}
          >
            <Download size={14} /> Descargar Excel
          </button>
        }
      />
      <DataTable
        columns={columns}
        data={mock}
        keyExtractor={(r) => r.cvu}
        pageSize={10}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
        onDownloadCSV={() => downloadExcel("fondos_filtrados.xlsx", excelRows(mock))}
      />

      {viewing && (
        <FormDialog
          open={!!viewing}
          onClose={() => setViewing(null)}
          title="Detalle de fondo"
          description={`${viewing.nombre} — ${viewing.cvu}`}
          onSubmit={() => setViewing(null)}
          submitLabel="Cerrar"
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Legajo:</span>{" "}
              <span className="font-medium font-mono">{viewing.legajo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Nombre:</span>{" "}
              <span className="font-medium">{viewing.nombre}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Email:</span>{" "}
              <span className="font-medium">{viewing.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">CVU:</span>{" "}
              <span className="font-medium font-mono text-xs">{viewing.cvu}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Alias:</span>{" "}
              <span className="font-medium">{viewing.alias}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Balance:</span>{" "}
              <span className="font-medium font-mono">{viewing.balance}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Estado:</span>{" "}
              <span className="font-medium">{viewing.estado}</span>
            </div>
            {viewing.alerta && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Alerta:</span>{" "}
                <span className="font-medium text-amber-600">{viewing.alerta}</span>
              </div>
            )}
          </div>
        </FormDialog>
      )}
    </>
  );
}
