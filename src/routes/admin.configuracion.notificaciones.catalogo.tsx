import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, Pencil, Trash2, ShieldCheck, Info } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Badge, BtnPrimary } from "@/components/portal-shell";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DeveloperModeToggle } from "@/components/developer-mode-toggle";
import { useDeveloperMode } from "@/hooks/use-developer-mode";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/configuracion/notificaciones/catalogo")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Catálogo de errores — Admin — Moli" },
      { name: "description", content: "Catálogo técnico de códigos de error y su clasificación." },
    ],
  }),
});

type Clasificacion = "solo_log" | "solo_admin" | "cliente_admin";

type CodigoError = {
  id: number;
  codigo: string;
  notificar: boolean;
  estadoHttp: number;
  clasificacion: Clasificacion;
  mensaje: { en: string; es: string };
};

const clasificacionMeta: Record<
  Clasificacion,
  { label: string; tone: "neutral" | "warn" | "success"; desc: string }
> = {
  solo_log: {
    label: "Solo log técnico",
    tone: "neutral",
    desc: "No genera notificación visible a nadie, solo queda registrado en el log.",
  },
  solo_admin: {
    label: "Solo Admin",
    tone: "warn",
    desc: "Genera notificación en el Centro de Notificaciones, visible solo en backoffice.",
  },
  cliente_admin: {
    label: "Cliente y Admin",
    tone: "success",
    desc: "Genera notificación visible en el backoffice y en el portal Cliente Empresa.",
  },
};

const mensajesPool: { en: string; es: string }[] = [
  { en: "Connection to provider timed out", es: "Se agotó el tiempo de conexión con el proveedor" },
  { en: "Invalid credentials provided", es: "Credenciales inválidas" },
  {
    en: "Request payload validation failed",
    es: "Falló la validación del payload de la solicitud",
  },
  { en: "Resource not found", es: "Recurso no encontrado" },
  { en: "Duplicate operation detected", es: "Operación duplicada detectada" },
  { en: "Rate limit exceeded", es: "Se superó el límite de solicitudes" },
  { en: "Internal server error", es: "Error interno del servidor" },
  { en: "Upstream service unavailable", es: "Servicio externo no disponible" },
  {
    en: "Webhook delivery failed after retries",
    es: "Falló la entrega del webhook tras reintentos",
  },
  {
    en: "Session expired before completing operation",
    es: "Sesión expirada antes de completar la operación",
  },
  { en: "Invalid document for KYC validation", es: "Documento inválido para la validación KYC" },
  { en: "Bank account not found", es: "Cuenta bancaria inexistente" },
  { en: "Payment link generation failed", es: "Error al generar el link de pago" },
  { en: "File format not supported", es: "Formato de archivo no soportado" },
  { en: "Payment processing failed", es: "Fallo al procesar el pago" },
];

const estadosHttp = [400, 401, 403, 404, 409, 422, 500, 502, 503];

function generateCatalog(): CodigoError[] {
  return Array.from({ length: 410 }, (_, idx) => {
    const n = idx + 1;
    const base = mensajesPool[idx % mensajesPool.length];
    return {
      id: n,
      codigo: `ERR-${String(n).padStart(4, "0")}`,
      notificar: n % 11 === 0,
      estadoHttp: estadosHttp[idx % estadosHttp.length],
      clasificacion: "solo_log",
      mensaje: {
        en: `${base.en} (${n})`,
        es: `${base.es} (${n})`,
      },
    };
  });
}

function Page() {
  const { devMode, setDevMode } = useDeveloperMode();
  const [catalog, setCatalog] = useState<CodigoError[]>(generateCatalog);

  const [detalle, setDetalle] = useState<CodigoError | null>(null);
  const [editando, setEditando] = useState<CodigoError | null>(null);
  const [eliminar, setEliminar] = useState<CodigoError | null>(null);

  const [editNotificar, setEditNotificar] = useState(false);
  const [editEstado, setEditEstado] = useState(500);
  const [editClasificacion, setEditClasificacion] = useState<Clasificacion>("solo_log");
  const [editMensaje, setEditMensaje] = useState("");

  const stats = useMemo(() => {
    const porClasificacion: Record<Clasificacion, number> = {
      solo_log: 0,
      solo_admin: 0,
      cliente_admin: 0,
    };
    let notifican = 0;
    for (const c of catalog) {
      porClasificacion[c.clasificacion] += 1;
      if (c.notificar) notifican += 1;
    }
    return { total: catalog.length, ...porClasificacion, notifican };
  }, [catalog]);

  const openEdit = (r: CodigoError) => {
    setEditando(r);
    setEditNotificar(r.notificar);
    setEditEstado(r.estadoHttp);
    setEditClasificacion(r.clasificacion);
    setEditMensaje(JSON.stringify(r.mensaje, null, 2));
  };

  const saveEdit = () => {
    if (!editando) return;
    let mensaje = editando.mensaje;
    try {
      const parsed = JSON.parse(editMensaje);
      if (typeof parsed === "object" && parsed !== null) {
        mensaje = {
          en: String(parsed.en ?? editando.mensaje.en),
          es: String(parsed.es ?? editando.mensaje.es),
        };
      }
    } catch {
      toast.error("El mensaje JSON es inválido");
      return;
    }
    setCatalog((prev) =>
      prev.map((c) =>
        c.id === editando.id
          ? {
              ...c,
              notificar: editNotificar,
              estadoHttp: editEstado,
              clasificacion: editClasificacion,
              mensaje,
            }
          : c,
      ),
    );
    setEditando(null);
    toast.success(`Código ${editando.codigo} actualizado`);
  };

  const getActions = (r: CodigoError): ActionItem[] => [
    { label: "Ver detalle", icon: Eye, onClick: () => setDetalle(r) },
    { label: "Editar", icon: Pencil, onClick: () => openEdit(r) },
    { label: "Eliminar", icon: Trash2, variant: "danger", onClick: () => setEliminar(r) },
  ];

  const columns: Column<CodigoError>[] = [
    {
      key: "codigo",
      label: "ID",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.codigo}</span>,
    },
    {
      key: "notificar",
      label: "Notificar",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Sí", "No"],
      render: (r) => (
        <Badge tone={r.notificar ? "success" : "neutral"}>{r.notificar ? "Sí" : "No"}</Badge>
      ),
    },
    {
      key: "estadoHttp",
      label: "Estado HTTP",
      sortable: true,
      filterable: "enum",
      filterOptions: estadosHttp.map(String),
      render: (r) => (
        <Badge tone={r.estadoHttp >= 500 ? "danger" : r.estadoHttp >= 400 ? "warn" : "neutral"}>
          {r.estadoHttp}
        </Badge>
      ),
    },
    {
      key: "clasificacion",
      label: "Clasificación",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Solo log técnico", "Solo Admin", "Cliente y Admin"],
      render: (r) => (
        <Badge tone={clasificacionMeta[r.clasificacion].tone}>
          {clasificacionMeta[r.clasificacion].label}
        </Badge>
      ),
    },
  ];

  if (!devMode) {
    return (
      <>
        <PageHeader
          title="Catálogo de errores"
          description="Catálogo técnico de códigos de error. Requiere modo desarrollador."
          action={<DeveloperModeToggle />}
        />
        <div className="bg-card border rounded-lg p-10 text-center space-y-4">
          <ShieldCheck size={36} className="mx-auto text-muted-foreground" />
          <div>
            <h3 className="font-display font-semibold text-lg">
              Esta vista está protegida por rol
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              El catálogo técnico de errores es una vista de desarrollador. Activá el modo
              desarrollador para acceder a los {stats.total} códigos y su clasificación de
              audiencia.
            </p>
          </div>
          <BtnPrimary type="button" onClick={() => setDevMode(true)}>
            Activar modo desarrollador
          </BtnPrimary>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Catálogo de errores"
        description="Catálogo técnico de códigos de error y su clasificación de audiencia."
        action={<DeveloperModeToggle />}
      />

      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-300 mb-6">
        <Info size={15} className="inline mr-1.5 -mt-0.5" />
        Todos los códigos se migran por defecto como{" "}
        <span className="font-semibold">Solo log técnico</span>. La clasificación hacia el cliente
        es una curaduría de negocio pendiente (código por código o por lote) — no se asume
        automáticamente cuáles son de cara al cliente.
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-card border rounded-xl p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Total de códigos
          </div>
          <div className="font-display text-xl md:text-2xl font-semibold mt-1 tabular-nums">
            {stats.total}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.notifican} con Notificar = Sí
          </div>
        </div>
        {(["solo_log", "solo_admin", "cliente_admin"] as const).map((c) => (
          <div key={c} className="bg-card border rounded-xl p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {clasificacionMeta[c].label}
            </div>
            <div className="font-display text-xl md:text-2xl font-semibold mt-1 tabular-nums">
              {stats[c]}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{clasificacionMeta[c].desc}</div>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={catalog}
        keyExtractor={(r) => r.id}
        pageSize={10}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />

      <FormDialog
        open={!!detalle}
        onClose={() => setDetalle(null)}
        title="Detalle del Código de Error"
        description={detalle?.codigo}
        hideCancel
        submitLabel="Cerrar"
        onSubmit={() => setDetalle(null)}
      >
        {detalle && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Notificar
                </div>
                <Badge tone={detalle.notificar ? "success" : "neutral"} className="mt-1">
                  {detalle.notificar ? "Sí" : "No"}
                </Badge>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Estado HTTP
                </div>
                <div className="font-mono text-sm font-semibold mt-1">{detalle.estadoHttp}</div>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Clasificación de audiencia
              </div>
              <Badge tone={clasificacionMeta[detalle.clasificacion].tone} className="mt-1">
                {clasificacionMeta[detalle.clasificacion].label}
              </Badge>
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground mb-1.5 block">
                Mensaje (JSON bilingüe)
              </div>
              <pre className="text-xs font-mono bg-muted/50 rounded-lg p-3 overflow-x-auto">
                {JSON.stringify(detalle.mensaje, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </FormDialog>

      <FormDialog
        open={!!editando}
        onClose={() => setEditando(null)}
        title="Editar Código de Error"
        description={editando?.codigo}
        submitLabel="Guardar"
        size="lg"
        onSubmit={saveEdit}
      >
        {editando && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  Estado HTTP
                </label>
                <select
                  value={editEstado}
                  onChange={(e) => setEditEstado(Number(e.target.value))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {estadosHttp.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  Clasificación
                </label>
                <select
                  value={editClasificacion}
                  onChange={(e) => setEditClasificacion(e.target.value as Clasificacion)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {(["solo_log", "solo_admin", "cliente_admin"] as const).map((c) => (
                    <option key={c} value={c}>
                      {clasificacionMeta[c].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={editNotificar}
                onChange={(e) => setEditNotificar(e.target.checked)}
                className="accent-primary w-4 h-4"
              />
              Notificar
            </label>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Mensaje (JSON bilingüe)
              </label>
              <textarea
                value={editMensaje}
                onChange={(e) => setEditMensaje(e.target.value)}
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </div>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!eliminar}
        onClose={() => setEliminar(null)}
        title="Eliminar código de error"
        message={`¿Seguro que querés eliminar el código ${eliminar?.codigo}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => {
          if (eliminar) {
            setCatalog((prev) => prev.filter((c) => c.id !== eliminar.id));
            toast.success(`Código ${eliminar.codigo} eliminado`);
          }
        }}
      />
    </>
  );
}
