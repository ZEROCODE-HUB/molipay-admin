import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, X, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge, BtnOutline } from "@/components/portal-shell";

type Evento = {
  legajo: string;
  email: string;
  fecha: string;
  hora: string;
  tipo: string;
  monto: string;
  estado: string;
  nombre: string;
  destino: string;
  cuit: string;
  destinatario: string;
  cvu: string;
  cvuBalance: string;
};

const mock: Evento[] = [
  {
    legajo: "LPF-20123456789",
    email: "jperez@empresa.com",
    fecha: "2026-07-16",
    hora: "08:30:00",
    tipo: "Login",
    monto: "-",
    estado: "Exitoso",
    nombre: "Juan Pérez",
    destino: "Web",
    cuit: "-",
    destinatario: "-",
    cvu: "-",
    cvuBalance: "-",
  },
  {
    legajo: "LPF-27234567890",
    email: "mgarcia@corp.com",
    fecha: "2026-07-16",
    hora: "09:15:00",
    tipo: "Edición de usuario",
    monto: "-",
    estado: "Resuelto",
    nombre: "María García",
    destino: "Backoffice",
    cuit: "-",
    destinatario: "-",
    cvu: "-",
    cvuBalance: "-",
  },
  {
    legajo: "LPF-20123456789",
    email: "jperez@empresa.com",
    fecha: "2026-07-16",
    hora: "10:00:00",
    tipo: "Exportación de reporte",
    monto: "-",
    estado: "Completado",
    nombre: "Juan Pérez",
    destino: "Reportes",
    cuit: "-",
    destinatario: "-",
    cvu: "-",
    cvuBalance: "-",
  },
  {
    legajo: "LPF-20345678901",
    email: "carlosm@firma.com",
    fecha: "2026-07-15",
    hora: "14:00:00",
    tipo: "Cambio de rol",
    monto: "-",
    estado: "Exitoso",
    nombre: "Carlos Martínez",
    destino: "Backoffice",
    cuit: "-",
    destinatario: "-",
    cvu: "-",
    cvuBalance: "-",
  },
  {
    legajo: "LPF-20123456789",
    email: "jperez@empresa.com",
    fecha: "2026-07-16",
    hora: "11:20:00",
    tipo: "Depósito",
    monto: "$ 500.000",
    estado: "Exitoso",
    nombre: "Juan Pérez",
    destino: "Cuenta recaudadora",
    cuit: "30123456789",
    destinatario: "Juan Pérez",
    cvu: "1234567890123456789012",
    cvuBalance: "1234567890123456789012",
  },
  {
    legajo: "LPF-27234567890",
    email: "mgarcia@corp.com",
    fecha: "2026-07-16",
    hora: "12:45:00",
    tipo: "Retiro",
    monto: "$ 200.000",
    estado: "Pendiente",
    nombre: "María García",
    destino: "Cuenta recaudadora",
    cuit: "30123456789",
    destinatario: "María García",
    cvu: "1234567890123456789023",
    cvuBalance: "1234567890123456789023",
  },
  {
    legajo: "LPF-20345678901",
    email: "carlosm@firma.com",
    fecha: "2026-07-15",
    hora: "15:30:00",
    tipo: "Sincronización CVU",
    monto: "-",
    estado: "Completado",
    nombre: "Carlos Martínez",
    destino: "COELSA",
    cuit: "-",
    destinatario: "-",
    cvu: "-",
    cvuBalance: "-",
  },
];

export const Route = createFileRoute("/admin/administracion/usuarios/actividad")({
  head: () => ({ meta: [{ title: "Actividad en backoffice — Admin Panel" }] }),
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
  const [detalle, setDetalle] = useState<Evento | null>(null);

  const getActions = (r: Evento): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetalle(r) },
  ];

  const columns: Column<Evento>[] = [
    {
      key: "legajo",
      label: "Legajo",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.legajo}</span>,
    },
    { key: "email", label: "Email", filterable: true, render: (r) => r.email },
    {
      key: "fecha",
      label: "Fecha",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.fecha}</span>,
    },
    {
      key: "hora",
      label: "Hora",
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.hora}</span>,
    },
    { key: "tipo", label: "Tipo de transacción", filterable: true, render: (r) => r.tipo },
    {
      key: "monto",
      label: "Monto",
      sortable: true,
      render: (r) => <span className="font-mono">{r.monto}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      filterable: "enum",
      filterOptions: ["Exitoso", "Pendiente", "Completado", "Resuelto"],
      render: (r) => <Badge>{r.estado}</Badge>,
    },
    { key: "nombre", label: "Nombre", filterable: true, render: (r) => r.nombre },
    { key: "destino", label: "Destino", filterable: true, render: (r) => r.destino },
    {
      key: "cuit",
      label: "CUIT",
      filterable: true,
      render: (r) => <span className="font-mono text-xs">{r.cuit}</span>,
    },
    { key: "destinatario", label: "Destinatario", filterable: true, render: (r) => r.destinatario },
    {
      key: "cvu",
      label: "CVU",
      filterable: true,
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.cvu}</span>,
    },
    {
      key: "cvuBalance",
      label: "CVU de balance",
      filterable: true,
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.cvuBalance}</span>,
    },
  ];

  const excelRows = (data: Evento[]) =>
    data.map((r) => ({
      Legajo: r.legajo,
      Email: r.email,
      Fecha: r.fecha,
      Hora: r.hora,
      Tipo: r.tipo,
      Monto: r.monto,
      Estado: r.estado,
      Nombre: r.nombre,
      Destino: r.destino,
      CUIT: r.cuit,
      Destinatario: r.destinatario,
      CVU: r.cvu,
      "CVU de balance": r.cvuBalance,
    }));

  return (
    <>
      <PageHeader
        title="Actividad en backoffice"
        description="Registro de eventos del panel administrativo"
        action={
          <BtnOutline
            onClick={() => {
              downloadExcel("actividad_backoffice.xlsx", excelRows(mock));
              toast.success("Archivo Excel descargado correctamente");
            }}
          >
            <Download size={16} /> Descargar Excel
          </BtnOutline>
        }
      />
      <DataTable
        columns={columns}
        data={mock}
        keyExtractor={(r) => r.legajo + r.fecha + r.hora + r.tipo}
        pageSize={10}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
        showDownloadButton={false}
      />

      {detalle && (
        <FormDialog
          open={!!detalle}
          onClose={() => setDetalle(null)}
          title="Detalle del evento"
          description={`${detalle.tipo} — ${detalle.legajo}`}
          onSubmit={() => setDetalle(null)}
          submitLabel="Cerrar"
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Legajo:</span>{" "}
              <span className="font-medium font-mono">{detalle.legajo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>{" "}
              <span className="font-medium">{detalle.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tipo:</span>{" "}
              <span className="font-medium">{detalle.tipo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Estado:</span>{" "}
              <span className="font-medium">{detalle.estado}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Fecha:</span>{" "}
              <span className="font-medium font-mono tabular-nums">{detalle.fecha}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Hora:</span>{" "}
              <span className="font-medium font-mono tabular-nums">{detalle.hora}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Nombre:</span>{" "}
              <span className="font-medium">{detalle.nombre}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Monto:</span>{" "}
              <span className="font-medium font-mono">{detalle.monto}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Destino:</span>{" "}
              <span className="font-medium">{detalle.destino}</span>
            </div>
            <div>
              <span className="text-muted-foreground">CUIT:</span>{" "}
              <span className="font-medium font-mono text-xs">{detalle.cuit}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Destinatario:</span>{" "}
              <span className="font-medium">{detalle.destinatario}</span>
            </div>
            <div>
              <span className="text-muted-foreground">CVU:</span>{" "}
              <span className="font-medium font-mono text-xs tabular-nums">{detalle.cvu}</span>
            </div>
            <div>
              <span className="text-muted-foreground">CVU de balance:</span>{" "}
              <span className="font-medium font-mono text-xs tabular-nums">
                {detalle.cvuBalance}
              </span>
            </div>
          </div>
        </FormDialog>
      )}
    </>
  );
}
