import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Edit3, Power, PowerOff, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Badge, Input, Label } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";

export const Route = createFileRoute("/admin/comercios/apis/endpoints")({
  component: Page,
  head: () => ({
    meta: [{ title: "APIs externas — Endpoints — Admin — Moli" }],
  }),
});

type TipoEndpoint = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type GrupoEndpoint =
  "Autenticación" | "Enlaces de pago" | "QR" | "Super Accounts" | "Transfer" | "User" | "Webhooks";

type Endpoint = {
  id: number;
  nombre: string;
  path: string;
  tipo: TipoEndpoint;
  descripcion: string;
  grupo: GrupoEndpoint;
  estado: "Habilitado" | "Deshabilitado";
  rec: string;
};

const TIPOS: TipoEndpoint[] = ["GET", "POST", "PUT", "DELETE", "PATCH"];

const GRUPOS: GrupoEndpoint[] = [
  "Autenticación",
  "Enlaces de pago",
  "QR",
  "Super Accounts",
  "Transfer",
  "User",
  "Webhooks",
];

const dataInicial: Endpoint[] = [
  {
    id: 1,
    nombre: "Login / Out",
    path: "/auth/login",
    tipo: "POST",
    descripcion: "Inicia y cierra sesión de la API.",
    grupo: "Autenticación",
    estado: "Habilitado",
    rec: "REC-001",
  },
  {
    id: 2,
    nombre: "Refresh Token",
    path: "/auth/refresh",
    tipo: "POST",
    descripcion: "Renueva el token de acceso.",
    grupo: "Autenticación",
    estado: "Habilitado",
    rec: "REC-002",
  },
  {
    id: 3,
    nombre: "Cancelar pago",
    path: "/payments/{id}/cancel",
    tipo: "POST",
    descripcion: "Cancela un pago pendiente.",
    grupo: "Enlaces de pago",
    estado: "Habilitado",
    rec: "REC-003",
  },
  {
    id: 4,
    nombre: "Crear link de pago",
    path: "/payment-links",
    tipo: "POST",
    descripcion: "Crea un nuevo link de pago.",
    grupo: "Enlaces de pago",
    estado: "Habilitado",
    rec: "REC-004",
  },
  {
    id: 5,
    nombre: "Detalle del link de pago",
    path: "/payment-links/{id}",
    tipo: "GET",
    descripcion: "Obtiene el detalle de un link de pago.",
    grupo: "Enlaces de pago",
    estado: "Habilitado",
    rec: "REC-005",
  },
  {
    id: 6,
    nombre: "Eliminar link de pago",
    path: "/payment-links/{id}",
    tipo: "DELETE",
    descripcion: "Elimina un link de pago existente.",
    grupo: "Enlaces de pago",
    estado: "Habilitado",
    rec: "REC-006",
  },
  {
    id: 7,
    nombre: "Listado de link de pago",
    path: "/payment-links",
    tipo: "GET",
    descripcion: "Lista los links de pago.",
    grupo: "Enlaces de pago",
    estado: "Habilitado",
    rec: "REC-007",
  },
  {
    id: 8,
    nombre: "Listado de pagos",
    path: "/payments",
    tipo: "GET",
    descripcion: "Lista los pagos registrados.",
    grupo: "Enlaces de pago",
    estado: "Habilitado",
    rec: "REC-008",
  },
  {
    id: 9,
    nombre: "Métodos de pagos disponibles",
    path: "/payments/methods",
    tipo: "GET",
    descripcion: "Lista los métodos de pago disponibles.",
    grupo: "Enlaces de pago",
    estado: "Habilitado",
    rec: "REC-009",
  },
  {
    id: 10,
    nombre: "Utilizar punto de venta",
    path: "/pos/use",
    tipo: "POST",
    descripcion: "Utiliza un punto de venta para una operación.",
    grupo: "QR",
    estado: "Habilitado",
    rec: "REC-010",
  },
  {
    id: 11,
    nombre: "Cambiar estado de punto de venta",
    path: "/pos/{id}/state",
    tipo: "PATCH",
    descripcion: "Cambia el estado de un punto de venta.",
    grupo: "QR",
    estado: "Habilitado",
    rec: "REC-011",
  },
  {
    id: 12,
    nombre: "Cancelar código QR",
    path: "/qr/{id}/cancel",
    tipo: "POST",
    descripcion: "Cancela un código QR activo.",
    grupo: "QR",
    estado: "Habilitado",
    rec: "REC-012",
  },
  {
    id: 13,
    nombre: "Cargar saldo en QR estático",
    path: "/qr/static/balance",
    tipo: "POST",
    descripcion: "Carga saldo en un QR estático.",
    grupo: "QR",
    estado: "Habilitado",
    rec: "REC-013",
  },
  {
    id: 14,
    nombre: "Crear código QR",
    path: "/qr",
    tipo: "POST",
    descripcion: "Crea un nuevo código QR.",
    grupo: "QR",
    estado: "Habilitado",
    rec: "REC-014",
  },
  {
    id: 15,
    nombre: "Crear punto de venta",
    path: "/pos",
    tipo: "POST",
    descripcion: "Crea un nuevo punto de venta.",
    grupo: "QR",
    estado: "Habilitado",
    rec: "REC-015",
  },
  {
    id: 16,
    nombre: "Detalle código QR",
    path: "/qr/{id}",
    tipo: "GET",
    descripcion: "Obtiene el detalle de un código QR.",
    grupo: "QR",
    estado: "Habilitado",
    rec: "REC-016",
  },
  {
    id: 17,
    nombre: "Eliminar punto de venta",
    path: "/pos/{id}",
    tipo: "DELETE",
    descripcion: "Elimina un punto de venta.",
    grupo: "QR",
    estado: "Habilitado",
    rec: "REC-017",
  },
  {
    id: 18,
    nombre: "Lista de códigos QR",
    path: "/qr",
    tipo: "GET",
    descripcion: "Lista los códigos QR.",
    grupo: "QR",
    estado: "Habilitado",
    rec: "REC-018",
  },
  {
    id: 19,
    nombre: "Listar puntos de venta",
    path: "/pos",
    tipo: "GET",
    descripcion: "Lista los puntos de venta.",
    grupo: "QR",
    estado: "Habilitado",
    rec: "REC-019",
  },
  {
    id: 20,
    nombre: "Activar comercios",
    path: "/commerces/activate",
    tipo: "POST",
    descripcion: "Activa comercios masivamente.",
    grupo: "Super Accounts",
    estado: "Habilitado",
    rec: "REC-020",
  },
  {
    id: 21,
    nombre: "Reembolso de QR",
    path: "/qr/{id}/refund",
    tipo: "POST",
    descripcion: "Reembolsa una operación de QR.",
    grupo: "QR",
    estado: "Habilitado",
    rec: "REC-021",
  },
  {
    id: 22,
    nombre: "Activar su cuenta",
    path: "/account/activate",
    tipo: "POST",
    descripcion: "Activa la cuenta del cliente.",
    grupo: "Super Accounts",
    estado: "Habilitado",
    rec: "REC-022",
  },
  {
    id: 23,
    nombre: "Utilización masiva de alias",
    path: "/account/aliases/bulk",
    tipo: "POST",
    descripcion: "Utiliza alias de forma masiva.",
    grupo: "Super Accounts",
    estado: "Habilitado",
    rec: "REC-023",
  },
  {
    id: 24,
    nombre: "Actualizar alias de su cuenta",
    path: "/account/aliases/{id}",
    tipo: "PUT",
    descripcion: "Actualiza un alias de la cuenta.",
    grupo: "Super Accounts",
    estado: "Habilitado",
    rec: "REC-024",
  },
  {
    id: 25,
    nombre: "Crear su cuenta",
    path: "/account",
    tipo: "POST",
    descripcion: "Crea la cuenta del cliente.",
    grupo: "Super Accounts",
    estado: "Habilitado",
    rec: "REC-025",
  },
  {
    id: 26,
    nombre: "Detalle de su cuenta",
    path: "/account",
    tipo: "GET",
    descripcion: "Obtiene el detalle de la cuenta.",
    grupo: "Super Accounts",
    estado: "Habilitado",
    rec: "REC-026",
  },
  {
    id: 27,
    nombre: "Eliminar alias de su cuenta",
    path: "/account/aliases/{id}",
    tipo: "DELETE",
    descripcion: "Elimina un alias de la cuenta.",
    grupo: "Super Accounts",
    estado: "Habilitado",
    rec: "REC-027",
  },
  {
    id: 28,
    nombre: "Eliminar su cuenta",
    path: "/account",
    tipo: "DELETE",
    descripcion: "Elimina la cuenta del cliente.",
    grupo: "Super Accounts",
    estado: "Habilitado",
    rec: "REC-028",
  },
  {
    id: 29,
    nombre: "Listar su cuenta",
    path: "/account/list",
    tipo: "GET",
    descripcion: "Lista las cuentas del cliente.",
    grupo: "Super Accounts",
    estado: "Habilitado",
    rec: "REC-029",
  },
  {
    id: 30,
    nombre: "Modificar retiro de su cuenta",
    path: "/account/withdrawal",
    tipo: "PUT",
    descripcion: "Modifica el retiro configurado de la cuenta.",
    grupo: "Super Accounts",
    estado: "Habilitado",
    rec: "REC-030",
  },
  {
    id: 31,
    nombre: "Suspender su cuenta",
    path: "/account/suspend",
    tipo: "POST",
    descripcion: "Suspende la cuenta del cliente.",
    grupo: "Super Accounts",
    estado: "Habilitado",
    rec: "REC-031",
  },
  {
    id: 32,
    nombre: "Transacciones de su cuenta",
    path: "/account/transactions",
    tipo: "GET",
    descripcion: "Lista las transacciones de la cuenta.",
    grupo: "Super Accounts",
    estado: "Habilitado",
    rec: "REC-032",
  },
  {
    id: 33,
    nombre: "Traspaso interno",
    path: "/account/internal-transfer",
    tipo: "POST",
    descripcion: "Realiza un traspaso interno entre cuentas.",
    grupo: "Super Accounts",
    estado: "Habilitado",
    rec: "REC-033",
  },
  {
    id: 34,
    nombre: "Ejecutar transferencia",
    path: "/transfers",
    tipo: "POST",
    descripcion: "Ejecuta una transferencia de fondos.",
    grupo: "Transfer",
    estado: "Habilitado",
    rec: "REC-034",
  },
  {
    id: 35,
    nombre: "Estado de transferencia",
    path: "/transfers/{id}",
    tipo: "GET",
    descripcion: "Consulta el estado de una transferencia.",
    grupo: "Transfer",
    estado: "Habilitado",
    rec: "REC-035",
  },
  {
    id: 36,
    nombre: "Verificar cuenta",
    path: "/account/verify",
    tipo: "POST",
    descripcion: "Verifica la cuenta del cliente.",
    grupo: "Transfer",
    estado: "Habilitado",
    rec: "REC-036",
  },
  {
    id: 37,
    nombre: "Balance del usuario",
    path: "/users/{id}/balance",
    tipo: "GET",
    descripcion: "Consulta el balance del usuario.",
    grupo: "User",
    estado: "Habilitado",
    rec: "REC-037",
  },
  {
    id: 38,
    nombre: "Autorizar el alias de usuario",
    path: "/users/aliases/authorize",
    tipo: "POST",
    descripcion: "Autoriza un alias de usuario.",
    grupo: "User",
    estado: "Habilitado",
    rec: "REC-038",
  },
  {
    id: 39,
    nombre: "Eliminar alias de usuario",
    path: "/users/aliases/{id}",
    tipo: "DELETE",
    descripcion: "Elimina un alias de usuario.",
    grupo: "User",
    estado: "Habilitado",
    rec: "REC-039",
  },
  {
    id: 40,
    nombre: "Listar transacciones",
    path: "/users/{id}/transactions",
    tipo: "GET",
    descripcion: "Lista las transacciones del usuario.",
    grupo: "User",
    estado: "Habilitado",
    rec: "REC-040",
  },
  {
    id: 41,
    nombre: "Listar por ID",
    path: "/users/{id}",
    tipo: "GET",
    descripcion: "Consulta un usuario por su ID.",
    grupo: "User",
    estado: "Habilitado",
    rec: "REC-041",
  },
  {
    id: 42,
    nombre: "Información de billeteras",
    path: "/wallets",
    tipo: "GET",
    descripcion: "Obtiene información de las billeteras.",
    grupo: "User",
    estado: "Habilitado",
    rec: "REC-042",
  },
  {
    id: 43,
    nombre: "Información del usuario",
    path: "/users/info",
    tipo: "GET",
    descripcion: "Obtiene la información del usuario.",
    grupo: "User",
    estado: "Habilitado",
    rec: "REC-043",
  },
  {
    id: 44,
    nombre: "Reporte de usuario",
    path: "/users/report",
    tipo: "GET",
    descripcion: "Genera un reporte del usuario.",
    grupo: "User",
    estado: "Habilitado",
    rec: "REC-044",
  },
  {
    id: 45,
    nombre: "Test de webhook",
    path: "/webhooks/test",
    tipo: "POST",
    descripcion: "Envía un webhook de prueba.",
    grupo: "Webhooks",
    estado: "Deshabilitado",
    rec: "REC-045",
  },
];

type EndpointForm = {
  nombre: string;
  path: string;
  tipo: TipoEndpoint;
  descripcion: string;
  grupo: GrupoEndpoint;
  estado: "Habilitado" | "Deshabilitado";
  rec: string;
};

function Page() {
  const [data, setData] = useState<Endpoint[]>(dataInicial);
  const [editTarget, setEditTarget] = useState<Endpoint | null>(null);
  const [form, setForm] = useState<EndpointForm>({
    nombre: "",
    path: "",
    tipo: "GET",
    descripcion: "",
    grupo: "Autenticación",
    estado: "Habilitado",
    rec: "",
  });
  const [confirmDelete, setConfirmDelete] = useState<Endpoint | null>(null);

  const openEdit = (e: Endpoint) => {
    setEditTarget(e);
    setForm({
      nombre: e.nombre,
      path: e.path,
      tipo: e.tipo,
      descripcion: e.descripcion,
      grupo: e.grupo,
      estado: e.estado,
      rec: e.rec,
    });
  };

  const guardar = () => {
    if (!editTarget) return;
    setData((prev) =>
      prev.map((d) =>
        d.id === editTarget.id
          ? {
              ...d,
              nombre: form.nombre,
              path: form.path,
              tipo: form.tipo,
              descripcion: form.descripcion,
              grupo: form.grupo,
              estado: form.estado,
            }
          : d,
      ),
    );
    setEditTarget(null);
  };

  const toggleEstado = (id: number) => {
    setData((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, estado: d.estado === "Habilitado" ? "Deshabilitado" : "Habilitado" }
          : d,
      ),
    );
  };

  const getActions = (r: Endpoint): ActionItem[] => [
    { label: "Editar", icon: Edit3, onClick: () => openEdit(r) },
    r.estado === "Habilitado"
      ? {
          label: "Deshabilitar",
          icon: PowerOff,
          variant: "danger",
          onClick: () => toggleEstado(r.id),
        }
      : { label: "Habilitar", icon: Power, onClick: () => toggleEstado(r.id) },
    { label: "Eliminar", icon: Trash2, variant: "danger", onClick: () => setConfirmDelete(r) },
  ];

  const columns: Column<Endpoint>[] = [
    {
      key: "nombre",
      label: "Nombre del endpoint",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-semibold">{r.nombre}</span>,
    },
    {
      key: "path",
      label: "Path",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.path}</span>,
    },
    {
      key: "tipo",
      label: "Tipo de endpoint",
      sortable: true,
      filterable: "enum",
      filterOptions: TIPOS,
      render: (r) => (
        <Badge tone={r.tipo === "GET" ? "success" : r.tipo === "DELETE" ? "danger" : "warn"}>
          {r.tipo}
        </Badge>
      ),
    },
    {
      key: "descripcion",
      label: "Descripción",
      sortable: true,
      filterable: true,
      render: (r) => r.descripcion,
    },
    {
      key: "grupo",
      label: "Grupo de endpoints",
      sortable: true,
      filterable: "enum",
      filterOptions: GRUPOS,
      render: (r) => r.grupo,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Habilitado", "Deshabilitado"],
      render: (r) => (
        <Badge tone={r.estado === "Habilitado" ? "success" : "neutral"}>{r.estado}</Badge>
      ),
    },
    {
      key: "rec",
      label: "REC",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono text-xs">{r.rec}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Endpoints"
        description="Endpoints disponibles de las APIs externas de la plataforma."
      />
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        pageSize={10}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />

      {editTarget && (
        <FormDialog
          open
          onClose={() => setEditTarget(null)}
          title="Editar endpoint"
          description={`Configuración del endpoint "${editTarget.nombre}".`}
          onSubmit={guardar}
          submitLabel="Guardar cambios"
          size="lg"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="ep-nombre">Nombre del endpoint</Label>
              <Input
                id="ep-nombre"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ep-path">Path</Label>
              <Input
                id="ep-path"
                value={form.path}
                onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))}
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="ep-tipo">Tipo de endpoint</Label>
              <select
                id="ep-tipo"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoEndpoint }))}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="ep-grupo">Grupo de endpoints</Label>
              <select
                id="ep-grupo"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                value={form.grupo}
                onChange={(e) => setForm((f) => ({ ...f, grupo: e.target.value as GrupoEndpoint }))}
              >
                {GRUPOS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ep-desc">Descripción</Label>
              <Input
                id="ep-desc"
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="ep-estado">Estado</Label>
              <select
                id="ep-estado"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                value={form.estado}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    estado: e.target.value as "Habilitado" | "Deshabilitado",
                  }))
                }
              >
                <option value="Habilitado">Habilitado</option>
                <option value="Deshabilitado">Deshabilitado</option>
              </select>
            </div>
            <div>
              <Label htmlFor="ep-rec">REC</Label>
              <Input id="ep-rec" value={form.rec} readOnly className="font-mono bg-muted/40" />
            </div>
          </div>
        </FormDialog>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar endpoint"
        message={`¿Estás seguro de eliminar el endpoint "${confirmDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete) setData((prev) => prev.filter((d) => d.id !== confirmDelete.id));
          setConfirmDelete(null);
        }}
      />
    </>
  );
}
