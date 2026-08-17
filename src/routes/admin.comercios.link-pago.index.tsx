import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle, Edit3, Plus, Trash2, XCircle } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Badge, BtnPrimary, Input, Label } from "@/components/portal-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { useComercios } from "@/contexts/comercios";
import { type LinkPagoEstado } from "@/data/comercios";

export const Route = createFileRoute("/admin/comercios/link-pago/")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Comercios — Link de pago — Admin — Moli" },
      {
        name: "description",
        content: "Gestión de comercios habilitados para link de pago.",
      },
    ],
  }),
});

type EstadoComercio = LinkPagoEstado;

type Comercio = {
  id: number;
  legajo: string;
  usuario: string;
  nombre: string;
  estado: EstadoComercio;
  registro: string;
};

const ESTADOS: EstadoComercio[] = ["Pendiente de aprobación", "Activado", "Suspendido"];

function estadoBadgeTone(estado: EstadoComercio): "success" | "neutral" | "warn" {
  if (estado === "Activado") return "success";
  if (estado === "Suspendido") return "neutral";
  return "warn";
}

function hoy() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function ComercioFormModal({
  comercio,
  nextId,
  onClose,
  onSave,
}: {
  comercio: Comercio | null;
  nextId: number;
  onClose: () => void;
  onSave: (comercio: Comercio) => void;
}) {
  const [form, setForm] = useState({
    legajo: comercio?.legajo ?? `COM-${1000 + nextId}`,
    usuario: comercio?.usuario ?? "",
    nombre: comercio?.nombre ?? "",
    estado: (comercio?.estado ?? "Pendiente de aprobación") as EstadoComercio,
  });

  return (
    <FormDialog
      open
      onClose={onClose}
      title={comercio ? "Editar comercio" : "Crear comercio"}
      description={
        comercio
          ? `Modificá los datos del comercio ${comercio.nombre}.`
          : "Complete los datos para crear un nuevo comercio de link de pago."
      }
      onSubmit={() =>
        onSave({
          id: comercio?.id ?? 0,
          legajo: form.legajo.trim(),
          usuario: form.usuario.trim(),
          nombre: form.nombre.trim(),
          estado: form.estado,
          registro: comercio?.registro ?? hoy(),
        })
      }
      submitLabel={comercio ? "Guardar cambios" : "Crear comercio"}
      size="lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lp-legajo">Legajo</Label>
          <Input
            id="lp-legajo"
            value={form.legajo}
            onChange={(e) => setForm((f) => ({ ...f, legajo: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="lp-usuario">Usuario</Label>
          <Input
            id="lp-usuario"
            value={form.usuario}
            onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
            placeholder="email@dominio.com"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="lp-nombre">Nombre</Label>
          <Input
            id="lp-nombre"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            placeholder="Nombre del comercio"
          />
        </div>
        <div>
          <Label htmlFor="lp-estado">Estado</Label>
          <select
            id="lp-estado"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={form.estado}
            onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoComercio }))}
          >
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
      </div>
    </FormDialog>
  );
}

function Page() {
  const { comercios, guardarComercio, eliminarComercio, setLinkPagoEstado } = useComercios();
  const [editTarget, setEditTarget] = useState<Comercio | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Comercio | null>(null);

  const data: Comercio[] = comercios
    .filter((c) => c.linkPagoHabilitado)
    .map((c) => ({
      id: c.id,
      legajo: c.legajo,
      usuario: c.usuario,
      nombre: c.nombre,
      estado: c.linkPagoEstado,
      registro: c.fechaRegistro,
    }));

  const setEstado = (id: number, estado: EstadoComercio) => {
    setLinkPagoEstado(id, estado);
  };

  const getActions = (r: Comercio): ActionItem[] => {
    const items: ActionItem[] = [{ label: "Editar", icon: Edit3, onClick: () => setEditTarget(r) }];
    if (r.estado === "Pendiente de aprobación") {
      items.push({
        label: "Aprobar",
        icon: CheckCircle,
        onClick: () => setEstado(r.id, "Activado"),
      });
    } else if (r.estado === "Activado") {
      items.push({
        label: "Suspender",
        icon: XCircle,
        variant: "danger",
        onClick: () => setEstado(r.id, "Suspendido"),
      });
    }
    items.push({
      label: "Eliminar",
      icon: Trash2,
      variant: "danger",
      onClick: () => setConfirmDelete(r),
    });
    return items;
  };

  const columns: Column<Comercio>[] = [
    {
      key: "legajo",
      label: "Legajo",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.legajo}</span>,
    },
    {
      key: "usuario",
      label: "Usuario",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-semibold">{r.usuario}</span>,
    },
    {
      key: "nombre",
      label: "Nombre",
      sortable: true,
      filterable: true,
      render: (r) => r.nombre,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      filterable: "enum",
      filterOptions: ESTADOS,
      render: (r) => <Badge tone={estadoBadgeTone(r.estado)}>{r.estado}</Badge>,
    },
    {
      key: "registro",
      label: "Registro",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.registro}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Comercios"
        description="Gestión de comercios habilitados para link de pago."
        action={
          <BtnPrimary type="button" onClick={() => setShowNew(true)}>
            <Plus size={14} /> Agregar método de comercios
          </BtnPrimary>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        pageSize={10}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />
      {(showNew || editTarget) && (
        <ComercioFormModal
          comercio={editTarget}
          nextId={Math.max(0, ...comercios.map((d) => d.id)) + 1}
          onClose={() => {
            setShowNew(false);
            setEditTarget(null);
          }}
          onSave={(c) => {
            if (editTarget) {
              const original = comercios.find((d) => d.id === c.id);
              if (original) {
                guardarComercio({
                  ...original,
                  legajo: c.legajo,
                  usuario: c.usuario,
                  nombre: c.nombre,
                  linkPagoEstado: c.estado,
                });
              }
            } else {
              guardarComercio({
                id: 0,
                legajo: c.legajo,
                usuario: c.usuario,
                nombre: c.nombre,
                categoria: "",
                descripcionCategoria: "",
                nivel: "Estándar",
                estado: "Pendiente de aprobación",
                fechaRegistro: c.registro,
                horaRegistro: "",
                pctHabilitado: false,
                pctPuntosDeVenta: [],
                linkPagoHabilitado: true,
                linkPagoEstado: c.estado,
              });
            }
            setShowNew(false);
            setEditTarget(null);
          }}
        />
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar comercio"
        message={`¿Estás seguro de eliminar el comercio "${confirmDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete) eliminarComercio(confirmDelete.id);
          setConfirmDelete(null);
        }}
      />
    </>
  );
}
