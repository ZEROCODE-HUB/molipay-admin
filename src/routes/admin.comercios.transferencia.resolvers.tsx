import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle, XCircle, Edit3, Trash2, Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Badge, Input, Label } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";

export const Route = createFileRoute("/admin/comercios/transferencia/resolvers")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Resolvers — Pagos con transferencia — Admin Molly" },
      { name: "description", content: "Gestión de resolvers PCT (pagos con transferencia)." },
    ],
  }),
});

type Resolver = {
  id: number;
  nombre: string;
  cuit: string;
  url: string;
  estado: "Activo" | "Inactivo";
  nombreReverso: string;
  formatoWeb: string;
  pcpId: string;
  idPcp: string;
  token: string;
  asHeader: boolean;
  soa: boolean;
};

type ResolverForm = {
  cuit: string;
  nombre: string;
  nombreReverso: string;
  formatoWeb: string;
  pcpId: string;
  idPcp: string;
  url: string;
  token: string;
  asHeader: boolean;
  soa: boolean;
};

const dataInicial: Resolver[] = [
  {
    id: 1,
    nombre: "Resolver AFIP",
    cuit: "30-70123456-8",
    url: "https://servicios1.afip.gob.ar/genericos/calcular",
    estado: "Activo",
    nombreReverso: "FIPA resolver nihev",
    formatoWeb: "https://webapp.afip.gob.ar",
    pcpId: "PCP-0001",
    idPcp: "0001",
    token: "afip_token_8f3ab2",
    asHeader: true,
    soa: false,
  },
  {
    id: 2,
    nombre: "Resolver BCRA",
    cuit: "30-51234567-9",
    url: "https://integraciones.bcra.gob.ar/estadisticas",
    estado: "Inactivo",
    nombreReverso: "arbc resolver",
    formatoWeb: "https://web.bcra.gob.ar",
    pcpId: "PCP-0002",
    idPcp: "0002",
    token: "bcra_token_c71d4e",
    asHeader: false,
    soa: true,
  },
  {
    id: 3,
    nombre: "Resolver ARCA",
    cuit: "30-12345678-0",
    url: "https://api.arca.gob.ar/recaudacion",
    estado: "Activo",
    nombreReverso: "arcA resolver",
    formatoWeb: "https://servicios.arca.gob.ar",
    pcpId: "PCP-0003",
    idPcp: "0003",
    token: "arca_token_9a1c77",
    asHeader: true,
    soa: true,
  },
  {
    id: 4,
    nombre: "Resolver Banco Nación",
    cuit: "30-98765432-1",
    url: "https://api.bna.com.ar/pagos",
    estado: "Activo",
    nombreReverso: "noicaN orcnaB resolver",
    formatoWeb: "https://homebanking.bna.com.ar",
    pcpId: "PCP-0004",
    idPcp: "0004",
    token: "bna_token_5d2f91",
    asHeader: false,
    soa: false,
  },
  {
    id: 5,
    nombre: "Resolver Mercado Pago",
    cuit: "30-23123456-7",
    url: "https://api.mercadopago.com/pos/v1/cashout",
    estado: "Inactivo",
    nombreReverso: "ogaP odareceM resolver",
    formatoWeb: "https://www.mercadopago.com.ar",
    pcpId: "PCP-0005",
    idPcp: "0005",
    token: "mp_token_61e3ab",
    asHeader: true,
    soa: false,
  },
];

const ESTADOS = ["Activo", "Inactivo"];

const blankForm: ResolverForm = {
  cuit: "",
  nombre: "",
  nombreReverso: "",
  formatoWeb: "",
  pcpId: "",
  idPcp: "",
  url: "",
  token: "",
  asHeader: false,
  soa: false,
};

function Page() {
  const [data, setData] = useState<Resolver[]>(dataInicial);
  const [editTarget, setEditTarget] = useState<Resolver | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<ResolverForm>(blankForm);
  const [confirmDelete, setConfirmDelete] = useState<Resolver | null>(null);

  const toggleEstado = (id: number, estado: Resolver["estado"]) => {
    setData((prev) => prev.map((d) => (d.id === id ? { ...d, estado } : d)));
  };

  const openNew = () => {
    setEditTarget(null);
    setForm(blankForm);
    setShowNew(true);
  };

  const openEdit = (r: Resolver) => {
    setShowNew(false);
    setEditTarget(r);
    setForm({
      cuit: r.cuit,
      nombre: r.nombre,
      nombreReverso: r.nombreReverso,
      formatoWeb: r.formatoWeb,
      pcpId: r.pcpId,
      idPcp: r.idPcp,
      url: r.url,
      token: r.token,
      asHeader: r.asHeader,
      soa: r.soa,
    });
  };

  const guardar = () => {
    if (!editTarget && (form.nombre.trim() === "" || form.cuit.trim() === "")) return;
    if (editTarget) {
      setData((prev) =>
        prev.map((d) =>
          d.id === editTarget.id
            ? {
                ...d,
                cuit: form.cuit,
                nombre: form.nombre,
                nombreReverso: form.nombreReverso,
                formatoWeb: form.formatoWeb,
                pcpId: form.pcpId,
                idPcp: form.idPcp,
                url: form.url,
                token: form.token,
                asHeader: form.asHeader,
                soa: form.soa,
              }
            : d,
        ),
      );
      setEditTarget(null);
    } else {
      const id = Math.max(0, ...data.map((d) => d.id)) + 1;
      setData((prev) => [
        ...prev,
        {
          id,
          nombre: form.nombre.trim(),
          cuit: form.cuit.trim(),
          nombreReverso: form.nombreReverso.trim(),
          formatoWeb: form.formatoWeb,
          pcpId: form.pcpId.trim(),
          idPcp: form.pcpId.trim(),
          url: form.url.trim(),
          token: form.token.trim(),
          asHeader: form.asHeader,
          soa: form.soa,
          estado: "Activo",
        },
      ]);
    }
    setShowNew(false);
    setForm(blankForm);
  };

  const eliminar = (id: number) => {
    setData((prev) => prev.filter((d) => d.id !== id));
    setConfirmDelete(null);
  };

  const getActions = (r: Resolver): ActionItem[] => [
    { label: "Activar", icon: CheckCircle, onClick: () => toggleEstado(r.id, "Activo") },
    {
      label: "Desactivar",
      icon: XCircle,
      variant: "danger",
      onClick: () => toggleEstado(r.id, "Inactivo"),
    },
    { label: "Editar", icon: Edit3, onClick: () => openEdit(r) },
    { label: "Eliminar", icon: Trash2, variant: "danger", onClick: () => setConfirmDelete(r) },
  ];

  const columns: Column<Resolver>[] = [
    {
      key: "nombre",
      label: "Nombre del resolver",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-semibold">{r.nombre}</span>,
    },
    {
      key: "cuit",
      label: "CUIT del resolver",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.cuit}</span>,
    },
    {
      key: "url",
      label: "URL del resolver",
      sortable: true,
      filterable: true,
      render: (r) => <span className="text-xs font-mono text-foreground/80">{r.url || "—"}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      filterable: "enum",
      filterOptions: ESTADOS,
      render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "neutral"}>{r.estado}</Badge>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Resolvers"
        description="Gestión de resolvers PCT (pagos con transferencia)."
        action={
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            <Plus size={14} /> Nuevo resolver
          </button>
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
        <FormDialog
          open
          onClose={() => {
            setShowNew(false);
            setEditTarget(null);
          }}
          title={editTarget ? "Editar resolver" : "Alta nuevo resolver"}
          description={
            editTarget
              ? `Configuración del resolver "${editTarget.nombre}".`
              : "Complete los datos para crear un nuevo resolver."
          }
          onSubmit={guardar}
          submitLabel={editTarget ? "Guardar cambios" : "Crear resolver"}
          size="lg"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="res-nombre">Nombre</Label>
              <Input
                id="res-nombre"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="res-cuit">CUIT</Label>
              <Input
                id="res-cuit"
                value={form.cuit}
                onChange={(e) => setForm((f) => ({ ...f, cuit: e.target.value }))}
                placeholder="XX-XXXXXXXX-X"
              />
            </div>
            <div>
              <Label htmlFor="res-reverso">Nombre Reverso (formato web)</Label>
              <Input
                id="res-reverso"
                value={form.nombreReverso}
                onChange={(e) => setForm((f) => ({ ...f, nombreReverso: e.target.value }))}
                placeholder="com.ejemplo.app"
              />
            </div>
            <div>
              <Label htmlFor="res-psp-id">PSP ID</Label>
              <Input
                id="res-psp-id"
                value={form.pcpId}
                onChange={(e) => setForm((f) => ({ ...f, pcpId: e.target.value }))}
                placeholder="PCP-XXXX"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="res-url">URL</Label>
              <Input
                id="res-url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Si no se coloca URL, no llevará IEP.
              </p>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="res-token">Token</Label>
              <Input
                id="res-token"
                value={form.token}
                onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="accent-primary h-4 w-4"
                checked={form.asHeader}
                onChange={(e) => setForm((f) => ({ ...f, asHeader: e.target.checked }))}
              />
              AC en Header
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="accent-primary h-4 w-4"
                checked={form.soa}
                onChange={(e) => setForm((f) => ({ ...f, soa: e.target.checked }))}
              />
              Es OAuth
            </label>
          </div>
        </FormDialog>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar resolver"
        message={`¿Estás seguro de eliminar el resolver "${confirmDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete) eliminar(confirmDelete.id);
        }}
      />
    </>
  );
}
