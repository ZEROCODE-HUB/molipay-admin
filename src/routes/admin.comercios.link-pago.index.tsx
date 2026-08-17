import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle, Edit3, Eye, Trash2, X, XCircle } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Badge, BtnOutline, Input, Label } from "@/components/portal-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { useComercios } from "@/contexts/comercios";
import { type LinkPagoEstado } from "@/data/comercios";
import { metodosPagoIniciales, type MetodoPago } from "@/data/metodos-pago";

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
  metodos: MetodoPago[];
};

const ESTADOS: EstadoComercio[] = ["Pendiente de aprobación", "Activado", "Suspendido"];

function estadoBadgeTone(estado: EstadoComercio): "success" | "neutral" | "warn" {
  if (estado === "Activado") return "success";
  if (estado === "Suspendido") return "neutral";
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

function ComercioDetailModal({ comercio, onClose }: { comercio: Comercio; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
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
          <div className="bg-card border border-border rounded-xl p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Información general
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Usuario" value={comercio.usuario} />
              <Field
                label="Legajo"
                value={<span className="font-mono tabular-nums">{comercio.legajo}</span>}
              />
              <Field label="Nombre" value={comercio.nombre} />
              <Field
                label="Estado"
                value={<Badge tone={estadoBadgeTone(comercio.estado)}>{comercio.estado}</Badge>}
              />
              <Field
                label="Registro"
                value={<span className="font-mono tabular-nums">{comercio.registro}</span>}
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Métodos de pago asociados
            </h4>
            {comercio.metodos.length === 0 ? (
              <div className="border border-dashed rounded-lg py-8 text-center text-sm text-muted-foreground">
                Sin métodos de pago asociados para este comercio.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="px-3 py-2.5 font-display font-semibold text-foreground">
                        Nombre
                      </th>
                      <th className="px-3 py-2.5 font-display font-semibold text-foreground">
                        Tipo
                      </th>
                      <th className="px-3 py-2.5 font-display font-semibold text-foreground">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comercio.metodos.map((m) => (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="px-3 py-2.5 font-medium">{m.nombre}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{m.tipo}</td>
                        <td className="px-3 py-2.5">
                          <Badge tone={m.estado === "Activo" ? "success" : "neutral"}>
                            {m.estado}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
  onSave: (comercio: Comercio) => void;
}) {
  const [form, setForm] = useState({
    legajo: comercio.legajo,
    usuario: comercio.usuario,
    nombre: comercio.nombre,
    estado: comercio.estado as EstadoComercio,
  });
  const [metodosSeleccionados, setMetodosSeleccionados] = useState<MetodoPago[]>(comercio.metodos);

  const toggleMetodo = (m: MetodoPago) =>
    setMetodosSeleccionados((prev) =>
      prev.some((x) => x.id === m.id) ? prev.filter((x) => x.id !== m.id) : [...prev, m],
    );

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Editar comercio"
      description={`Modificá los datos del comercio ${comercio.nombre} y sus métodos de pago.`}
      onSubmit={() =>
        onSave({
          id: comercio.id,
          legajo: form.legajo.trim(),
          usuario: form.usuario.trim(),
          nombre: form.nombre.trim(),
          estado: form.estado,
          registro: comercio.registro,
          metodos: metodosSeleccionados,
        })
      }
      submitLabel="Guardar cambios"
      size="lg"
    >
      <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400 px-3.5 py-2.5 text-sm">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <span>
          Se editarán los datos del comercio de manera <strong>universal</strong>, no solo dentro de
          Link de pago.
        </span>
      </div>

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
        <div className="sm:col-span-2">
          <Label htmlFor="lp-metodos">Métodos de pago asociados</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {metodosPagoIniciales.map((m) => {
              const checked = metodosSeleccionados.some((x) => x.id === m.id);
              return (
                <label
                  key={m.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                    checked
                      ? "border-primary bg-primary/5"
                      : "border-input bg-background hover:bg-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMetodo(m)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="font-medium">{m.nombre}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{m.tipo}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </FormDialog>
  );
}

function Page() {
  const { comercios, guardarComercio, eliminarComercio, setLinkPagoEstado } = useComercios();
  const [editTarget, setEditTarget] = useState<Comercio | null>(null);
  const [detail, setDetail] = useState<Comercio | null>(null);
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
      metodos: c.linkPagoMetodos,
    }));

  const setEstado = (id: number, estado: EstadoComercio) => {
    setLinkPagoEstado(id, estado);
  };

  const getActions = (r: Comercio): ActionItem[] => {
    const items: ActionItem[] = [
      { label: "Ver detalles", icon: Eye, onClick: () => setDetail(r) },
      { label: "Editar", icon: Edit3, onClick: () => setEditTarget(r) },
    ];
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
      />
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        pageSize={10}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />
      {detail && <ComercioDetailModal comercio={detail} onClose={() => setDetail(null)} />}
      {editTarget && (
        <ComercioFormModal
          comercio={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(c) => {
            const original = comercios.find((d) => d.id === c.id);
            if (original) {
              guardarComercio({
                ...original,
                legajo: c.legajo,
                usuario: c.usuario,
                nombre: c.nombre,
                linkPagoEstado: c.estado,
                linkPagoMetodos: c.metodos,
              });
            }
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
