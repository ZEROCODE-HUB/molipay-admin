import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Send,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Mail,
  Pencil,
  Trash2,
  Power,
} from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import {
  PageHeader,
  Card,
  BtnPrimary,
  BtnOutline,
  Input,
  Label,
  Badge,
} from "@/components/portal-shell";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DeveloperModeToggle } from "@/components/developer-mode-toggle";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/configuracion/notificaciones/canales")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Canales de entrega — Admin — Moli" },
      {
        name: "description",
        content: "Configuración de los canales de entrega de notificaciones.",
      },
    ],
  }),
});

type UsuarioTelegram = {
  id: number;
  tipo: string;
  telegramId: string;
  nombre: string;
  estado: "Activo" | "Inactivo";
  fechaCreacion: string;
};

const usuariosIniciales: UsuarioTelegram[] = [
  {
    id: 1,
    tipo: "Admin",
    telegramId: "@admin_soporte",
    nombre: "Soporte Moli",
    estado: "Activo",
    fechaCreacion: "12/03/2025 09:30",
  },
  {
    id: 2,
    tipo: "Operador",
    telegramId: "@juan_perez",
    nombre: "Juan Pérez",
    estado: "Activo",
    fechaCreacion: "18/04/2025 14:12",
  },
  {
    id: 3,
    tipo: "Admin",
    telegramId: "@moli_ops",
    nombre: "Operaciones Moli",
    estado: "Activo",
    fechaCreacion: "02/05/2025 10:45",
  },
  {
    id: 4,
    tipo: "Operador",
    telegramId: "@lucia_gomez",
    nombre: "Lucía Gómez",
    estado: "Inactivo",
    fechaCreacion: "27/06/2025 16:20",
  },
  {
    id: 5,
    tipo: "Operador",
    telegramId: "@carlos_ruiz",
    nombre: "Carlos Ruiz",
    estado: "Activo",
    fechaCreacion: "09/07/2025 11:05",
  },
];

function Page() {
  const [botToken, setBotToken] = useState("7234567890:AAHd8k2...");
  const [chatId, setChatId] = useState("-1001234567890");
  const [activado, setActivado] = useState(true);

  const [usuarios, setUsuarios] = useState(usuariosIniciales);
  const [editando, setEditando] = useState<UsuarioTelegram | null>(null);
  const [eliminar, setEliminar] = useState<UsuarioTelegram | null>(null);
  const [editTipo, setEditTipo] = useState("Operador");
  const [editTelegramId, setEditTelegramId] = useState("");
  const [editNombre, setEditNombre] = useState("");

  const openEdit = (u: UsuarioTelegram) => {
    setEditando(u);
    setEditTipo(u.tipo);
    setEditTelegramId(u.telegramId);
    setEditNombre(u.nombre);
  };

  const saveEdit = () => {
    if (!editando) return;
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === editando.id
          ? { ...u, tipo: editTipo, telegramId: editTelegramId, nombre: editNombre }
          : u,
      ),
    );
    setEditando(null);
    toast.success("Usuario de Telegram actualizado");
  };

  const toggleEstado = (u: UsuarioTelegram) => {
    setUsuarios((prev) =>
      prev.map((x) =>
        x.id === u.id ? { ...x, estado: x.estado === "Activo" ? "Inactivo" : "Activo" } : x,
      ),
    );
    toast.success(
      u.estado === "Activo" ? `Usuario ${u.nombre} desactivado` : `Usuario ${u.nombre} activado`,
    );
  };

  const getActions = (r: UsuarioTelegram): ActionItem[] => [
    { label: "Editar", icon: Pencil, onClick: () => openEdit(r) },
    {
      label: r.estado === "Activo" ? "Desactivar" : "Activar",
      icon: Power,
      onClick: () => toggleEstado(r),
    },
    { label: "Eliminar", icon: Trash2, variant: "danger", onClick: () => setEliminar(r) },
  ];

  const columns: Column<UsuarioTelegram>[] = [
    {
      key: "tipo",
      label: "Tipo",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Admin", "Operador"],
      render: (r) => <Badge tone={r.tipo === "Admin" ? "warn" : "neutral"}>{r.tipo}</Badge>,
    },
    {
      key: "telegramId",
      label: "Telegram ID",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono text-xs">{r.telegramId}</span>,
    },
    {
      key: "nombre",
      label: "Nombre",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-medium">{r.nombre}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Activo", "Inactivo"],
      render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "neutral"}>{r.estado}</Badge>,
    },
    {
      key: "fechaCreacion",
      label: "Fecha de creación",
      sortable: true,
      filterable: "date",
      render: (r) => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {r.fechaCreacion}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Canales de entrega"
        description="Configuración de los canales por los que se entregan las notificaciones."
        action={<DeveloperModeToggle />}
      />

      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-300 mb-6">
        La entrega efectiva (envío por email/Telegram/WhatsApp) depende de infraestructura aún no
        resuelta — migración del proveedor de correo para evitar spam, en definición. La
        configuración de canales ya está construida; el envío real quedará habilitado cuando esa
        integración esté resuelta.
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={18} className="text-moli-blue" />
            <h3 className="font-display font-semibold">Telegram</h3>
            <span className="ml-auto">
              <Badge tone="success">Conectado</Badge>
            </span>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tg-token">Bot Token</Label>
              <Input
                id="tg-token"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="7234567890:AAHd8k2..."
                type="password"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="tg-chat">Chat ID por defecto</Label>
              <Input
                id="tg-chat"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="-1001234567890"
                className="font-mono"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={activado}
                  onChange={(e) => setActivado(e.target.checked)}
                />
                <div className="w-10 h-5.5 bg-muted rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-card after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:after:translate-x-[18px]" />
              </label>
              <span className="text-sm font-medium">
                {activado ? "Canal activado" : "Canal desactivado"}
              </span>
            </div>
            <div className="flex gap-2 pt-1">
              <BtnPrimary
                type="button"
                onClick={() => toast.success("Conexión con Telegram verificada")}
              >
                <Send size={15} /> Probar conexión
              </BtnPrimary>
              <BtnOutline
                type="button"
                onClick={() => toast.success("Configuración de Telegram guardada")}
              >
                Guardar configuración
              </BtnOutline>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Mail size={18} className="text-moli-blue" />
            <h3 className="font-display font-semibold">Email</h3>
            <span className="ml-auto">
              <Badge tone="warn">En configuración</Badge>
            </span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Proveedor</span>
              <span className="font-semibold">Pendiente de definir</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Remitente</span>
              <span className="font-semibold">no-reply@moli.com.ar</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Estado</span>
              <span className="font-semibold text-amber-600">Migración de proveedor en curso</span>
            </div>
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              Se prioriza migrar el proveedor de correo para evitar que las notificaciones caigan en
              spam. El envío efectivo se habilita al completar esa integración.
            </p>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Send size={18} className="text-moli-blue" />
            <h3 className="font-display font-semibold">WhatsApp</h3>
            <span className="ml-auto">
              <Badge tone="warn">En configuración</Badge>
            </span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Proveedor</span>
              <span className="font-semibold">Pendiente de definir</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Número</span>
              <span className="font-semibold">+54 11 5555-0100</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Estado</span>
              <span className="font-semibold text-amber-600">Requiere alta comercial</span>
            </div>
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              El alta del proveedor de WhatsApp es una decisión comercial pendiente.
            </p>
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <h3 className="font-display font-semibold mb-1">Información del servicio Telegram</h3>
        <p className="text-sm text-muted-foreground mb-4">Estado operativo del canal.</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
          <div className="flex justify-between lg:flex-col lg:gap-1 py-2 border-b lg:border-b-0 lg:border-r lg:pr-4">
            <span className="text-muted-foreground">Estado del bot</span>
            <span className="font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Conectado
            </span>
          </div>
          <div className="flex justify-between lg:flex-col lg:gap-1 py-2 border-b lg:border-b-0 lg:border-r lg:pr-4">
            <span className="text-muted-foreground">Último mensaje</span>
            <span className="font-semibold">Hace 12 min</span>
          </div>
          <div className="flex justify-between lg:flex-col lg:gap-1 py-2 border-b lg:border-b-0 lg:border-r lg:pr-4">
            <span className="text-muted-foreground">Enviados (24h)</span>
            <span className="font-semibold">47</span>
          </div>
          <div className="flex justify-between lg:flex-col lg:gap-1 py-2 border-b lg:border-b-0 lg:border-r lg:pr-4">
            <span className="text-muted-foreground">Alertas críticas (24h)</span>
            <span className="font-semibold text-amber-600">3</span>
          </div>
          <div className="flex justify-between lg:flex-col lg:gap-1 py-2">
            <span className="text-muted-foreground">Tasa de entrega</span>
            <span className="font-semibold text-primary">98.7%</span>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="font-display font-semibold text-lg">Usuarios de Telegram</h3>
        <p className="text-sm text-muted-foreground -mt-1">
          Destinatarios configurados para el canal de Telegram.
        </p>
        <DataTable
          columns={columns}
          data={usuarios}
          keyExtractor={(r) => r.id}
          pageSize={10}
          actions={(r) => <ActionsDropdown actions={getActions(r)} />}
        />
      </div>

      <FormDialog
        open={!!editando}
        onClose={() => setEditando(null)}
        title="Editar usuario de Telegram"
        submitLabel="Guardar"
        onSubmit={saveEdit}
      >
        <div>
          <Label>Tipo</Label>
          <select
            value={editTipo}
            onChange={(e) => setEditTipo(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          >
            <option value="Admin">Admin</option>
            <option value="Operador">Operador</option>
          </select>
        </div>
        <div>
          <Label>Telegram ID</Label>
          <Input
            value={editTelegramId}
            onChange={(e) => setEditTelegramId(e.target.value)}
            className="font-mono"
          />
        </div>
        <div>
          <Label>Nombre</Label>
          <Input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!eliminar}
        onClose={() => setEliminar(null)}
        title="Eliminar usuario de Telegram"
        message={`¿Seguro que querés eliminar a "${eliminar?.nombre}"? Dejará de recibir notificaciones por este canal.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => {
          if (eliminar) {
            setUsuarios((prev) => prev.filter((u) => u.id !== eliminar.id));
            toast.success("Usuario de Telegram eliminado");
          }
        }}
      />
    </>
  );
}
