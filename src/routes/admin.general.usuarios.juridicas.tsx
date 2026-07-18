import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { BtnOutline, Badge } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/general/usuarios/juridicas")({
  head: () => ({
    meta: [
      { title: "Personas jurídicas — Usuarios — Admin Molly" },
      { name: "description", content: "Gestión de personas jurídicas registradas en la plataforma." },
    ],
  }),
  component: JuridicasPage,
});

type Juridica = {
  legajo: string;
  correo: string;
  razonSocial: string;
  tipo: "SA" | "SRL";
  estado: string;
  fechaRegistro: string;
  subcuentas: number;
};

const toneMap: Record<string, "success" | "warn" | "danger" | "neutral"> = {
  Activado: "success",
  Registrado: "neutral",
  "Pre-activado": "warn",
  "En progreso": "warn",
  "Pendiente de verificación de email": "warn",
  "Pendiente de aprobación": "danger",
};

const data: Juridica[] = [
  { legajo: "JUR-001", correo: "info@constructoraalpha.com", razonSocial: "Constructora Alpha SA", tipo: "SA", estado: "Activado", fechaRegistro: "10/01/2024", subcuentas: 5 },
  { legajo: "JUR-002", correo: "admin@comercializadorabeta.com", razonSocial: "Comercializadora Beta SRL", tipo: "SRL", estado: "Registrado", fechaRegistro: "22/02/2024", subcuentas: 2 },
  { legajo: "JUR-003", correo: "contacto@serviciosgamma.com", razonSocial: "Servicios Gamma SA", tipo: "SA", estado: "Pre-activado", fechaRegistro: "14/03/2024", subcuentas: 3 },
  { legajo: "JUR-004", correo: "ventas@distribuidoradelta.com", razonSocial: "Distribuidora Delta SRL", tipo: "SRL", estado: "En progreso", fechaRegistro: "05/04/2024", subcuentas: 1 },
  { legajo: "JUR-005", correo: "info@logisticaepsilon.com", razonSocial: "Logística Epsilon SA", tipo: "SA", estado: "Pendiente de verificación de email", fechaRegistro: "19/05/2024", subcuentas: 0 },
  { legajo: "JUR-006", correo: "admin@techzeta.com", razonSocial: "Tech Zeta SRL", tipo: "SRL", estado: "Activado", fechaRegistro: "01/06/2024", subcuentas: 7 },
  { legajo: "JUR-007", correo: "contacto@alimentoseta.com", razonSocial: "Alimentos Eta SA", tipo: "SA", estado: "Pendiente de aprobación", fechaRegistro: "28/07/2024", subcuentas: 0 },
  { legajo: "JUR-008", correo: "info@industriatheta.com", razonSocial: "Industria Theta SRL", tipo: "SRL", estado: "Activado", fechaRegistro: "15/08/2024", subcuentas: 4 },
  { legajo: "JUR-009", correo: "gerencia@comercioiota.com", razonSocial: "Comercio Iota SA", tipo: "SA", estado: "En progreso", fechaRegistro: "03/09/2024", subcuentas: 1 },
  { legajo: "JUR-010", correo: "admin@transporteskappa.com", razonSocial: "Transportes Kappa SRL", tipo: "SRL", estado: "Registrado", fechaRegistro: "20/10/2024", subcuentas: 0 },
];

const columns: Column<Juridica>[] = [
  { key: "legajo", header: "Legajo" },
  { key: "correo", header: "Correo" },
  { key: "razonSocial", header: "Razón Social" },
  { key: "tipo", header: "Tipo" },
  {
    key: "estado",
    header: "Estado",
    cell: (row) => <Badge tone={toneMap[row.estado] ?? "neutral"}>{row.estado}</Badge>,
  },
  { key: "fechaRegistro", header: "Fecha de registro" },
  { key: "subcuentas", header: "Subcuentas" },
  {
    key: "acciones",
    header: "Acciones",
    cell: () => (
      <div className="flex gap-1">
        <span className="text-xs text-primary cursor-pointer hover:underline">Editar</span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-red-600 cursor-pointer hover:underline">Suspender</span>
      </div>
    ),
  },
];

function JuridicasPage() {
  return (
    <>
      <PageHeader
        title="Personas jurídicas"
        description="Empresas y organizaciones registradas en la plataforma."
        action={
          <BtnOutline>
            <Download size={16} />
            Descargar CSV
          </BtnOutline>
        }
      />
      <DataTable columns={columns} data={data} />
    </>
  );
}
