import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send, CheckCircle2, XCircle } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Card, BtnPrimary, BtnOutline, Input, Label, Badge } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/configuracion/telegram")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Mensajes de Telegram — Admin — Molly Money Life" },
      { name: "description", content: "Configuración de alertas administrativas por Telegram." },
    ],
  }),
});

// Evaluar fusión con sistema de comunicación de incidentes (Sección 4).

type TelegramMessage = {
  id: number;
  destino: string;
  mensaje: string;
  fecha: string;
  estado: "enviado" | "fallido";
};

const historyData: TelegramMessage[] = [
  { id: 1, destino: "Admin Chat", mensaje: "Alerta: Timeout AFIP detectado", fecha: "17/07/2026 09:15", estado: "enviado" },
  { id: 2, destino: "Admin Chat", mensaje: "Error crítico: Procesador CVU caído", fecha: "17/07/2026 08:55", estado: "enviado" },
  { id: 3, destino: "Admin Chat", mensaje: "Intento de login sospechoso desde IP 45.33.22.156", fecha: "17/07/2026 07:15", estado: "enviado" },
  { id: 4, destino: "Admin Chat", mensaje: "KYC vencido: Consorcio Belgrano", fecha: "16/07/2026 23:30", estado: "enviado" },
  { id: 5, destino: "Admin Chat", mensaje: "Webhook no entregado — reintento 3/3", fecha: "16/07/2026 22:10", estado: "fallido" },
  { id: 6, destino: "Admin Chat", mensaje: "Reporte diario: Resumen operaciones", fecha: "16/07/2026 20:00", estado: "enviado" },
  { id: 7, destino: "Admin Chat", mensaje: "Alerta: Frecuencia anómala de pagos", fecha: "16/07/2026 18:30", estado: "enviado" },
  { id: 8, destino: "Admin Chat", mensaje: "Notificación: Nuevo comercio registrado", fecha: "16/07/2026 15:00", estado: "enviado" },
];

function Page() {
  const [botToken, setBotToken] = useState("7234567890:AAHd8k2...");
  const [chatId, setChatId] = useState("-1001234567890");
  const [activado, setActivado] = useState(true);

  const columns: Column<TelegramMessage>[] = [
    { key: "id", label: "ID", filterable: true, render: (r) => <span className="font-mono text-xs">#{r.id}</span> },
    {
      key: "destino",
      label: "Destino",
      sortable: true, filterable: true,
      render: (r) => r.destino,
    },
    {
      key: "mensaje",
      label: "Mensaje",
      sortable: true,
      filterable: true,
      render: (r) => <span className="text-sm">{r.mensaje}</span>,
    },
    {
      key: "fecha",
      label: "Fecha",
      sortable: true, filterable: "date",
      render: (r) => <span className="text-xs text-muted-foreground">{r.fecha}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true, filterable: true,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {r.estado === "enviado" ? (
            <CheckCircle2 size={14} className="text-primary" />
          ) : (
            <XCircle size={14} className="text-red-500" />
          )}
          <Badge tone={r.estado === "enviado" ? "success" : "danger"}>{r.estado}</Badge>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Mensajes de Telegram"
        description="Configuración del bot de Telegram para alertas administrativas."
      />

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="font-semibold mb-4">Configuración del bot</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tg-token">Bot Token</Label>
              <Input
                id="tg-token"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="7234567890:AAHd8k2..."
                type="password"
              />
            </div>
            <div>
              <Label htmlFor="tg-chat">Chat ID</Label>
              <Input
                id="tg-chat"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="-1001234567890"
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
              <span className="text-sm font-medium">{activado ? "Activado" : "Desactivado"}</span>
            </div>
            <div className="flex gap-2 pt-2">
              <BtnPrimary type="button">
                <Send size={15} /> Probar conexión
              </BtnPrimary>
              <BtnOutline type="button">Guardar configuración</BtnOutline>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Información del servicio</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Estado del bot</span>
              <span className="font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                Conectado
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Último mensaje</span>
              <span className="font-semibold">Hace 12 min</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Mensajes enviados (24h)</span>
              <span className="font-semibold">47</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Alertas críticas (24h)</span>
              <span className="font-semibold text-amber-600">3</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Tasa de entrega</span>
              <span className="font-semibold text-primary">98.7%</span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold mb-4">Historial de mensajes enviados</h3>
        <DataTable
          columns={columns}
          data={historyData}
          keyExtractor={(r) => r.id}
          pageSize={5}
        />
      </Card>
    </>
  );
}
