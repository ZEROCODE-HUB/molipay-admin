import { createFileRoute } from "@tanstack/react-router";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Badge, BtnOutline } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/configuracion/mensajes")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Gestor de mensajes de error — Admin — Molly Money Life" },
      { name: "description", content: "Trazabilidad de mensajes de error del sistema." },
    ],
  }),
});

type ErrorRecord = {
  id: number;
  codigo: string;
  mensaje: string;
  frecuencia: number;
  ultimaOcurrencia: string;
  nivel: "critico" | "alto" | "medio" | "bajo";
};

const data: ErrorRecord[] = [
  { id: 1, codigo: "ERR-001", mensaje: "Timeout en conexión con AFIP", frecuencia: 47, ultimaOcurrencia: "17/07/2026 09:15", nivel: "critico" },
  { id: 2, codigo: "ERR-002", mensaje: "Fallo al procesar pago con transferencia", frecuencia: 23, ultimaOcurrencia: "17/07/2026 08:55", nivel: "critico" },
  { id: 3, codigo: "ERR-003", mensaje: "Error de validación KYC: documento inválido", frecuencia: 118, ultimaOcurrencia: "17/07/2026 08:30", nivel: "alto" },
  { id: 4, codigo: "ERR-004", mensaje: "CBU inexistente en sistema BCRA", frecuencia: 12, ultimaOcurrencia: "17/07/2026 07:45", nivel: "alto" },
  { id: 5, codigo: "ERR-005", mensaje: "Error al generar link de pago", frecuencia: 8, ultimaOcurrencia: "17/07/2026 07:20", nivel: "medio" },
  { id: 6, codigo: "ERR-006", mensaje: "Webhook no entregado — reintento agotado", frecuencia: 34, ultimaOcurrencia: "17/07/2026 06:50", nivel: "medio" },
  { id: 7, codigo: "ERR-007", mensaje: "Notificación fallida: servicio de email no responde", frecuencia: 56, ultimaOcurrencia: "16/07/2026 23:30", nivel: "medio" },
  { id: 8, codigo: "ERR-008", mensaje: "Archivo de conciliación con formato incorrecto", frecuencia: 5, ultimaOcurrencia: "16/07/2026 22:10", nivel: "bajo" },
  { id: 9, codigo: "ERR-009", mensaje: "Sesión expirada antes de completar operación", frecuencia: 89, ultimaOcurrencia: "16/07/2026 21:00", nivel: "bajo" },
  { id: 10, codigo: "ERR-010", mensaje: "Imagen de perfil excede tamaño máximo", frecuencia: 15, ultimaOcurrencia: "16/07/2026 20:15", nivel: "bajo" },
  { id: 11, codigo: "ERR-011", mensaje: "Error al consultar saldo en subcuenta", frecuencia: 9, ultimaOcurrencia: "16/07/2026 19:40", nivel: "medio" },
  { id: 12, codigo: "ERR-012", mensaje: "Fallo en OCR de documento KYC", frecuencia: 42, ultimaOcurrencia: "16/07/2026 18:30", nivel: "alto" },
];

function nivelBadgeTone(nivel: ErrorRecord["nivel"]): "danger" | "warn" | "neutral" | "success" {
  if (nivel === "critico") return "danger";
  if (nivel === "alto") return "warn";
  if (nivel === "medio") return "neutral";
  return "success";
}

function Page() {
  const columns: Column<ErrorRecord>[] = [
    { key: "id", label: "ID", render: (r) => <span className="font-mono text-xs">#{r.id}</span> },
    {
      key: "codigo",
      label: "Código",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.codigo}</span>,
    },
    {
      key: "mensaje",
      label: "Mensaje",
      sortable: true,
      filterable: true,
      render: (r) => <span>{r.mensaje}</span>,
    },
    {
      key: "frecuencia",
      label: "Frecuencia",
      sortable: true,
      render: (r) => (
        <span className="font-semibold">{r.frecuencia.toLocaleString()}</span>
      ),
    },
    {
      key: "ultimaOcurrencia",
      label: "Última ocurrencia",
      sortable: true,
      render: (r) => <span className="text-xs text-muted-foreground">{r.ultimaOcurrencia}</span>,
    },
    {
      key: "nivel",
      label: "Nivel",
      sortable: true,
      render: (r) => <Badge tone={nivelBadgeTone(r.nivel)}>{r.nivel}</Badge>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Gestor de mensajes de error"
        description="Trazabilidad y monitoreo de errores del sistema."
      />
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        pageSize={10}
        actions={(r) => (
          <div className="flex gap-1 justify-end">
            <BtnOutline type="button" className="h-7 text-xs px-2">Ver detalle</BtnOutline>
          </div>
        )}
      />
    </>
  );
}
