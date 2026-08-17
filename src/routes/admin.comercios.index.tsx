import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Eye, Edit3, CheckCircle, XCircle, Trash2, Plus, CreditCard, Link2, X } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import {
  PageHeader,
  Badge,
  Card,
  BtnOutline,
  BtnPrimary,
  Input,
  Label,
} from "@/components/portal-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { useComercios } from "@/contexts/comercios";
import {
  type Comercio,
  type EstadoGeneral,
  type NivelComercio,
  type PuntoVenta,
} from "@/data/comercios";

export const Route = createFileRoute("/admin/comercios/")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Gestión de comercios — Admin — Moli" },
      {
        name: "description",
        content:
          "Gestión centralizada de comercios y su asociación a los canales de la plataforma.",
      },
    ],
  }),
});

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

function canalBadge(habilitado: boolean) {
  return habilitado ? <Badge tone="success">Sí</Badge> : <Badge tone="neutral">No</Badge>;
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
              <Field label="Nombre" value={comercio.nombre} />
              <Field
                label="Código de categoría"
                value={<span className="font-mono tabular-nums">{comercio.categoria}</span>}
              />
              <Field label="Descripción de categoría" value={comercio.descripcionCategoria} />
              <Field label="Nivel" value={comercio.nivel} />
              <Field
                label="Estado"
                value={<Badge tone={estadoBadgeTone(comercio.estado)}>{comercio.estado}</Badge>}
              />
              <Field label="Fecha de registro" value={comercio.fechaRegistro} />
              <Field label="Hora de registro" value={comercio.horaRegistro} />
            </div>
          </Card>

          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Canales
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                  <CreditCard size={14} /> Pago con transferencia
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {canalBadge(comercio.pctHabilitado)}
                  {comercio.pctHabilitado && <span className="text-sm">Asociado</span>}
                </div>
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                  <Link2 size={14} /> Link de pago
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {canalBadge(comercio.linkPagoHabilitado)}
                  {comercio.linkPagoHabilitado && (
                    <span className="text-sm text-muted-foreground">{comercio.linkPagoEstado}</span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-0">
            <div className="px-5 pt-5 pb-1">
              <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Puntos de venta (PCT)
              </h4>
            </div>
            {!comercio.pctHabilitado ? (
              <div className="px-5 pb-5 pt-3">
                <div className="border border-dashed rounded-lg py-8 text-center text-sm text-muted-foreground">
                  El comercio no está asociado al canal Pago con transferencia.
                </div>
              </div>
            ) : comercio.pctPuntosDeVenta.length === 0 ? (
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
                    {comercio.pctPuntosDeVenta.map((pdv) => (
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

type ComercioForm = {
  legajo: string;
  usuario: string;
  nombre: string;
  categoria: string;
  descripcionCategoria: string;
  nivel: NivelComercio;
  estado: EstadoGeneral;
  pctHabilitado: boolean;
  linkPagoHabilitado: boolean;
};

function ComercioFormModal({
  comercio,
  onClose,
  onSave,
}: {
  comercio: Comercio | null;
  onClose: () => void;
  onSave: (comercio: Comercio) => void;
}) {
  const [form, setForm] = useState<ComercioForm>({
    legajo: comercio?.legajo ?? "",
    usuario: comercio?.usuario ?? "",
    nombre: comercio?.nombre ?? "",
    categoria: comercio?.categoria ?? "",
    descripcionCategoria: comercio?.descripcionCategoria ?? "",
    nivel: comercio?.nivel ?? "Pequeño",
    estado: comercio?.estado ?? "Pendiente de aprobación",
    pctHabilitado: comercio?.pctHabilitado ?? false,
    linkPagoHabilitado: comercio?.linkPagoHabilitado ?? false,
  });

  return (
    <FormDialog
      open
      onClose={onClose}
      title={comercio ? "Editar comercio" : "Nuevo comercio"}
      description={
        comercio
          ? `Modificá los datos del comercio ${comercio.nombre}.`
          : "Definí los datos del comercio y a qué canales lo asociás."
      }
      onSubmit={() =>
        onSave({
          id: comercio?.id ?? 0,
          legajo: form.legajo.trim(),
          usuario: form.usuario.trim(),
          nombre: form.nombre.trim(),
          categoria: form.categoria.trim(),
          descripcionCategoria: form.descripcionCategoria.trim(),
          nivel: form.nivel,
          estado: form.estado,
          fechaRegistro: comercio?.fechaRegistro ?? new Date().toLocaleDateString("es-AR"),
          horaRegistro:
            comercio?.horaRegistro ??
            new Date().toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          pctHabilitado: form.pctHabilitado,
          pctPuntosDeVenta: comercio?.pctPuntosDeVenta ?? [],
          linkPagoHabilitado: form.linkPagoHabilitado,
          linkPagoEstado:
            comercio?.linkPagoEstado ??
            (form.linkPagoHabilitado ? "Pendiente de aprobación" : "No asociado"),
          linkPagoMetodos: comercio?.linkPagoMetodos ?? [],
        })
      }
      submitLabel={comercio ? "Guardar cambios" : "Crear comercio"}
      size="lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="gc-legajo">Legajo</Label>
          <Input
            id="gc-legajo"
            value={form.legajo}
            onChange={(e) => setForm((f) => ({ ...f, legajo: e.target.value }))}
            placeholder="COM-1001"
          />
        </div>
        <div>
          <Label htmlFor="gc-usuario">Usuario</Label>
          <Input
            id="gc-usuario"
            value={form.usuario}
            onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
            placeholder="email@dominio.com"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="gc-nombre">Nombre</Label>
          <Input
            id="gc-nombre"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            placeholder="Nombre del comercio"
          />
        </div>
        <div>
          <Label htmlFor="gc-categoria">Código de categoría</Label>
          <Input
            id="gc-categoria"
            value={form.categoria}
            onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
            placeholder="Ej: 780"
          />
        </div>
        <div>
          <Label htmlFor="gc-nivel">Nivel</Label>
          <select
            id="gc-nivel"
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
        <div className="sm:col-span-2">
          <Label htmlFor="gc-desc">Descripción de categoría</Label>
          <Input
            id="gc-desc"
            value={form.descripcionCategoria}
            onChange={(e) => setForm((f) => ({ ...f, descripcionCategoria: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="gc-estado">Estado</Label>
          <select
            id="gc-estado"
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
          <Label htmlFor="gc-pct">Pago con transferencia</Label>
          <select
            id="gc-pct"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={form.pctHabilitado ? "true" : "false"}
            onChange={(e) => setForm((f) => ({ ...f, pctHabilitado: e.target.value === "true" }))}
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <Label htmlFor="gc-link">Link de pago</Label>
          <select
            id="gc-link"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={form.linkPagoHabilitado ? "true" : "false"}
            onChange={(e) =>
              setForm((f) => ({ ...f, linkPagoHabilitado: e.target.value === "true" }))
            }
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>
      </div>
    </FormDialog>
  );
}

function Page() {
  const {
    comercios,
    guardarComercio,
    eliminarComercio,
    setEstadoGeneral,
    togglePct,
    toggleLinkPago,
  } = useComercios();
  const [detail, setDetail] = useState<Comercio | null>(null);
  const [editTarget, setEditTarget] = useState<Comercio | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Comercio | null>(null);

  const getActions = (r: Comercio): ActionItem[] => {
    const items: ActionItem[] = [];
    if (r.pctHabilitado) {
      items.push({
        label: "Desasociar de PCT",
        icon: CreditCard,
        variant: "danger",
        onClick: () => togglePct(r.id),
      });
    } else {
      items.push({ label: "Asociar a PCT", icon: CreditCard, onClick: () => togglePct(r.id) });
    }
    if (r.linkPagoHabilitado) {
      items.push({
        label: "Desasociar de Link de pago",
        icon: Link2,
        variant: "danger",
        onClick: () => toggleLinkPago(r.id),
      });
    } else {
      items.push({
        label: "Asociar a Link de pago",
        icon: Link2,
        onClick: () => toggleLinkPago(r.id),
      });
    }
    if (r.estado === "Activado") {
      items.push({
        label: "Suspender",
        icon: XCircle,
        variant: "danger",
        onClick: () => setEstadoGeneral(r.id, "Suspendido"),
      });
    } else {
      items.push({
        label: "Activar",
        icon: CheckCircle,
        onClick: () => setEstadoGeneral(r.id, "Activado"),
      });
    }
    items.push({ label: "Editar", icon: Edit3, onClick: () => setEditTarget(r) });
    items.push({ label: "Ver detalle", icon: Eye, onClick: () => setDetail(r) });
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
      key: "usuario",
      label: "Usuario",
      sortable: true,
      filterable: true,
      render: (r) => (
        <div>
          <div className="font-semibold">{r.usuario}</div>
          <div className="text-xs text-muted-foreground font-mono">{r.legajo}</div>
        </div>
      ),
    },
    {
      key: "nombre",
      label: "Nombre",
      sortable: true,
      filterable: true,
      render: (r) => r.nombre,
    },
    {
      key: "categoria",
      label: "Categoría",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.categoria}</span>,
    },
    {
      key: "nivel",
      label: "Nivel",
      sortable: true,
      filterable: "enum",
      filterOptions: NIVELES,
      render: (r) => r.nivel,
    },
    {
      key: "pctHabilitado",
      label: "PCT",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Sí", "No"],
      render: (r) => canalBadge(r.pctHabilitado),
    },
    {
      key: "linkPagoHabilitado",
      label: "Link de pago",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Sí", "No"],
      render: (r) => canalBadge(r.linkPagoHabilitado),
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
      key: "fechaRegistro",
      label: "Registro",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.fechaRegistro}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Gestión de comercios"
        description="Listado centralizado de comercios de la plataforma y su asociación a los canales PCT y Link de pago."
        action={
          <BtnPrimary type="button" onClick={() => setShowNew(true)}>
            <Plus size={14} /> Nuevo comercio
          </BtnPrimary>
        }
      />
      <DataTable
        columns={columns}
        data={comercios}
        keyExtractor={(r) => r.id}
        pageSize={10}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />
      {detail && <ComercioModal comercio={detail} onClose={() => setDetail(null)} />}
      {(showNew || editTarget) && (
        <ComercioFormModal
          comercio={editTarget}
          onClose={() => {
            setShowNew(false);
            setEditTarget(null);
          }}
          onSave={guardarComercio}
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
