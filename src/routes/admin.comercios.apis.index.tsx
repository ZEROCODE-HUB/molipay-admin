import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, FileCheck, PauseCircle, Power, Trash2, X } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Badge, BtnOutline, Card } from "@/components/portal-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";

export const Route = createFileRoute("/admin/comercios/apis/")({
  component: Page,
  head: () => ({
    meta: [{ title: "APIs externas — Usuarios — Admin — Moli" }],
  }),
});

type EstadoIntegracion =
  "Pendiente Validación" | "Homologación" | "Producción" | "Suspendido" | "Deshabilitado";

type ApiUsuario = {
  id: number;
  legajo: string;
  usuario: string;
  nombreCompleto: string;
  estado: EstadoIntegracion;
  fechaCreacion: string;
};

const ESTADOS: EstadoIntegracion[] = [
  "Pendiente Validación",
  "Homologación",
  "Producción",
  "Suspendido",
  "Deshabilitado",
];

const dataInicial: ApiUsuario[] = [
  {
    id: 1,
    legajo: "1001",
    usuario: "afip@molipay.com.ar",
    nombreCompleto: "Integración AFIP",
    estado: "Producción",
    fechaCreacion: "2026-01-10 09:15",
  },
  {
    id: 2,
    legajo: "1002",
    usuario: "bcra@molipay.com.ar",
    nombreCompleto: "Integración BCRA",
    estado: "Producción",
    fechaCreacion: "2026-01-12 11:40",
  },
  {
    id: 3,
    legajo: "1003",
    usuario: "arca@molipay.com.ar",
    nombreCompleto: "Integración ARCA",
    estado: "Homologación",
    fechaCreacion: "2026-02-03 15:20",
  },
  {
    id: 4,
    legajo: "1004",
    usuario: "renaper@molipay.com.ar",
    nombreCompleto: "Integración Renaper",
    estado: "Pendiente Validación",
    fechaCreacion: "2026-03-14 10:05",
  },
  {
    id: 5,
    legajo: "1005",
    usuario: "uif@molipay.com.ar",
    nombreCompleto: "Integración UIF",
    estado: "Suspendido",
    fechaCreacion: "2026-04-02 08:30",
  },
  {
    id: 6,
    legajo: "1006",
    usuario: "bna@molipay.com.ar",
    nombreCompleto: "Integración Banco Nación",
    estado: "Deshabilitado",
    fechaCreacion: "2026-04-20 13:45",
  },
  {
    id: 7,
    legajo: "1007",
    usuario: "mercado.pago@molipay.com.ar",
    nombreCompleto: "Integración Mercado Pago",
    estado: "Producción",
    fechaCreacion: "2026-05-08 09:50",
  },
  {
    id: 8,
    legajo: "1008",
    usuario: "nosis@molipay.com.ar",
    nombreCompleto: "Integración Nosis",
    estado: "Pendiente Validación",
    fechaCreacion: "2026-06-01 16:10",
  },
];

function estadoTone(estado: EstadoIntegracion): "success" | "neutral" | "warn" | "danger" {
  if (estado === "Producción") return "success";
  if (estado === "Suspendido" || estado === "Deshabilitado") return "danger";
  if (estado === "Homologación") return "warn";
  return "neutral";
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}

function DetalleModal({ usr, onClose }: { usr: ApiUsuario; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display text-lg font-semibold">Detalle de integración</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {usr.usuario} · Legajo {usr.legajo}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Información general
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Legajo" value={usr.legajo} />
              <Field label="Usuario" value={usr.usuario} />
              <Field label="Nombre completo" value={usr.nombreCompleto} />
              <Field label="Estado" value={usr.estado} />
              <Field label="Fecha de creación" value={usr.fechaCreacion} />
            </div>
          </Card>
        </div>
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-end">
          <BtnOutline type="button" onClick={onClose}>
            Cerrar
          </BtnOutline>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const [data, setData] = useState<ApiUsuario[]>(dataInicial);
  const [detail, setDetail] = useState<ApiUsuario | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ApiUsuario | null>(null);

  const setEstado = (id: number, estado: EstadoIntegracion) => {
    setData((prev) => prev.map((u) => (u.id === id ? { ...u, estado } : u)));
  };

  const getActions = (r: ApiUsuario): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetail(r) },
    {
      label: "Validar",
      icon: FileCheck,
      onClick: () => setEstado(r.id, "Homologación"),
    },
    {
      label: "Suspender",
      icon: PauseCircle,
      variant: "danger",
      onClick: () => setEstado(r.id, "Suspendido"),
    },
    { label: "Activar", icon: Power, onClick: () => setEstado(r.id, "Producción") },
    { label: "Eliminar", icon: Trash2, variant: "danger", onClick: () => setConfirmDelete(r) },
  ];

  const columns: Column<ApiUsuario>[] = [
    {
      key: "legajo",
      label: "Legajo",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums text-xs">#{r.legajo}</span>,
    },
    {
      key: "usuario",
      label: "Usuario",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-medium">{r.usuario}</span>,
    },
    {
      key: "nombreCompleto",
      label: "Nombre completo",
      sortable: true,
      filterable: true,
      render: (r) => r.nombreCompleto,
    },
    {
      key: "estado",
      label: "Estado de la integración",
      sortable: true,
      filterable: "enum",
      filterOptions: ESTADOS,
      render: (r) => <Badge tone={estadoTone(r.estado)}>{r.estado}</Badge>,
    },
    {
      key: "fechaCreacion",
      label: "Fecha de creación",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.fechaCreacion}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Usuarios de API"
        description="Usuarios con acceso a las APIs externas de la plataforma."
      />
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        pageSize={10}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />
      {detail && <DetalleModal usr={detail} onClose={() => setDetail(null)} />}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar usuario de API"
        message={`¿Estás seguro de eliminar al usuario "${confirmDelete?.usuario}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete) setData((prev) => prev.filter((u) => u.id !== confirmDelete.id));
          setConfirmDelete(null);
        }}
      />
    </>
  );
}
