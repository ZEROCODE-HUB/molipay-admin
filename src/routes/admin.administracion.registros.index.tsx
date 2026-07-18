import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge, Input } from "@/components/portal-shell";

type Fondo = { usuario: string; email: string; cuenta: string; tipo: string; saldo: string; estado: string; alerta?: string };

const mock: Fondo[] = [
  { usuario: "Juan Pérez", email: "jperez@empresa.com", cuenta: "CUENTA MADRE", tipo: "Principal", saldo: "$ 1,250,000.00", estado: "Activo" },
  { usuario: "Juan Pérez", email: "jperez@empresa.com", cuenta: "Subcuenta Operativa", tipo: "Operativa", saldo: "$ 340,000.00", estado: "Activo" },
  { usuario: "Juan Pérez", email: "jperez@empresa.com", cuenta: "Subcuenta Recaudación", tipo: "Recaudación", saldo: "$ 890,000.00", estado: "Activo" },
  { usuario: "María García", email: "mgarcia@corp.com", cuenta: "CUENTA MADRE", tipo: "Principal", saldo: "$ 2,100,000.00", estado: "Activo" },
  { usuario: "María García", email: "mgarcia@corp.com", cuenta: "Subcuenta Sueldos", tipo: "Operativa", saldo: "$ 450,000.00", estado: "Activo" },
  { usuario: "Carlos Martínez", email: "carlosm@firma.com", cuenta: "CUENTA MADRE", tipo: "Principal", saldo: "$ 520,000.00", estado: "Activo", alerta: "Diferencia vs banco: -$12,000" },
  { usuario: "Ana López", email: "analopez@sa.com", cuenta: "CUENTA MADRE", tipo: "Principal", saldo: "$ 3,400,000.00", estado: "Activo" },
  { usuario: "Roberto Díaz", email: "robertod@com.com", cuenta: "CUENTA MADRE", tipo: "Principal", saldo: "$ 180,000.00", estado: "Suspendido" },
];

export const Route = createFileRoute("/admin/administracion/registros/")({
  head: () => ({ meta: [{ title: "Fondos por usuario — Admin Panel" }] }),
  component: Page,
});

function Page() {
  const [search, setSearch] = useState("");

  const filtered = search ? mock.filter((r) => r.usuario.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase())) : mock;

  const getActions = (r: Fondo): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => {} },
  ];

  const columns: Column<Fondo>[] = [
    { key: "usuario", label: "Usuario", sortable: true, filterable: true, render: (r) => <span className="font-semibold">{r.usuario}</span> },
    { key: "email", label: "Email", filterable: true, render: (r) => r.email },
    { key: "cuenta", label: "Cuenta", sortable: true, filterable: true, render: (r) => <span className={r.cuenta === "CUENTA MADRE" ? "font-semibold" : ""}>{r.cuenta}</span> },
    { key: "tipo", label: "Tipo", filterable: true, render: (r) => r.tipo },
    { key: "saldo", label: "Saldo", sortable: true, render: (r) => <span className="font-semibold font-mono text-xs">{r.saldo}</span> },
    { key: "estado", label: "Estado", filterable: true, render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "danger"}>{r.estado}</Badge> },
  ];

  return (
    <>
      <PageHeader title="Fondos por usuario" description="Incluye subcuentas por usuario" action={
        <button className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-input text-sm font-semibold hover:bg-muted"><Download size={14} /> Descargar lista de fondos</button>
      } />
      <div className="mb-4 max-w-sm">
        <Input placeholder="Buscar por email o usuario..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(r) => r.usuario + r.cuenta}
        pageSize={10}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />
    </>
  );
}
