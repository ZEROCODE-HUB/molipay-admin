import { useState } from "react";
import { CheckCircle2,XCircle,Eye } from "lucide-react";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline } from "@/shared/ui/button";
import { ActionsDropdown,type ActionItem } from "@/shared/ui/actions-dropdown";
import { DeveloperModeToggle } from "@/app/developer-mode-toggle";

type Recipients = "Admin" | "Cliente" | "Ambos";
type Channel = "Email" | "Telegram" | "WhatsApp";

type Event = {
  id: number;
  evento: string;
  afecta: string;
  fecha: string;
  destinatarios: Recipients;
  canal: Channel;
  entregado: boolean;
};

const eventsInitials: Event[] = [
  {
    id: 1,
    evento: "Timeout en la conexión con AFIP",
    afecta: "Operaciones (general)",
    fecha: "11/08/2026 09:15",
    destinatarios: "Admin",
    canal: "Telegram",
    entregado: true,
  },
  {
    id: 2,
    evento: "El procesador de pagos por CVU dejó de responder",
    afecta: "Procesamiento de pagos",
    fecha: "11/08/2026 08:55",
    destinatarios: "Admin",
    canal: "Telegram",
    entregado: true,
  },
  {
    id: 3,
    evento: "Intento de acceso sospechoso desde una IP no habitual",
    afecta: "Seguridad (general)",
    fecha: "11/08/2026 07:15",
    destinatarios: "Admin",
    canal: "Telegram",
    entregado: true,
  },
  {
    id: 4,
    evento: "Un cliente tiene la documentación (KYC) vencida",
    afecta: "Consorcio Belgrano",
    fecha: "10/08/2026 23:30",
    destinatarios: "Ambos",
    canal: "Email",
    entregado: true,
  },
  {
    id: 5,
    evento: "No se pudo entregar la confirmación de un cobro externo",
    afecta: "Integraciones (general)",
    fecha: "10/08/2026 22:10",
    destinatarios: "Admin",
    canal: "Telegram",
    entregado: false,
  },
  {
    id: 6,
    evento: "Resumen diario de operaciones disponible",
    afecta: "Administración (general)",
    fecha: "10/08/2026 20:00",
    destinatarios: "Admin",
    canal: "Email",
    entregado: true,
  },
  {
    id: 7,
    evento: "Frecuencia anómala de pagos detectada",
    afecta: "Prevención de fraude",
    fecha: "10/08/2026 18:30",
    destinatarios: "Admin",
    canal: "Telegram",
    entregado: true,
  },
  {
    id: 8,
    evento: "Nuevo comercio registrado y activo en la plataforma",
    afecta: "Comercio Demo SA",
    fecha: "10/08/2026 15:00",
    destinatarios: "Ambos",
    canal: "Email",
    entregado: true,
  },
  {
    id: 9,
    evento: "El cobro no pudo procesarse",
    afecta: "Pagos Express SRL",
    fecha: "10/08/2026 12:40",
    destinatarios: "Cliente",
    canal: "WhatsApp",
    entregado: true,
  },
  {
    id: 10,
    evento: "Los fondos acreditados ya están disponibles",
    afecta: "Microcréditos del Sur",
    fecha: "10/08/2026 11:05",
    destinatarios: "Cliente",
    canal: "WhatsApp",
    entregado: false,
  },
];

const recipientTone: Record<Recipients, "neutral" | "success" | "warn"> = {
  Admin: "neutral",
  Cliente: "success",
  Ambos: "warn",
};

const channelTone: Record<Channel, "neutral" | "success" | "warn"> = {
  Email: "neutral",
  Telegram: "success",
  WhatsApp: "warn",
};

export function NotificationsPage() {
  const [events] = useState(eventsInitials);

  const getActions = (r: Event): ActionItem[] => [
    {
      label: "Ver detalle",
      icon: Eye,
      onClick: () => {},
    },
  ];

  const columns: Column<Event>[] = [
    {
      key: "evento",
      label: "Evento",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-medium">{r.evento}</span>,
    },
    {
      key: "afecta",
      label: "Afecta a",
      sortable: true,
      filterable: true,
      render: (r) => <span className="text-xs text-muted-foreground">{r.afecta}</span>,
    },
    {
      key: "fecha",
      label: "Cuándo",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.fecha}</span>,
    },
    {
      key: "destinatarios",
      label: "Destinatarios",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Admin", "Cliente", "Ambos"],
      render: (r) => <Badge tone={recipientTone[r.destinatarios]}>{r.destinatarios}</Badge>,
    },
    {
      key: "canal",
      label: "Canal",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Email", "Telegram", "WhatsApp"],
      render: (r) => <Badge tone={channelTone[r.canal]}>{r.canal}</Badge>,
    },
    {
      key: "entregado",
      label: "Estado de entrega",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Entregado", "Fallido"],
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {r.entregado ? (
            <CheckCircle2 size={14} className="text-emerald-500" />
          ) : (
            <XCircle size={14} className="text-red-500" />
          )}
          <Badge tone={r.entregado ? "success" : "danger"}>
            {r.entregado ? "Entregado" : "Fallido"}
          </Badge>
        </div>
      ),
    },
  ];

  const entregadas = events.filter((e) => e.entregado).length;
  const fallidas = events.length - entregadas;
  const withCustomer = events.filter((e) => e.destinatarios !== "Admin").length;

  return (
    <>
      <PageHeader
        title="Centro de Notificaciones"
        description="Qué pasó, a quién afectó y si se notificó correctamente."
        action={<DeveloperModeToggle />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Notificaciones (7 días)
          </div>
          <div className="font-display text-xl md:text-2xl font-semibold mt-1 tabular-nums">
            {events.length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">últimos eventos registrados</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Entregadas</div>
          <div className="font-display text-xl md:text-2xl font-semibold mt-1 tabular-nums text-emerald-600">
            {entregadas}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {Math.round((entregadas / Math.max(1, events.length)) * 100)}% de entrega
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Fallidas</div>
          <div className="font-display text-xl md:text-2xl font-semibold mt-1 tabular-nums text-red-600">
            {fallidas}
          </div>
          <div className="text-xs text-muted-foreground mt-1">requieren revisión</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Con destinatario Cliente
          </div>
          <div className="font-display text-xl md:text-2xl font-semibold mt-1 tabular-nums">
            {withCustomer}
          </div>
          <div className="text-xs text-muted-foreground mt-1">visibles en Cliente Empresa</div>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display font-semibold text-lg">Eventos recientes</h3>
          <BtnOutline type="button" className="h-8 text-xs px-3">
            Exportar historial
          </BtnOutline>
        </div>
        <DataTable
          columns={columns}
          data={events}
          keyExtractor={(r) => r.id}
          pageSize={10}
          actions={(r) => <ActionsDropdown actions={getActions(r)} />}
        />
      </div>
    </>
  );
}
