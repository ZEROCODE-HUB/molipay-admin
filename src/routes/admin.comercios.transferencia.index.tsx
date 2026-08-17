import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Eye, Edit3, CheckCircle, XCircle, FileCheck, Trash2, X } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Badge, Card, BtnOutline, Input, Label } from "@/components/portal-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { useComercios } from "@/contexts/comercios";
import { type EstadoGeneral, type NivelComercio } from "@/data/comercios";

export const Route = createFileRoute("/admin/comercios/transferencia/")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Comercios — Pagos con transferencia — Admin Molly" },
      {
        name: "description",
        content: "Gestión de comercios habilitados para pagos con transferencia.",
      },
    ],
  }),
});

type PuntoVenta = {
  nombre: string;
  estado: "Activado" | "Desactivado";
  fechaCreacion: string;
};

type Comercio = {
  id: number;
  legajo: string;
  usuario: string;
  categoria: string;
  descripcionCategoria: string;
  estado: EstadoGeneral;
  nivel: NivelComercio;
  fechaCreacion: string;
  horaCreacion: string;
  puntosDeVenta: PuntoVenta[];
};

const ESTADOS: EstadoGeneral[] = [
  "Activado",
  "Desactivado",
  "Pendiente de aprobación",
  "Rechazado",
  "Suspendido",
];

const NIVELES: NivelComercio[] = [
  "Pequeño",
  "Mediano",
  "Grande",
  "Premium",
  "Estándar",
  "Básico",
  "Enterprise",
];

function estadoBadgeTone(estado: EstadoGeneral): "success" | "neutral" | "warn" | "danger" {
  if (estado === "Activado") return "success";
  if (estado === "Desactivado") return "neutral";
  if (estado === "Rechazado") return "danger";
  return "warn";
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}

function ComercioModal({ comercio, onClose }: { comercio: Comercio; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display text-lg font-semibold">Detalle de comercio</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {comercio.usuario} · {comercio.legajo}
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
              <Field label="Usuario" value={comercio.usuario} />
              <Field
                label="Legajo"
                value={<span className="font-mono tabular-nums">{comercio.legajo}</span>}
              />
              <Field label="Fecha de creación" value={comercio.fechaCreacion} />
              <Field label="Hora de creación" value={comercio.horaCreacion} />
              <Field
                label="Estado"
                value={<Badge tone={estadoBadgeTone(comercio.estado)}>{comercio.estado}</Badge>}
              />
              <Field label="Nivel" value={comercio.nivel} />
            </div>
          </Card>

          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Código de categoría
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <Field
                label="Código de categoría"
                value={<span className="font-mono tabular-nums">{comercio.categoria}</span>}
              />
              <Field label="Descripción" value={comercio.descripcionCategoria} />
            </div>
          </Card>

          <Card className="p-0">
            <div className="px-5 pt-5 pb-1">
              <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Puntos de venta
              </h4>
            </div>
            {comercio.puntosDeVenta.length === 0 ? (
              <div className="px-5 pb-5 pt-3">
                <div className="border border-dashed rounded-lg py-8 text-center text-sm text-muted-foreground">
                  Sin puntos de venta cargados para este comercio.
                </div>
              </div>
            ) : (
              <div className="p-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="px-3 py-2.5 font-display font-semibold text-foreground">
                        Nombre del punto de venta
                      </th>
                      <th className="px-3 py-2.5 font-display font-semibold text-foreground">
                        Estado
                      </th>
                      <th className="px-3 py-2.5 font-display font-semibold text-foreground">
                        Fecha de creación
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comercio.puntosDeVenta.map((pdv) => (
                      <tr key={pdv.nombre} className="border-b last:border-0">
                        <td className="px-3 py-2.5 font-medium">{pdv.nombre}</td>
                        <td className="px-3 py-2.5">
                          <Badge tone={pdv.estado === "Activado" ? "success" : "neutral"}>
                            {pdv.estado}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono tabular-nums text-xs">
                            {pdv.fechaCreacion}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

function ComercioFormModal({
  comercio,
  onClose,
  onSave,
}: {
  comercio: Comercio;
  onClose: () => void;
  onSave: (updated: Comercio) => void;
}) {
  const [form, setForm] = useState({
    usuario: comercio.usuario,
    legajo: comercio.legajo,
    categoria: comercio.categoria,
    descripcionCategoria: comercio.descripcionCategoria,
    estado: comercio.estado,
    nivel: comercio.nivel,
  });

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Editar comercio"
      description={`Modificá los datos del comercio ${comercio.usuario}.`}
      onSubmit={() =>
        onSave({
          ...comercio,
          usuario: form.usuario,
          legajo: form.legajo,
          categoria: form.categoria,
          descripcionCategoria: form.descripcionCategoria,
          estado: form.estado,
          nivel: form.nivel,
        })
      }
      submitLabel="Guardar cambios"
      size="lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="com-usuario">Usuario</Label>
          <Input
            id="com-usuario"
            value={form.usuario}
            onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="com-legajo">Legajo</Label>
          <Input
            id="com-legajo"
            value={form.legajo}
            onChange={(e) => setForm((f) => ({ ...f, legajo: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="com-categoria">Código de categoría</Label>
          <Input
            id="com-categoria"
            value={form.categoria}
            onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="com-desc">Descripción de categoría</Label>
          <Input
            id="com-desc"
            value={form.descripcionCategoria}
            onChange={(e) => setForm((f) => ({ ...f, descripcionCategoria: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="com-estado">Estado</Label>
          <select
            id="com-estado"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={form.estado}
            onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoGeneral }))}
          >
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="com-nivel">Nivel</Label>
          <select
            id="com-nivel"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={form.nivel}
            onChange={(e) => setForm((f) => ({ ...f, nivel: e.target.value as NivelComercio }))}
          >
            {NIVELES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
    </FormDialog>
  );
}

function Page() {
  const { comercios, guardarComercio, eliminarComercio, setEstadoGeneral } = useComercios();
  const [detail, setDetail] = useState<Comercio | null>(null);
  const [editTarget, setEditTarget] = useState<Comercio | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Comercio | null>(null);

  const data: Comercio[] = comercios
    .filter((c) => c.pctHabilitado)
    .map((c) => ({
      id: c.id,
      legajo: c.legajo,
      usuario: c.usuario,
      categoria: c.categoria,
      descripcionCategoria: c.descripcionCategoria,
      estado: c.estado,
      nivel: c.nivel,
      fechaCreacion: c.fechaRegistro,
      horaCreacion: c.horaRegistro,
      puntosDeVenta: c.pctPuntosDeVenta,
    }));

  const guardarEdicion = (updated: Comercio) => {
    const original = comercios.find((c) => c.id === updated.id);
    if (!original) return;
    guardarComercio({
      ...original,
      categoria: updated.categoria,
      descripcionCategoria: updated.descripcionCategoria,
      estado: updated.estado,
      nivel: updated.nivel,
      pctPuntosDeVenta: updated.puntosDeVenta,
    });
    setEditTarget(null);
  };

  const getActions = (r: Comercio): ActionItem[] => [
    { label: "Activar", icon: CheckCircle, onClick: () => setEstadoGeneral(r.id, "Activado") },
    {
      label: "Suspender",
      icon: XCircle,
      variant: "danger",
      onClick: () => setEstadoGeneral(r.id, "Suspendido"),
    },
    { label: "Validar", icon: FileCheck, onClick: () => setEstadoGeneral(r.id, "Activado") },
    { label: "Eliminar", icon: Trash2, variant: "danger", onClick: () => setConfirmDelete(r) },
    { label: "Editar", icon: Edit3, onClick: () => setEditTarget(r) },
    { label: "Ver comercio", icon: Eye, onClick: () => setDetail(r) },
  ];

  const columns: Column<Comercio>[] = [
    {
      key: "usuario",
      label: "Usuario",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-semibold">{r.usuario}</span>,
    },
    {
      key: "legajo",
      label: "Legajo",
      sortable: true,
      filterable: true,
      render: (r) => <span className="text-xs text-muted-foreground font-mono">{r.legajo}</span>,
    },
    {
      key: "categoria",
      label: "Categoría",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.categoria}</span>,
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
      key: "nivel",
      label: "Nivel",
      sortable: true,
      filterable: "enum",
      filterOptions: NIVELES,
      render: (r) => r.nivel,
    },
  ];

  return (
    <>
      <PageHeader
        title="Comercios"
        description="Gestión de comercios habilitados para pagos con transferencia (PCT)."
      />
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        pageSize={10}
        showEnumAllOption={false}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />
      {detail && <ComercioModal comercio={detail} onClose={() => setDetail(null)} />}
      {editTarget && (
        <ComercioFormModal
          comercio={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={guardarEdicion}
        />
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar comercio"
        message={`¿Estás seguro de eliminar el comercio "${confirmDelete?.usuario}"? Esta acción no se puede deshacer.`}
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
