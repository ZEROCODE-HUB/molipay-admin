import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  ChevronLeft,
  AlertTriangle,
  Inbox,
  Plus,
  Pencil,
  ShieldAlert,
  FilterX,
  RefreshCw,
  Landmark,
  Link2,
  Globe,
  Check,
  Download,
  Eye,
  FileUp,
  Ban,
  ShieldCheck,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/portal-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ModalDialog } from "@/components/modal-dialog";
import { DataTable, type Column } from "@/components/data-table";
import { PermissionGuard } from "@/components/permission-guard";
import { AlertaGestionModal, type GestionAlerta } from "@/components/alerta-gestion";
import { useClienteByLegajo } from "@/hooks/useClientes";
import { useMovimientos } from "@/hooks/useMovimientos";
import { useImpuestosAsignaciones } from "@/hooks/useImpuestos";
import { updateClienteEstado } from "@/lib/api/clientes";
import {
  listSubcuentas,
  createSubcuenta,
  type Subcuenta,
  type SubcuentaInput,
  type SubcuentaTipo,
  type SubcuentaEstado,
} from "@/lib/api/subcuentas";
import {
  listDocumentos,
  createDocumento,
  DOCUMENTO_LABELS,
  type DocumentoTipo,
} from "@/lib/api/documentos";
import {
  listHistorialCambios,
  listValidaciones,
  listAlertas,
  listBloqueos,
  listClienteModulos,
  listParametrosAlertas,
  upsertParametroAlerta,
  listParametrosBloqueos,
  upsertParametroBloqueo,
  listComerciosPst,
  listLinksPago,
  forzarValidacion,
  crearExencion,
  listComisionesCliente,
  type ExencionDireccion,
  type HistorialCambio,
  type Validacion,
  type Alerta,
  type Bloqueo,
  type ParametroConfig,
  type ComercioPst,
  type LinkPago,
  type ComisionCliente,
} from "@/lib/api/detalle-cliente";
import {
  listApiUsuarios,
  listApiUsuarioEndpoints,
  listApiUsuarioLogs,
  setApiUsuarioEstado,
  type ApiUsuarioEndpoint,
  type ApiUsuarioLog,
} from "@/lib/api/api-usuarios";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { findJuridicaMock } from "@/data/juridicas-mock";
import { imagenesParaLegajo } from "@/data/imagenes-asignadas";
import type {
  Cliente,
  EstadoCliente,
  EstadoApiUsuario,
  ImpuestoAsignacion,
  Movimiento,
} from "@/lib/api/types";
import {
  type EstadoMovimiento,
  type Movimiento as DetailMovimiento,
} from "@/lib/api/types";
import { MovimientoDetail, DetailModal } from "@/components/movimiento-detail";
import { resolverEstadoMovimiento } from "@/lib/estados";
import { useEstadosMovimiento } from "@/hooks/useEstados";
import { useCambiarEstadoMovimiento } from "@/hooks/useMovimientoActions";
import { FormDialog } from "@/components/form-dialog";

export const Route = createFileRoute("/admin/general/usuarios/$legajo")({
  head: () => ({
    meta: [{ title: "Ficha de cliente — Admin Molly" }],
  }),
  component: ClienteDetailPage,
});

const estadoLabel: Record<EstadoCliente, string> = {
  activo: "Activo",
  suspendido: "Suspendido",
  rechazado: "Rechazado",
};

const estadoTone: Record<EstadoCliente, "success" | "danger" | "warn"> = {
  activo: "success",
  suspendido: "danger",
  rechazado: "warn",
};

type TabKey =
  | "identificacion"
  | "movimientos"
  | "impuestos"
  | "subcuentas"
  | "documentos"
  | "validaciones"
  | "riesgo"
  | "contexto"
  | "modulos"
  | "historial";

const TABS: { key: TabKey; label: string }[] = [
  { key: "identificacion", label: "Datos personales" },
  { key: "movimientos", label: "Movimientos" },
  { key: "impuestos", label: "Impuestos" },
  { key: "subcuentas", label: "Subcuentas y CVUs" },
  { key: "documentos", label: "Documentos" },
  { key: "validaciones", label: "Validaciones automáticas" },
  { key: "riesgo", label: "Riesgo y monitoreo" },
  { key: "contexto", label: "Contexto operativo" },
  { key: "modulos", label: "Módulos y productos" },
  { key: "historial", label: "Historial" },
];

type ParamTipo = "switch" | "switch_valor" | "switch_porcentaje" | "switch_cantidad_periodo";

type ParamDef = {
  clave: string;
  etiqueta: string;
  tipo: ParamTipo;
  valorDefecto?: string;
  periodoDefecto?: string;
  unidad?: string;
};

const ALERTA_PARAM_DEF: ParamDef[] = [
  {
    clave: "exceso_perfil_transaccional",
    etiqueta: "Exceso de perfil transaccional esperado",
    tipo: "switch",
  },
  {
    clave: "variacion_volumen_mes_anterior",
    etiqueta: "Variación de volumen esperado respecto al mes anterior",
    tipo: "switch_porcentaje",
    valorDefecto: "10",
    unidad: "%",
  },
  {
    clave: "domicilio_jurisdiccion_alto_riesgo",
    etiqueta: "Tiene domicilio en jurisdicción considerada de alto riesgo",
    tipo: "switch",
  },
  {
    clave: "operacion_individual_monto",
    etiqueta: "La operación individual superó un monto determinado",
    tipo: "switch_valor",
    valorDefecto: "100000",
    unidad: "$",
  },
  {
    clave: "operaciones_repetidas_mismo_destinatario",
    etiqueta:
      "Cantidad de operaciones repetidas hacia un mismo destinatario dentro de un período determinado",
    tipo: "switch_cantidad_periodo",
    valorDefecto: "5",
    periodoDefecto: "24h",
  },
];

const BLOQUEO_PARAM_DEF: ParamDef[] = [
  {
    clave: "bloqueo_exceso_perfil_transaccional",
    etiqueta: "Bloquear por exceso de perfil transaccional esperado",
    tipo: "switch",
  },
  {
    clave: "bloqueo_variacion_volumen_mes_anterior",
    etiqueta: "Bloquear por variación de volumen respecto al mes anterior",
    tipo: "switch_porcentaje",
    valorDefecto: "20",
    unidad: "%",
  },
  {
    clave: "bloqueo_domicilio_jurisdiccion_alto_riesgo",
    etiqueta: "Bloquear por domicilio en jurisdicción considerada de alto riesgo",
    tipo: "switch",
  },
  {
    clave: "bloqueo_operacion_individual_monto",
    etiqueta: "Bloquear por operación individual que supera un monto determinado",
    tipo: "switch_valor",
    valorDefecto: "200000",
    unidad: "$",
  },
  {
    clave: "bloqueo_operaciones_repetidas_mismo_destinatario",
    etiqueta: "Bloquear por operaciones repetidas hacia un mismo destinatario en un período",
    tipo: "switch_cantidad_periodo",
    valorDefecto: "5",
    periodoDefecto: "24h",
  },
];

function fmtFecha(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR");
}

function fmtFechaHora(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR");
}

function fmtMonto(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
        enabled ? "bg-primary" : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function Seccion({
  titulo,
  loading,
  error,
  onRetry,
  vacio,
  children,
}: {
  titulo: string;
  loading: boolean;
  error: Error | null;
  onRetry?: () => void;
  vacio: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="font-display text-base font-semibold text-foreground mb-3">{titulo}</h2>
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-10 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando…
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-700">
          <AlertTriangle size={22} />
          <p>{error instanceof DataAccessError ? error.message : "Error al cargar los datos."}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
            >
              Reintentar
            </button>
          )}
        </div>
      ) : vacio ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-8 text-sm text-muted-foreground">
          <Inbox size={22} />
          <p>Sin registros.</p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function FichaDato({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground break-words">{value}</dd>
    </div>
  );
}

function FieldGrid({ campos }: { campos: { label: string; valor: string }[] }) {
  return (
    <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
      {campos.map((c) => (
        <FichaDato key={c.label} label={c.label} value={c.valor} />
      ))}
    </dl>
  );
}

function SectionCard({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="font-display text-sm font-semibold">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: string; tone?: "default" | "muted" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold tabular-nums ${
          tone === "muted" ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MiniDashboard<T>({
  titulo,
  columnas,
  datos,
  vacio = "Sin registros.",
}: {
  titulo: string;
  columnas: { label: string; render: (r: T) => React.ReactNode }[];
  datos: T[];
  vacio?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h4>
      {datos.length === 0 ? (
        <p className="text-xs text-muted-foreground">{vacio}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left uppercase tracking-wide text-muted-foreground">
                {columnas.map((c, i) => (
                  <th key={i} className="px-2 py-1.5 font-medium">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.map((d, i) => (
                <tr key={i} className="border-b border-border last:border-b-0">
                  {columnas.map((c, j) => (
                    <td key={j} className="px-2 py-1.5 text-foreground">
                      {c.render(d)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ParametrosResumen({ defs, stored }: { defs: ParamDef[]; stored: ParametroConfig[] }) {
  if (defs.length === 0) {
    return <p className="text-xs text-muted-foreground">Sin parámetros configurados.</p>;
  }
  return (
    <ul className="space-y-2">
      {defs.map((d) => {
        const s = stored.find((p) => p.clave === d.clave);
        const habilitado = s?.habilitado ?? false;
        let valor = "No configurado";
        if (habilitado) {
          if (d.tipo === "switch") valor = "Habilitado";
          else if (d.tipo === "switch_valor")
            valor = `${s?.valor ?? d.valorDefecto ?? ""} ${d.unidad ?? ""}`.trim();
          else if (d.tipo === "switch_porcentaje")
            valor = `${s?.valor ?? d.valorDefecto ?? ""}${d.unidad ?? ""}`.trim();
          else if (d.tipo === "switch_cantidad_periodo")
            valor = `${s?.valor ?? d.valorDefecto ?? ""} cada ${
              s?.periodo ?? d.periodoDefecto ?? ""
            }`;
          else valor = "Habilitado";
        }
        return (
          <li key={d.clave} className="flex items-start justify-between gap-3 text-xs">
            <span className="text-muted-foreground">{d.etiqueta}</span>
            <span
              className={`font-medium text-right ${
                habilitado ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {valor}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const historialColumns: Column<HistorialCambio>[] = [
  { key: "campo", label: "Campo", render: (r) => r.campo },
  { key: "valorAnterior", label: "Valor anterior", render: (r) => r.valorAnterior ?? "—" },
  { key: "valorNuevo", label: "Valor nuevo", render: (r) => r.valorNuevo ?? "—" },
  { key: "fecha", label: "Fecha", render: (r) => r.fecha },
  { key: "hora", label: "Hora", render: (r) => r.hora ?? "—" },
  { key: "usuario", label: "Usuario", render: (r) => r.usuario ?? "—" },
];

const validacionesColumns: Column<Validacion>[] = [
  { key: "proveedor", label: "Proveedor", render: (r) => r.proveedor },
  { key: "estado", label: "Estado", render: (r) => r.estado },
  { key: "fecha", label: "Fecha", render: (r) => r.fecha },
];

type AlertaView = Alerta & { fechaAceptacion?: string };
type BloqueoView = Bloqueo & { fechaAceptacion?: string };

const riesgoColumns: Column<AlertaView>[] = [
  { key: "tipo", label: "Tipo de alerta", render: (r) => r.tipo },
  {
    key: "estado",
    label: "Estado",
    render: (r) => {
      const tone =
        r.estado === "Resuelto" ? "success" : r.estado === "Revisado" ? "neutral" : "warn";
      return <Badge tone={tone}>{r.estado}</Badge>;
    },
  },
  { key: "fecha", label: "Fecha de la alerta", render: (r) => r.fecha },
  {
    key: "fechaAceptacion",
    label: "Fecha de aceptación",
    render: (r) => r.fechaAceptacion ?? "—",
  },
];

const bloqueosColumns: Column<BloqueoView>[] = [
  { key: "parametro", label: "Tipo", render: (r) => r.parametro },
  {
    key: "estado",
    label: "Estado",
    render: (r) => {
      if (!r.estado) return "—";
      const tone =
        r.estado === "Desbloqueado" ? "success" : r.estado === "Bloqueado" ? "danger" : "warn";
      return <Badge tone={tone}>{r.estado}</Badge>;
    },
  },
  { key: "valor", label: "Valor", render: (r) => r.valor ?? "—" },
  {
    key: "fechaAceptacion",
    label: "Fecha de aceptación",
    render: (r) => r.fechaAceptacion ?? "—",
  },
];

const apiUsuariosColumns = [
  {
    key: "codigo",
    label: "Código",
    render: (u: { codigoUsuarioApi: string }) => u.codigoUsuarioApi,
  },
  { key: "usuario", label: "Usuario", render: (u: { usuario: string }) => u.usuario },
  { key: "nombre", label: "Nombre", render: (u: { nombreCompleto: string }) => u.nombreCompleto },
  {
    key: "estado",
    label: "Estado",
    render: (u: { estado: string }) => (
      <Badge tone={u.estado === "Activo" ? "success" : "neutral"}>{u.estado}</Badge>
    ),
  },
];

function AccionIconBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground transition hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

function toDetalleMovimiento(
  m: Movimiento,
  catalogo: EstadoMovimiento[],
): DetailMovimiento {
  return {
    clienteId: m.clienteId,
    legajo: m.legajo,
    id: m.idTxn,
    tipo: m.tipo,
    cvu: m.cvu ?? "—",
    usuario: m.cliente?.correo ?? m.legajo,
    nombreOrigen: m.cliente?.nombre ?? "—",
    nombreDestino: "—",
    cuit: m.cliente?.cuit ?? "—",
    monto: fmtMonto(m.montoCobrado),
    fecha: fmtFechaHora(m.fecha),
    estado: resolverEstadoMovimiento(m, catalogo).codigo,
  };
}

function TablaMovimientos({
  rows,
  onVerDetalles,
  onCambiarEstado,
  onVerCliente,
}: {
  rows: Movimiento[];
  onVerDetalles?: (m: Movimiento) => void;
  onCambiarEstado?: (m: Movimiento) => void;
  onVerCliente?: (m: Movimiento) => void;
}) {
  const conAcciones = Boolean(onVerDetalles || onCambiarEstado || onVerCliente);
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">TX</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium text-right">Monto operación</th>
            <th className="px-4 py-3 font-medium text-right">Comisión</th>
            <th className="px-4 py-3 font-medium text-right">Impuesto</th>
            <th className="px-4 py-3 font-medium text-right">Cobrado</th>
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            {conAcciones && <th className="px-4 py-3 font-medium text-right">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3 font-mono text-xs">{m.idTxn}</td>
              <td className="px-4 py-3">{m.tipo}</td>
              <td className="px-4 py-3 text-right tabular-nums">{fmtMonto(m.montoOperacion)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{fmtMonto(m.comision)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{fmtMonto(m.impuesto)}</td>
              <td className="px-4 py-3 text-right tabular-nums font-medium">
                {fmtMonto(m.montoCobrado)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{fmtFechaHora(m.fecha)}</td>
              <td className="px-4 py-3">
                <Badge tone={m.esFinal ? "success" : "warn"}>
                  {m.estadoNombre ?? m.estadoCodigo ?? "—"}
                </Badge>
              </td>
              {conAcciones && (
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    {onVerDetalles && (
                      <AccionIconBtn title="Ver detalles" onClick={() => onVerDetalles(m)}>
                        <Eye size={15} />
                      </AccionIconBtn>
                    )}
                    {onCambiarEstado && (
                      <AccionIconBtn title="Cambiar estado" onClick={() => onCambiarEstado(m)}>
                        <ShieldAlert size={15} />
                      </AccionIconBtn>
                    )}
                    {onVerCliente && (
                      <AccionIconBtn
                        title="Ver movimientos del cliente"
                        onClick={() => onVerCliente(m)}
                      >
                        <FilterX size={15} />
                      </AccionIconBtn>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaImpuestos({
  rows,
  onVerDetalles,
  onVerCliente,
}: {
  rows: ImpuestoAsignacion[];
  onVerDetalles?: (a: ImpuestoAsignacion) => void;
  onVerCliente?: (a: ImpuestoAsignacion) => void;
}) {
  const conAcciones = Boolean(onVerDetalles || onVerCliente);
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Impuesto</th>
            <th className="px-4 py-3 font-medium">Código</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium text-right">Monto / Tasa</th>
            <th className="px-4 py-3 font-medium">Fecha asignación</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            {conAcciones && <th className="px-4 py-3 font-medium text-right">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3">{a.impuesto?.nombre ?? a.impuestoId}</td>
              <td className="px-4 py-3 font-mono text-xs">{a.impuesto?.codigo ?? "—"}</td>
              <td className="px-4 py-3">{a.impuesto?.tipo ?? a.tipo}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {(a.impuesto?.tipo ?? a.tipo) === "Porcentaje"
                  ? `${a.impuesto?.monto ?? a.monto ?? 0} %`
                  : fmtMonto(a.impuesto?.monto ?? a.monto)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{fmtFecha(a.fechaAsignacion)}</td>
              <td className="px-4 py-3">
                <Badge tone={a.estado === "Activo" ? "success" : "neutral"}>{a.estado}</Badge>
              </td>
              {conAcciones && (
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    {onVerDetalles && (
                      <AccionIconBtn title="Ver detalles" onClick={() => onVerDetalles(a)}>
                        <Eye size={15} />
                      </AccionIconBtn>
                    )}
                    {onVerCliente && (
                      <AccionIconBtn
                        title="Ver movimientos del cliente"
                        onClick={() => onVerCliente(a)}
                      >
                        <FilterX size={15} />
                      </AccionIconBtn>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaSubcuentas({ rows }: { rows: Subcuenta[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Nombre</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">CBU</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium text-right">Saldo disp.</th>
            <th className="px-4 py-3 font-medium text-right">Retiros</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3">{`${s.nombre} ${s.apellido}`.trim()}</td>
              <td className="px-4 py-3">{s.email}</td>
              <td className="px-4 py-3 font-mono text-xs">{s.cbu ?? "—"}</td>
              <td className="px-4 py-3">{s.tipo}</td>
              <td className="px-4 py-3">
                <Badge tone={s.estado === "Activa" ? "success" : "neutral"}>{s.estado}</Badge>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{fmtMonto(s.saldoDisponible)}</td>
              <td className="px-4 py-3 text-right">
                {s.retirosHabilitados ? "Habilitados" : "Bloqueados"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function camposIdentificacion(c: Cliente) {
  const personal: { label: string; valor: string }[] = [
    { label: "Legajo", valor: c.legajo },
    { label: "Email", valor: c.correo },
    { label: "Fecha de registro", valor: fmtFecha(c.fechaAlta) },
    {
      label: "Tipo de cuenta",
      valor: c.tipoPersona === "juridica" ? "Persona Jurídica" : "Persona Física",
    },
    { label: "Estado", valor: estadoLabel[c.estado] },
    { label: "Cant. cuentas bancarias", valor: "—" },
    { label: "Cant. cuentas virtuales", valor: "—" },
    { label: "Nombre", valor: c.nombre },
    { label: "Apellido", valor: "—" },
    { label: "CUIT", valor: c.cuit },
    { label: "Género", valor: "—" },
    { label: "Dirección", valor: "—" },
    { label: "Número de dirección", valor: "—" },
    { label: "Ciudad", valor: "—" },
    { label: "Estado / Provincia", valor: "—" },
    { label: "Código postal", valor: "—" },
    { label: "Fecha de nacimiento", valor: "—" },
  ];
  const compliance: { label: string; valor: string }[] = [
    { label: "Ocupación", valor: "—" },
    { label: "Origen de fondos", valor: "—" },
    { label: "PEP", valor: "—" },
  ];
  const empresa: { label: string; valor: string }[] = [
    { label: "CUIT de la empresa", valor: "—" },
    { label: "Tipo de empresa", valor: "—" },
    { label: "Nombre legal", valor: c.tipoPersona === "juridica" ? c.nombre : "—" },
    { label: "Nombre comercial", valor: "—" },
    { label: "Fecha de inscripción", valor: "—" },
  ];
  return { personal, compliance, empresa };
}

function SubcuentasTab({
  legajo,
  onEximirCuit,
}: {
  legajo: string;
  onEximirCuit: () => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [masivaOpen, setMasivaOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    cbu: "",
    tipo: "Operativa" as SubcuentaTipo,
    estado: "Activa" as SubcuentaEstado,
  });

  const query = useQuery({
    queryKey: ["subcuentas", legajo],
    queryFn: () => listSubcuentas(legajo),
    enabled: !!legajo,
  });

  const subcuentas = query.data ?? [];
  const totalSubcuentas = subcuentas.length;

  const guardar = async () => {
    if (!form.nombre.trim() || !form.email.trim()) {
      setErr("Nombre y email son obligatorios.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await createSubcuenta(legajo, {
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email,
        cbu: form.cbu,
        tipo: form.tipo,
        estado: form.estado,
      });
      await queryClient.invalidateQueries({ queryKey: ["subcuentas", legajo] });
      setOpen(false);
      setForm({
        nombre: "",
        apellido: "",
        email: "",
        cbu: "",
        tipo: "Operativa",
        estado: "Activa",
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Seccion
      titulo="Subcuentas y CVUs"
      loading={query.isLoading}
      error={query.isError ? query.error : null}
      onRetry={() => query.refetch()}
      vacio={!query.isLoading && (query.data?.length ?? 0) === 0}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard label="CVUs informadas" value={String(totalSubcuentas)} />
        <KpiCard label="Máximo de subcuentas" value="—" />
        <KpiCard label="Redirección automática" value="Inactiva" tone="muted" />
        <KpiCard label="Presión operativa" value="Sin tope" tone="muted" />
      </div>

      <div className="flex flex-wrap justify-end gap-2 mb-3">
        <button
          type="button"
          onClick={onEximirCuit}
          className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input px-3 text-sm font-medium text-foreground hover:bg-accent"
        >
          <Ban size={16} /> Eximir CUIT principal
        </button>
        <button
          type="button"
          onClick={() => setMasivaOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input px-3 text-sm font-medium text-foreground hover:bg-accent"
        >
          <FileUp size={16} /> Carga masiva de subcuentas
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
        >
          <Plus size={16} /> Cargar subcuenta
        </button>
      </div>

      <CargaMasivaSubcuentas
        open={masivaOpen}
        legajo={legajo}
        onClose={() => setMasivaOpen(false)}
        onDone={() => {
          setMasivaOpen(false);
          queryClient.invalidateQueries({ queryKey: ["subcuentas", legajo] });
        }}
      />
      {open && (
        <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="rounded-md border border-input px-3 py-2 text-sm"
            placeholder="Nombre *"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
          <input
            className="rounded-md border border-input px-3 py-2 text-sm"
            placeholder="Apellido"
            value={form.apellido}
            onChange={(e) => setForm({ ...form, apellido: e.target.value })}
          />
          <input
            className="rounded-md border border-input px-3 py-2 text-sm"
            placeholder="Email *"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="rounded-md border border-input px-3 py-2 text-sm"
            placeholder="CBU"
            value={form.cbu}
            onChange={(e) => setForm({ ...form, cbu: e.target.value })}
          />
          <select
            className="rounded-md border border-input px-3 py-2 text-sm"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value as SubcuentaTipo })}
          >
            <option value="Operativa">Operativa</option>
            <option value="Recaudacion">Recaudación</option>
            <option value="Garantias">Garantías</option>
            <option value="Sueldos">Sueldos</option>
          </select>
          <select
            className="rounded-md border border-input px-3 py-2 text-sm"
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value as SubcuentaEstado })}
          >
            <option value="Activa">Activa</option>
            <option value="Pausada">Pausada</option>
          </select>
          {err && <p className="text-sm text-red-600 md:col-span-2">{err}</p>}
          <div className="md:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-9 rounded-md border border-input px-3 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={saving}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      )}
      <TablaSubcuentas rows={query.data ?? []} />
    </Seccion>
  );
}

function DocumentosTab({ legajo }: { legajo: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tipo, setTipo] = useState<DocumentoTipo>("id_frente");
  const [url, setUrl] = useState("");

  const query = useQuery({
    queryKey: ["documentos", legajo],
    queryFn: () => listDocumentos(legajo),
    enabled: !!legajo,
  });

  const docs = query.data ?? [];
  const imagenes = imagenesParaLegajo(legajo);
  const tipos: DocumentoTipo[] = ["id_frente", "id_dorso", "servicio", "selfie"];

  const guardar = async () => {
    setSaving(true);
    setErr(null);
    try {
      await createDocumento(legajo, { tipo, url });
      await queryClient.invalidateQueries({ queryKey: ["documentos", legajo] });
      setOpen(false);
      setUrl("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Seccion
      titulo="Documentos"
      loading={query.isLoading}
      error={query.isError ? query.error : null}
      onRetry={() => query.refetch()}
      vacio={!query.isLoading && docs.length === 0 && imagenes.length === 0}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {imagenes.map((img) => (
          <div
            key={img.url}
            className="overflow-hidden rounded-xl border border-border bg-card p-0"
          >
            <div className="h-32 w-full bg-muted">
              <img src={img.url} alt={img.label} className="h-full w-full object-cover" />
            </div>
            <p className="px-4 py-2 text-sm font-semibold">{img.label}</p>
          </div>
        ))}
        {docs.map((d) => (
          <div key={d.id} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">{DOCUMENTO_LABELS[d.tipo] ?? d.tipo}</p>
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2 break-all">{d.url}</p>
            {d.url && (
              <a
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs font-medium text-primary"
              >
                Ver documento
              </a>
            )}
          </div>
        ))}
        {imagenes.length === 0 && docs.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Fotos no agregadas
          </div>
        )}
      </div>
      <div className="flex justify-end mt-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
        >
          <Plus size={16} /> Subir documento
        </button>
      </div>
      {open && (
        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            className="rounded-md border border-input px-3 py-2 text-sm"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as DocumentoTipo)}
          >
            {tipos.map((t) => (
              <option key={t} value={t}>
                {DOCUMENTO_LABELS[t]}
              </option>
            ))}
          </select>
          <input
            className="rounded-md border border-input px-3 py-2 text-sm"
            placeholder="URL del documento"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          {err && <p className="text-sm text-red-600 md:col-span-2">{err}</p>}
          <div className="md:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-9 rounded-md border border-input px-3 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={saving}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      )}
    </Seccion>
  );
}

function ParametrosEditorModal({
  open,
  onClose,
  title,
  legajo,
  defs,
  stored,
  kind,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  legajo: string;
  defs: ParamDef[];
  stored: ParametroConfig[];
  kind: "alerta" | "bloqueo";
}) {
  const queryClient = useQueryClient();
  const [vals, setVals] = useState<
    Record<string, { habilitado: boolean; valor: string; periodo: string }>
  >({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (open && Object.keys(vals).length === 0) {
    const init: Record<string, { habilitado: boolean; valor: string; periodo: string }> = {};
    for (const d of defs) {
      const s = stored.find((p) => p.clave === d.clave);
      init[d.clave] = {
        habilitado: s ? s.habilitado : false,
        valor: s?.valor ?? d.valorDefecto ?? "",
        periodo: s?.periodo ?? d.periodoDefecto ?? "",
      };
    }
    setVals(init);
  }

  const guardar = async () => {
    setSaving(true);
    setErr(null);
    try {
      for (const d of defs) {
        const v = vals[d.clave];
        if (kind === "alerta") {
          await upsertParametroAlerta(legajo, d.clave, {
            habilitado: v.habilitado,
            valor: v.valor || null,
            periodo: v.periodo || null,
          });
        } else {
          await upsertParametroBloqueo(legajo, d.clave, {
            habilitado: v.habilitado,
            valor: v.valor || null,
            periodo: v.periodo || null,
          });
        }
      }
      await queryClient.invalidateQueries({
        queryKey: [kind === "alerta" ? "param_alertas" : "param_bloqueos", legajo],
      });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalDialog open={open} onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        {defs.map((d) => {
          const v = vals[d.clave] ?? { habilitado: false, valor: "", periodo: "" };
          return (
            <div key={d.clave} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{d.etiqueta}</span>
                <Toggle
                  enabled={v.habilitado}
                  onChange={(nv) =>
                    setVals((prev) => ({ ...prev, [d.clave]: { ...v, habilitado: nv } }))
                  }
                />
              </div>
              {(d.tipo === "switch_valor" ||
                d.tipo === "switch_porcentaje" ||
                d.tipo === "switch_cantidad_periodo") && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {d.tipo === "switch_cantidad_periodo" ? (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          disabled={!v.habilitado}
                          value={v.valor}
                          onChange={(e) =>
                            setVals((prev) => ({
                              ...prev,
                              [d.clave]: { ...v, valor: e.target.value },
                            }))
                          }
                          className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Período
                        </label>
                        <input
                          type="text"
                          disabled={!v.habilitado}
                          value={v.periodo}
                          onChange={(e) =>
                            setVals((prev) => ({
                              ...prev,
                              [d.clave]: { ...v, periodo: e.target.value },
                            }))
                          }
                          placeholder="ej. 24h"
                          className="h-9 w-28 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-muted-foreground">
                        {d.tipo === "switch_porcentaje" ? "Porcentaje" : "Monto"}
                      </label>
                      <input
                        type="number"
                        disabled={!v.habilitado}
                        value={v.valor}
                        onChange={(e) =>
                          setVals((prev) => ({
                            ...prev,
                            [d.clave]: { ...v, valor: e.target.value },
                          }))
                        }
                        className="h-9 w-32 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
                      />
                      {d.unidad && (
                        <span className="text-xs text-muted-foreground">{d.unidad}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-input px-3 text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={saving}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

function ApiUsuariosModal({
  open,
  onClose,
  cantidad,
}: {
  open: boolean;
  onClose: () => void;
  cantidad: number;
}) {
  const query = useQuery({
    queryKey: ["api_usuarios", "popup"],
    queryFn: () => listApiUsuarios({ page: 0, pageSize: 25 }),
    enabled: open,
  });
  const [detalle, setDetalle] = useState<{
    id: string;
    codigoUsuarioApi: string;
    usuario: string;
    nombreCompleto: string;
    estado: string;
  } | null>(null);

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title="Usuarios API asociados"
      description={`${cantidad} usuario(s) asociado(s) a la API externa`}
      size="xl"
    >
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : query.isError ? (
        <p className="text-sm text-red-600">{(query.error as Error).message}</p>
      ) : (query.data?.rows.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-8 text-sm text-muted-foreground">
          <Inbox size={22} />
          <p>Sin usuarios API asociados.</p>
        </div>
      ) : (
        <DataTable
          columns={apiUsuariosColumns}
          data={query.data!.rows}
          keyExtractor={(u) => u.id}
          emptyMessage="Sin usuarios API"
          actions={(u) => (
            <button
              type="button"
              onClick={() => setDetalle(u)}
              className="inline-flex items-center gap-1 h-8 rounded-md border border-input px-2 text-xs font-medium text-foreground hover:bg-accent"
            >
              Ver detalle
            </button>
          )}
        />
      )}

      <ApiDetalleModal
        open={!!detalle}
        onClose={() => setDetalle(null)}
        apiUsuarioId={detalle?.id ?? null}
        cantidad={cantidad}
      />
    </ModalDialog>
  );
}

function CargaMasivaSubcuentas({
  open,
  legajo,
  onClose,
  onDone,
}: {
  open: boolean;
  legajo: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState<SubcuentaInput[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parseCSV = (text: string): SubcuentaInput[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];
    const header = lines[0].toLowerCase();
    const hasHeader = /nombre|email/.test(header);
    const data = hasHeader ? lines.slice(1) : lines;
    return data.map((l) => {
      const cols = l.split(/[,;]/).map((c) => c.trim().replace(/^"|"$/g, ""));
      const [nombre, apellido = "", email, cbu = "", tipo = "Operativa"] = cols;
      return {
        nombre,
        apellido,
        email,
        cbu: cbu || undefined,
        tipo: (tipo as SubcuentaTipo) || "Operativa",
      };
    });
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setArchivo(f);
    setErr(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setVista(parseCSV(String(reader.result)));
      } catch {
        setErr("No se pudo leer el archivo CSV.");
      }
    };
    reader.readAsText(f);
  };

  const guardar = async () => {
    if (vista.length === 0) {
      setErr("El CSV no contiene filas válidas (se espera nombre, email, ...).");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      for (const row of vista) {
        if (!row.nombre.trim() || !row.email.trim()) continue;
        await createSubcuenta(legajo, row);
      }
      await queryClient.invalidateQueries({ queryKey: ["subcuentas", legajo] });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title="Carga masiva de subcuentas"
      size="lg"
    >
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Columnas esperadas: <code>nombre, apellido, email, cbu, tipo</code>. La primera fila
          puede ser el encabezado.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
        />
        {vista.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {vista.length} fila(s) detectada(s).
          </p>
        )}
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-input px-3 text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={saving || vista.length === 0}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Importando…" : "Importar"}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

function ExencionModal({
  open,
  onClose,
  legajo,
  cuitDefault,
}: {
  open: boolean;
  onClose: () => void;
  legajo: string;
  cuitDefault: string;
}) {
  const queryClient = useQueryClient();
  const [cuit, setCuit] = useState(cuitDefault);
  const [direccion, setDireccion] = useState<ExencionDireccion>("Ambos");
  const [motivo, setMotivo] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    setSaving(true);
    setErr(null);
    try {
      await crearExencion(legajo, {
        cuit: cuit || cuitDefault,
        direccion,
        motivo,
        vigenciaDesde: desde || null,
        vigenciaHasta: hasta || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["exenciones", legajo] });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title="Nueva excención de Débitos y Créditos"
      size="lg"
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">CUIT</label>
          <input
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            placeholder="CUIT"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Dirección
          </label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value as ExencionDireccion)}
          >
            <option value="Entrantes">Entrantes</option>
            <option value="Salientes">Salientes</option>
            <option value="Ambos">Ambos</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Motivo</label>
          <textarea
            className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo de la exención"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Vigencia desde
          </label>
          <input
            type="date"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Vigencia hasta
          </label>
          <textarea
            className="min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            placeholder="Vigencia hasta"
          />
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            Si no completás la fecha desde, el backend toma la fecha actual. Si no completás la
            fecha hasta, la exención queda abierta.
          </span>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-input px-3 text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={saving}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Creando…" : "Crear exención"}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

function ApiDetalleModal({
  open,
  onClose,
  apiUsuarioId,
  cantidad,
}: {
  open: boolean;
  onClose: () => void;
  apiUsuarioId: string | null;
  cantidad: number;
}) {
  const usuarioQuery = useQuery({
    queryKey: ["api_usuarios", "detalle", apiUsuarioId],
    queryFn: () => listApiUsuarios({ page: 0, pageSize: 25 }),
    enabled: open,
  });
  const usuario = apiUsuarioId
    ? (usuarioQuery.data?.rows ?? []).find((u) => u.id === apiUsuarioId)
    : (usuarioQuery.data?.rows ?? [])[0];
  const effectiveId = apiUsuarioId ?? usuario?.id ?? null;
  const endpointsQuery = useQuery({
    queryKey: ["api_endpoints", effectiveId],
    queryFn: () => listApiUsuarioEndpoints(effectiveId ?? ""),
    enabled: open && !!effectiveId,
  });
  const logsQuery = useQuery({
    queryKey: ["api_logs", effectiveId],
    queryFn: () => listApiUsuarioLogs(effectiveId ?? ""),
    enabled: open && !!effectiveId,
  });
  const [logDetalle, setLogDetalle] = useState<ApiUsuarioLog | null>(null);
  const queryClient = useQueryClient();
  const credencialActiva =
    usuario?.estado === "Producción" || usuario?.estado === "Homologación";
  const cambiarCredencial = useMutation({
    mutationFn: (estado: EstadoApiUsuario) =>
      setApiUsuarioEstado(effectiveId!, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api_usuarios"] });
    },
  });

  return (
    <ModalDialog open={open} onClose={onClose} title="Detalle de API externa" size="xl">
      <div className="space-y-5">
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Información del Usuario
          </h4>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 text-sm">
            <div className="flex justify-between gap-2 border-b border-border pb-1">
              <dt className="text-muted-foreground">ID</dt>
              <dd className="font-medium">{usuario?.id ?? apiUsuarioId ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-border pb-1">
              <dt className="text-muted-foreground">Nombre</dt>
              <dd className="font-medium">{usuario?.nombreCompleto ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-border pb-1">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{usuario?.usuario ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-border pb-1">
              <dt className="text-muted-foreground">Estado</dt>
              <dd>
                <Badge tone={usuario?.estado === "Producción" ? "success" : "warn"}>
                  {usuario?.estado ?? "—"}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-border pb-1">
              <dt className="text-muted-foreground">Descripción</dt>
              <dd className="font-medium text-right">
                Creado a través de solicitud de registro de usuario.
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-border pb-1">
              <dt className="text-muted-foreground">Creado</dt>
              <dd className="font-medium">{fmtFechaHora(usuario?.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-border pb-1">
              <dt className="text-muted-foreground">Actualizado</dt>
              <dd className="font-medium">{fmtFechaHora(usuario?.updatedAt)}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-border pb-1">
              <dt className="text-muted-foreground">Acciones</dt>
              <dd className="flex flex-wrap gap-1">
                {["Homologación", "Producción", "Suspender", "Eliminar"].map((a) => (
                  <span
                    key={a}
                    className="rounded-md border border-input px-2 py-0.5 text-xs font-medium"
                  >
                    {a}
                  </span>
                ))}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-border pb-1">
              <dt className="text-muted-foreground">Usuarios asociados</dt>
              <dd className="font-medium tabular-nums">{cantidad}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Credenciales del usuario
          </h4>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 text-sm">
            <div className="flex justify-between gap-2 border-b border-border pb-1">
              <dt className="text-muted-foreground">Nombre</dt>
              <dd className="font-medium">{usuario?.nombreCompleto ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-border pb-1">
              <dt className="text-muted-foreground">Clave pública</dt>
              <dd className="font-medium font-mono break-all">{usuario?.codigoUsuarioApi ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-border pb-1">
              <dt className="text-muted-foreground">Descripción</dt>
              <dd className="font-medium text-right">
                Creado a través de solicitud de registro de usuario.
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-border pb-1">
              <dt className="text-muted-foreground">Fecha de creación</dt>
              <dd className="font-medium">{fmtFechaHora(usuario?.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-border pb-1">
              <dt className="text-muted-foreground">Estado</dt>
              <dd>
                <Badge tone={credencialActiva ? "success" : "danger"}>
                  {credencialActiva ? "Activa" : "Inactiva"}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-border pb-1">
              <dt className="text-muted-foreground">Acciones</dt>
              <dd className="flex flex-wrap gap-1">
                {credencialActiva ? (
                  <button
                    type="button"
                    disabled={cambiarCredencial.isPending || !effectiveId}
                    onClick={() => cambiarCredencial.mutate("Suspendido")}
                    className="inline-flex h-7 items-center rounded-md border border-input px-2 text-xs font-medium hover:bg-accent disabled:opacity-50"
                  >
                    Desactivar
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={cambiarCredencial.isPending || !effectiveId}
                    onClick={() => cambiarCredencial.mutate("Producción")}
                    className="inline-flex h-7 items-center rounded-md border border-input px-2 text-xs font-medium hover:bg-accent disabled:opacity-50"
                  >
                    Activar
                  </button>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Endpoints del usuario
          </h4>
          {endpointsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : endpointsQuery.isError ? (
            <p className="text-sm text-muted-foreground">Sin endpoints configurados.</p>
          ) : (endpointsQuery.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Sin endpoints configurados.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-1.5 font-medium">Grupo</th>
                    <th className="px-2 py-1.5 font-medium">Método</th>
                    <th className="px-2 py-1.5 font-medium">Endpoint</th>
                    <th className="px-2 py-1.5 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {endpointsQuery.data!.map((ep) => (
                    <tr key={ep.id} className="border-b border-border last:border-b-0">
                      <td className="px-2 py-1.5">{ep.grupo}</td>
                      <td className="px-2 py-1.5 font-mono">{ep.metodo}</td>
                      <td className="px-2 py-1.5 font-mono break-all">{ep.path}</td>
                      <td className="px-2 py-1.5">
                        <Badge tone={ep.estado === "Habilitado" ? "success" : "neutral"}>
                          {ep.estado}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Logs de actividad
          </h4>
          {logsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : logsQuery.isError ? (
            <p className="text-sm text-muted-foreground">Sin logs registrados.</p>
          ) : (logsQuery.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Sin logs registrados.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-1.5 font-medium">Fecha y hora</th>
                    <th className="px-2 py-1.5 font-medium">IP</th>
                    <th className="px-2 py-1.5 font-medium">ID de cliente</th>
                    <th className="px-2 py-1.5 font-medium">Método</th>
                    <th className="px-2 py-1.5 font-medium">Endpoint</th>
                    <th className="px-2 py-1.5 font-medium">Status</th>
                    <th className="px-2 py-1.5 font-medium">Tiempo</th>
                    <th className="px-2 py-1.5 font-medium">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {logsQuery.data!.map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-b-0">
                      <td className="px-2 py-1.5 whitespace-nowrap">{log.fechaHora}</td>
                      <td className="px-2 py-1.5 font-mono">{log.ip}</td>
                      <td className="px-2 py-1.5 font-mono">{log.clienteId}</td>
                      <td className="px-2 py-1.5 font-mono">{log.metodo}</td>
                      <td className="px-2 py-1.5 font-mono break-all">{log.endpoint}</td>
                      <td className="px-2 py-1.5">
                        <Badge tone={log.status >= 400 ? "danger" : "success"}>
                          {log.status === 0 ? "—" : log.status}
                        </Badge>
                      </td>
                      <td className="px-2 py-1.5 tabular-nums">{log.tiempoRespuestaMs}ms</td>
                      <td className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => setLogDetalle(log)}
                          className="inline-flex items-center gap-1 h-7 rounded-md border border-input px-2 text-xs font-medium text-foreground hover:bg-accent"
                        >
                          <Eye size={12} /> Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ModalDialog
        open={!!logDetalle}
        onClose={() => setLogDetalle(null)}
        title="Detalle de log"
        size="lg"
      >
        {logDetalle && (
          <div className="space-y-3 text-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Información General
            </h4>
            <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
              <div className="flex justify-between gap-2 border-b border-border pb-1">
                <span className="text-muted-foreground">ID</span>
                <span className="font-medium">{logDetalle.id}</span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border pb-1">
                <span className="text-muted-foreground">Usuario ID</span>
                <span className="font-medium">{logDetalle.detalle.usuarioId}</span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border pb-1">
                <span className="text-muted-foreground">Client ID</span>
                <span className="font-medium">{logDetalle.detalle.clientId ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border pb-1">
                <span className="text-muted-foreground">IP Address</span>
                <span className="font-medium font-mono">{logDetalle.detalle.ip}</span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border pb-1">
                <span className="text-muted-foreground">Método HTTP</span>
                <span className="font-medium">{logDetalle.detalle.metodoHttp}</span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border pb-1">
                <span className="text-muted-foreground">Estado HTTP</span>
                <span className="font-medium">{logDetalle.detalle.estadoHttp}</span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border pb-1">
                <span className="text-muted-foreground">Endpoint</span>
                <span className="font-medium font-mono break-all">{logDetalle.detalle.endpoint}</span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border pb-1">
                <span className="text-muted-foreground">Tiempo de Respuesta</span>
                <span className="font-medium">{logDetalle.detalle.tiempoRespuesta}</span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border pb-1">
                <span className="text-muted-foreground">User Agent</span>
                <span className="font-medium break-all">{logDetalle.detalle.userAgent}</span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border pb-1">
                <span className="text-muted-foreground">Fecha</span>
                <span className="font-medium">{logDetalle.detalle.fecha}</span>
              </div>
            </div>
            <DetalleJson titulo="Request Headers" data={logDetalle.detalle.requestHeaders} />
            <DetalleJson titulo="Request Params" data={logDetalle.detalle.requestParams} />
            <DetalleJson titulo="Request Query" data={logDetalle.detalle.requestQuery} />
            <DetalleJson titulo="Request Body" data={logDetalle.detalle.requestBody} />
            <DetalleJson titulo="Response Body" data={logDetalle.detalle.responseBody} />
          </div>
        )}
      </ModalDialog>
    </ModalDialog>
  );
}

function DetalleJson({ titulo, data }: { titulo: string; data: unknown }) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </p>
      <pre className="max-h-48 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
        {text}
      </pre>
    </div>
  );
}

function ClienteDetailPage() {
  const { legajo } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = useCan();
  const puedeModificar = can("modificar", "usuarios");

  const { cliente: clienteReal, isLoading, isError, error, refetch } = useClienteByLegajo(
    legajo ?? null,
  );

  // Las personas jurídicas de la lista son mock; si el backend no tiene la fila
  // pero coincide con el catálogo mock, sintetizamos un cliente para poder
  // visualizar la ficha (evita el error "No se encontró ningún cliente").
  const clienteMock = legajo ? findJuridicaMock(legajo) : undefined;
  const cliente: Cliente | null =
    clienteReal ??
    (clienteMock
      ? {
          id: clienteMock.legajo,
          legajo: clienteMock.legajo,
          tipoPersona: "juridica",
          correo: clienteMock.correo,
          nombre: clienteMock.razonSocial,
          cuit: clienteMock.cuit,
          estado:
            clienteMock.estado === "Suspendido"
              ? "suspendido"
              : clienteMock.estado === "Rechazado"
                ? "rechazado"
                : "activo",
          fechaAlta: clienteMock.fechaRegistro,
          createdAt: "",
          updatedAt: "",
        }
      : null);

  const movimientosQuery = useMovimientos({
    page: 0,
    pageSize: 10,
    legajo: legajo ?? undefined,
  });
  const impuestosQuery = useImpuestosAsignaciones({
    page: 0,
    pageSize: 25,
    cliente_legajo: legajo ?? undefined,
  });
  const subcuentasQuery = useQuery({
    queryKey: ["subcuentas", legajo],
    queryFn: () => listSubcuentas(legajo),
    enabled: !!cliente,
  });
  const comisionesQuery = useQuery({
    queryKey: ["comisiones_cliente", legajo],
    queryFn: () => listComisionesCliente(legajo),
    enabled: !!cliente,
  });
  const documentosResumenQuery = useQuery({
    queryKey: ["documentos", legajo],
    queryFn: () => listDocumentos(legajo),
    enabled: !!cliente,
  });

  const historialCambiosQuery = useQuery({
    queryKey: ["historial_cambios", legajo],
    queryFn: () => listHistorialCambios(legajo),
    enabled: !!cliente,
  });
  const validacionesQuery = useQuery({
    queryKey: ["validaciones", legajo],
    queryFn: () => listValidaciones(legajo),
    enabled: !!cliente,
  });
  const alertasQuery = useQuery({
    queryKey: ["alertas", legajo],
    queryFn: () => listAlertas(legajo),
    enabled: !!cliente,
  });
  const bloqueosQuery = useQuery({
    queryKey: ["bloqueos", legajo],
    queryFn: () => listBloqueos(legajo),
    enabled: !!cliente,
  });
  const modulosQuery = useQuery({
    queryKey: ["cliente_modulos", legajo],
    queryFn: () => listClienteModulos(legajo),
    enabled: !!cliente,
  });
  const paramAlertasQuery = useQuery({
    queryKey: ["param_alertas", legajo],
    queryFn: () => listParametrosAlertas(legajo),
    enabled: !!cliente,
  });
  const paramBloqueosQuery = useQuery({
    queryKey: ["param_bloqueos", legajo],
    queryFn: () => listParametrosBloqueos(legajo),
    enabled: !!cliente,
  });
  const comerciosPstQuery = useQuery({
    queryKey: ["comercios_pst", legajo],
    queryFn: () => listComerciosPst(legajo),
    enabled: !!cliente,
  });
  const linksPagoQuery = useQuery({
    queryKey: ["links_pago", legajo],
    queryFn: () => listLinksPago(legajo),
    enabled: !!cliente,
  });

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("identificacion");
  const [riesgoSub, setRiesgoSub] = useState<"alertas" | "bloqueos">("alertas");

  const [editAlertasOpen, setEditAlertasOpen] = useState(false);
  const [editBloqueosOpen, setEditBloqueosOpen] = useState(false);

  const [pstOpen, setPstOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);
  const [apiDetalleOpen, setApiDetalleOpen] = useState(false);
  const [exencionOpen, setExencionOpen] = useState(false);

  const [movDetail, setMovDetail] = useState<DetailMovimiento | null>(null);
  const [impuestoDetail, setImpuestoDetail] = useState<ImpuestoAsignacion | null>(null);
  const [estadoTarget, setEstadoTarget] = useState<{
    dbId: string;
    estadoActual: string;
    nuevoId: number;
  } | null>(null);

  const { data: catalogoEstados = [] } = useEstadosMovimiento();
  const cambiarMovimientoEstado = useCambiarEstadoMovimiento();

  const [gestionTarget, setGestionTarget] = useState<{ id: string; resumen: string } | null>(null);
  const [gestiones, setGestiones] = useState<Record<string, GestionAlerta>>({});

  const [forzando, setForzando] = useState(false);

  const cambiarEstado = async (c: Cliente, nuevo: EstadoCliente) => {
    try {
      await updateClienteEstado(c.id, nuevo);
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    } catch (e) {
      setConfirmAction({
        title: "No se pudo actualizar",
        message: (e as Error).message,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const forzarNuevaValidacion = async () => {
    setForzando(true);
    try {
      await forzarValidacion(legajo);
      await validacionesQuery.refetch();
    } catch (e) {
      setConfirmAction({
        title: "No se pudo forzar la validación",
        message: (e as Error).message,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    } finally {
      setForzando(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Ficha de cliente" />
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando cliente…
        </div>
      </>
    );
  }

  if (isError) {
    const err = error instanceof DataAccessError ? error : null;
    return (
      <>
        <PageHeader
          title="Ficha de cliente"
          action={
            <Link
              to="/admin/general/usuarios"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
            >
              <ChevronLeft size={16} /> Volver a usuarios
            </Link>
          }
        />
        <div
          className={`flex flex-col items-center justify-center gap-3 rounded-xl px-6 py-12 text-center text-sm ${
            err?.permission
              ? "border border-amber-300 bg-amber-50 text-amber-800"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <AlertTriangle size={28} />
          <div>
            <p className="font-semibold">
              {err?.permission
                ? "No tenés permiso para ver esto"
                : "Ocurrió un error al cargar el cliente"}
            </p>
            <p className="mt-1">{error?.message ?? "Error desconocido"}</p>
          </div>
          {!err?.permission && (
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Reintentar
            </button>
          )}
        </div>
      </>
    );
  }

  if (!cliente) {
    return (
      <>
        <PageHeader
          title="Cliente no encontrado"
          action={
            <Link
              to="/admin/general/usuarios"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
            >
              <ChevronLeft size={16} /> Volver a usuarios
            </Link>
          }
        />
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <Inbox size={28} />
          <p>No se encontró ningún cliente con legajo “{legajo ?? ""}”.</p>
          <Link
            to="/admin/general/usuarios"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            <ChevronLeft size={16} /> Volver a la lista de usuarios
          </Link>
        </div>
      </>
    );
  }

  const backToList = () =>
    navigate({
      to:
        cliente.tipoPersona === "juridica"
          ? "/admin/general/usuarios/juridicas"
          : "/admin/general/usuarios",
    });

  const { personal, compliance } = camposIdentificacion(cliente);

  const tabLabel = (t: { key: TabKey; label: string }) => {
    if (t.key === "identificacion") {
      return cliente.tipoPersona === "juridica" ? "Datos de persona jurídica" : "Datos personales";
    }
    return t.label;
  };

  const modulosData = modulosQuery.data ?? [];
  const moduloByClave = (clave: string) => modulosData.find((m) => m.clave === clave);
  const pstModulo = moduloByClave("pct");
  const blpModulo = moduloByClave("blp");
  const apiModulo = moduloByClave("api");
  const comerciosPst = comerciosPstQuery.data ?? [];
  const linksPago = linksPagoQuery.data ?? [];

  const alertasHabilitadas = (paramAlertasQuery.data ?? []).filter((p) => p.habilitado).length;
  const bloqueosHabilitados = (paramBloqueosQuery.data ?? []).filter((p) => p.habilitado).length;

  const alertasVisibles: AlertaView[] = (alertasQuery.data ?? []).map((a) => {
    const g = gestiones[a.id];
    return { ...a, estado: g ? "Resuelto" : a.estado, fechaAceptacion: g?.fecha };
  });
  const bloqueosVisibles: BloqueoView[] = (bloqueosQuery.data ?? []).map((b) => {
    const g = gestiones[b.id];
    return { ...b, estado: g ? "Desbloqueado" : b.estado, fechaAceptacion: g?.fecha };
  });

  return (
    <PermissionGuard recurso="usuarios">
      <div className="w-full">
        <button
          type="button"
          onClick={backToList}
          className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          <ChevronLeft size={16} />
          Volver a la lista
        </button>

        <div className="min-w-0 mt-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl md:text-2xl font-semibold tracking-tight text-foreground truncate">
              {cliente.nombre}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {cliente.legajo} · {cliente.correo}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={estadoTone[cliente.estado] ?? "neutral"}>
              {estadoLabel[cliente.estado] ?? cliente.estado}
            </Badge>
            {cliente.estado === "activo"
              ? puedeModificar && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmAction({
                        title: "Suspender cliente",
                        message: `¿Estás seguro de suspender a ${cliente.nombre}?`,
                        confirmLabel: "Suspender",
                        variant: "danger",
                        onConfirm: () => {
                          setConfirmAction(null);
                          void cambiarEstado(cliente, "suspendido");
                        },
                      })
                    }
                    className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground hover:bg-accent"
                  >
                    Suspender
                  </button>
                )
              : puedeModificar && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmAction({
                        title: "Reactivar cliente",
                        message: `¿Estás seguro de reactivar a ${cliente.nombre}?`,
                        confirmLabel: "Reactivar",
                        variant: "default",
                        onConfirm: () => {
                          setConfirmAction(null);
                          void cambiarEstado(cliente, "activo");
                        },
                      })
                    }
                    className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground hover:bg-accent"
                  >
                    Reactivar
                  </button>
                )}
          </div>
        </div>

        {/* --- Tabs --- */}
        <div className="mt-6 flex flex-wrap gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                activeTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabLabel(t)}
            </button>
          ))}
        </div>

        <div className="mt-2">
          {activeTab === "identificacion" && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SectionCard title="Resumen de productos">
                  <ul className="space-y-1.5">
                    <li className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Cuentas bancarias</span>
                      <span className="font-semibold tabular-nums">
                        {subcuentasQuery.data ? subcuentasQuery.data.length : "—"}
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">CVUs</span>
                      <span className="font-semibold tabular-nums">
                        {subcuentasQuery.data?.length ?? "—"}
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Comisiones</span>
                      <span className="font-semibold tabular-nums">
                        {comisionesQuery.data ? comisionesQuery.data.length : "—"}
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Impuestos</span>
                      <span className="font-semibold tabular-nums">
                        {impuestosQuery.rows.length}
                      </span>
                    </li>
                  </ul>
                </SectionCard>

                <KpiCard
                  label="Documentos cargados"
                  value={String(documentosResumenQuery.data?.length ?? 0)}
                />
                <KpiCard
                  label="Validaciones auto KYC"
                  value={String(validacionesQuery.data?.length ?? 0)}
                />
                <KpiCard
                  label="PEP"
                  value={compliance.find((c) => c.label === "PEP")?.valor ?? "No"}
                  tone="muted"
                />
              </div>

              <SectionCard
                title="Identificación"
                actions={
                  <button
                    type="button"
                    onClick={() => setExencionOpen(true)}
                    className="inline-flex items-center gap-1.5 h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
                  >
                    <Ban size={13} /> Eximir créditos
                  </button>
                }
              >
                <FieldGrid campos={personal} />
              </SectionCard>
            </>
          )}

          {activeTab === "movimientos" && (
            <Seccion
              titulo="Movimientos recientes (últimos 10)"
              loading={movimientosQuery.isLoading}
              error={movimientosQuery.isError ? movimientosQuery.error : null}
              onRetry={movimientosQuery.refetch}
              vacio={movimientosQuery.rows.length === 0}
            >
              <TablaMovimientos
                rows={movimientosQuery.rows}
                onVerDetalles={(m) => setMovDetail(toDetalleMovimiento(m, catalogoEstados))}
                onCambiarEstado={(m) =>
                  setEstadoTarget({
                    dbId: m.id,
                    estadoActual: resolverEstadoMovimiento(m, catalogoEstados).codigo,
                    nuevoId: m.estadoId ?? 0,
                  })
                }
                onVerCliente={(m) =>
                  navigate({
                    to: "/admin/general/movimientos",
                    search: { legajo: m.legajo },
                  })
                }
              />
            </Seccion>
          )}

          {activeTab === "impuestos" && (
            <Seccion
              titulo="Impuestos asignados"
              loading={impuestosQuery.isLoading}
              error={impuestosQuery.isError ? impuestosQuery.error : null}
              onRetry={impuestosQuery.refetch}
              vacio={impuestosQuery.rows.length === 0}
            >
              <TablaImpuestos
                rows={impuestosQuery.rows}
                onVerDetalles={(a) => setImpuestoDetail(a)}
                onVerCliente={(a) =>
                  navigate({
                    to: "/admin/general/movimientos",
                    search: { legajo: a.clienteLegajo },
                  })
                }
              />
            </Seccion>
          )}

          {activeTab === "subcuentas" && (
            <SubcuentasTab legajo={cliente.legajo} onEximirCuit={() => setExencionOpen(true)} />
          )}

          {activeTab === "documentos" && <DocumentosTab legajo={cliente.legajo} />}

          {activeTab === "validaciones" && (
            <Seccion
              titulo="Validaciones automáticas"
              loading={validacionesQuery.isLoading}
              error={validacionesQuery.isError ? validacionesQuery.error : null}
              onRetry={validacionesQuery.refetch}
              vacio={!validacionesQuery.isLoading && (validacionesQuery.data?.length ?? 0) === 0}
            >
              <div className="flex flex-wrap items-center justify-end gap-2 mb-3">
                <button
                  type="button"
                  onClick={forzarNuevaValidacion}
                  disabled={forzando}
                  className="inline-flex items-center gap-1.5 h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  <RefreshCw size={16} className={forzando ? "animate-spin" : ""} /> Forzar nueva
                  validación
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadCSV("validaciones.csv", [
                      ["Proveedor", "Estado", "Fecha"],
                      ...(validacionesQuery.data ?? []).map((v) => [v.proveedor, v.estado, v.fecha]),
                    ])
                  }
                  className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input px-3 text-sm font-medium text-foreground hover:bg-accent"
                >
                  <Download size={16} /> Descargar CSV
                </button>
              </div>
              <DataTable
                columns={validacionesColumns}
                data={validacionesQuery.data ?? []}
                keyExtractor={(v) => v.id}
                emptyMessage="Sin validaciones para este cliente"
              />
            </Seccion>
          )}

          {activeTab === "contexto" && (
            <section className="mt-6">
              <h2 className="font-display text-base font-semibold text-foreground mb-3">
                Contexto operativo
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                <KpiCard
                  label="CVUs"
                  value={
                    subcuentasQuery.isError
                      ? "Por definir"
                      : String(subcuentasQuery.data?.length ?? 0)
                  }
                />
                <KpiCard
                  label="Comisiones"
                  value={
                    comisionesQuery.isError
                      ? "Por definir"
                      : String(comisionesQuery.data?.length ?? 0)
                  }
                />
                <KpiCard
                  label="Impuestos"
                  value={impuestosQuery.isError ? "Por definir" : String(impuestosQuery.rows.length)}
                />
                <KpiCard
                  label="Alertas"
                  value={alertasQuery.isError ? "Por definir" : String(alertasQuery.data?.length ?? 0)}
                />
                <KpiCard
                  label="Bloqueos"
                  value={bloqueosQuery.isError ? "Por definir" : String(bloqueosQuery.data?.length ?? 0)}
                />
                <KpiCard
                  label="Módulos inferidos"
                  value={modulosQuery.isError ? "Por definir" : String(modulosData.length)}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                <MiniDashboard
                  titulo="CVUs recientes"
                  columnas={[
                    { label: "Nombre", render: (s: Subcuenta) => `${s.nombre} ${s.apellido}`.trim() },
                    { label: "Email", render: (s: Subcuenta) => s.email },
                    { label: "Estado", render: (s: Subcuenta) => s.estado },
                  ]}
                  datos={(subcuentasQuery.data ?? []).slice(0, 10)}
                />
                <MiniDashboard
                  titulo="Últimas comisiones"
                  columnas={[
                    { label: "Concepto", render: (c: ComisionCliente) => c.concepto },
                    {
                      label: "Monto",
                      render: (c: ComisionCliente) => fmtMonto(c.monto),
                    },
                    { label: "Fecha", render: (c: ComisionCliente) => c.fecha },
                  ]}
                  datos={(comisionesQuery.data ?? []).slice(0, 10)}
                  vacio="Sin comisiones registradas."
                />
                <MiniDashboard
                  titulo="Impuestos recientes"
                  columnas={[
                    {
                      label: "Impuesto",
                      render: (a: ImpuestoAsignacion) => a.impuesto?.nombre ?? a.impuestoId,
                    },
                    { label: "Estado", render: (a: ImpuestoAsignacion) => a.estado },
                    { label: "Fecha", render: () => "—" },
                  ]}
                  datos={impuestosQuery.rows.slice(0, 10)}
                />
                <MiniDashboard
                  titulo="Alertas y bloqueos recientes"
                  columnas={[
                    {
                      label: "Tipo",
                      render: (r: { tipo: string; parametro?: string }) => r.tipo || r.parametro || "—",
                    },
                    {
                      label: "Estado",
                      render: (r: { estado: string }) => r.estado ?? "—",
                    },
                    { label: "Fecha", render: (r: { fecha: string }) => r.fecha },
                  ]}
                  datos={[
                    ...(alertasQuery.data ?? []).map((a) => ({
                      tipo: a.tipo,
                      parametro: undefined as string | undefined,
                      estado: a.estado,
                      fecha: a.fecha,
                    })),
                    ...(bloqueosQuery.data ?? []).map((b) => ({
                      tipo: b.parametro,
                      parametro: b.parametro,
                      estado: b.estado ?? "—",
                      fecha: "—",
                    })),
                  ].slice(0, 10)}
                />
              </div>
            </section>
          )}

          {activeTab === "riesgo" && (
            <SectionCard title="Riesgo y monitoreo">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Parámetros de alertas
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditAlertasOpen(true)}
                      className="inline-flex items-center gap-1 h-8 rounded-md border border-input px-2 text-xs font-medium text-foreground hover:bg-accent"
                    >
                      <Pencil size={12} /> Editar
                    </button>
                  </div>
                  {paramAlertasQuery.isLoading ? (
                    <p className="text-xs text-muted-foreground">Cargando…</p>
                  ) : (
                    <ParametrosResumen
                      defs={ALERTA_PARAM_DEF}
                      stored={paramAlertasQuery.data ?? []}
                    />
                  )}
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <ShieldAlert size={13} /> Parámetros de bloqueo
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditBloqueosOpen(true)}
                      className="inline-flex items-center gap-1 h-8 rounded-md border border-input px-2 text-xs font-medium text-foreground hover:bg-accent"
                    >
                      <Pencil size={12} /> Editar
                    </button>
                  </div>
                  {paramBloqueosQuery.isLoading ? (
                    <p className="text-xs text-muted-foreground">Cargando…</p>
                  ) : (
                    <ParametrosResumen
                      defs={BLOQUEO_PARAM_DEF}
                      stored={paramBloqueosQuery.data ?? []}
                    />
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 border-b border-border mb-4">
                <button
                  type="button"
                  onClick={() => setRiesgoSub("alertas")}
                  className={`px-3 py-2 text-xs font-semibold rounded-t-md ${
                    riesgoSub === "alertas"
                      ? "bg-primary/10 text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  Ver alertas
                </button>
                <button
                  type="button"
                  onClick={() => setRiesgoSub("bloqueos")}
                  className={`px-3 py-2 text-xs font-semibold rounded-t-md ${
                    riesgoSub === "bloqueos"
                      ? "bg-primary/10 text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  Ver bloqueos
                </button>
              </div>
              {riesgoSub === "alertas" ? (
                <div className="space-y-3">
                  {alertasQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Cargando…</p>
                  ) : alertasQuery.isError ? (
                    <p className="text-sm text-red-600">{(alertasQuery.error as Error).message}</p>
                  ) : (
                    <DataTable
                      columns={riesgoColumns}
                      data={alertasVisibles}
                      keyExtractor={(r) => r.id}
                      emptyMessage="Sin alertas para este cliente"
                      actions={(r) => (
                        <button
                          type="button"
                          onClick={() =>
                            setGestionTarget({ id: r.id, resumen: `${r.tipo} · ${cliente.nombre}` })
                          }
                          className="inline-flex items-center gap-1 h-8 rounded-md border border-input px-2 text-xs font-medium text-foreground hover:bg-accent"
                        >
                          Gestionar
                        </button>
                      )}
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {bloqueosQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Cargando…</p>
                  ) : bloqueosQuery.isError ? (
                    <p className="text-sm text-red-600">{(bloqueosQuery.error as Error).message}</p>
                  ) : (
                    <DataTable
                      columns={bloqueosColumns}
                      data={bloqueosVisibles}
                      keyExtractor={(r) => r.id}
                      emptyMessage="Sin bloqueos para este cliente"
                      actions={(r) => (
                        <button
                          type="button"
                          onClick={() =>
                            setGestionTarget({
                              id: r.id,
                              resumen: `${r.parametro} · ${cliente.nombre}`,
                            })
                          }
                          className="inline-flex items-center gap-1 h-8 rounded-md border border-input px-2 text-xs font-medium text-foreground hover:bg-accent"
                        >
                          Gestionar
                        </button>
                      )}
                    />
                  )}
                </div>
              )}
            </SectionCard>
          )}

          {activeTab === "modulos" && (
            <SectionCard
              title="Módulos y productos"
              actions={
                <button
                  type="button"
                  onClick={() => modulosQuery.refetch()}
                  className="inline-flex items-center gap-1 h-8 rounded-md border border-input px-2 text-xs font-medium text-foreground hover:bg-accent"
                >
                  <RefreshCw size={13} /> Recargar
                </button>
              }
            >
              {modulosQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              ) : modulosQuery.isError ? (
                <p className="text-sm text-red-600">{(modulosQuery.error as Error).message}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* PST */}
                  <div className="rounded-lg border border-border p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-md bg-muted/60 text-muted-foreground">
                        <Landmark size={16} />
                      </span>
                      <div className="font-display font-semibold text-sm">PST</div>
                    </div>
                    <dl className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-muted-foreground">Comercios PST</dt>
                        <dd className="font-semibold text-foreground tabular-nums">
                          {comerciosPst.length}
                        </dd>
                      </div>
                      <p className="pt-1 text-muted-foreground">
                        {comerciosPst.length === 0
                          ? "No se encontró comercio PCT asociado por email o legajo."
                          : "Comercio PCT asociado por email o legajo."}
                      </p>
                    </dl>
                    <button
                      type="button"
                      onClick={() => setPstOpen(true)}
                      className="inline-flex items-center gap-1 h-8 rounded-md border border-input px-2 text-xs font-medium text-foreground hover:bg-accent mt-auto self-start"
                    >
                      <Landmark size={13} /> Ver comercios PCT
                    </button>
                  </div>

                  {/* Links de pago */}
                  <div className="rounded-lg border border-border p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-md bg-muted/60 text-muted-foreground">
                        <Link2 size={16} />
                      </span>
                      <div className="font-display font-semibold text-sm">Links de pago</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {blpModulo ? (
                        <>
                          <p className="mt-1">
                            Comercios vinculados:{" "}
                            <span className="font-semibold text-foreground tabular-nums">
                              {linksPago.length}
                            </span>
                          </p>
                          <p className="mt-2">
                            {blpModulo.detalle ?? "Sin vínculos para este cliente."}
                          </p>
                          {linksPago.some((l) => l.estado === "Pendiente") && (
                            <p className="mt-2 font-semibold text-amber-700">
                              {linksPago.filter((l) => l.estado === "Pendiente").length} comercio(s)
                              pendiente(s) de aprobación.
                            </p>
                          )}
                        </>
                      ) : (
                        <p>Sin información de links de pago para este cliente.</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setLinksOpen(true)}
                      className="inline-flex items-center gap-1 h-8 rounded-md border border-input px-2 text-xs font-medium text-foreground hover:bg-accent mt-auto self-start"
                    >
                      <Link2 size={13} /> Ver links de pago
                    </button>
                  </div>

                  {/* API externa */}
                  <div className="rounded-lg border border-border p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-md bg-muted/60 text-muted-foreground">
                        <Globe size={16} />
                      </span>
                      <div className="font-display font-semibold text-sm">API externa</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p className="mt-1">
                        Cantidad de usuarios asociados:{" "}
                        <span className="font-semibold text-foreground tabular-nums">
                          {apiModulo?.cantidad ?? 0}
                        </span>
                      </p>
                      <p className="mt-1">
                        Estado:{" "}
                        <span className="font-semibold text-foreground">
                          {apiModulo?.detalle ?? "Sin vínculos para este cliente."}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-auto self-start">
                      <button
                        type="button"
                        onClick={() => setApiOpen(true)}
                        className="inline-flex items-center gap-1 h-8 rounded-md border border-input px-2 text-xs font-medium text-foreground hover:bg-accent"
                      >
                        <Globe size={13} /> Ver usuarios API
                      </button>
                      <button
                        type="button"
                        onClick={() => setApiDetalleOpen(true)}
                        className="inline-flex items-center gap-1 h-8 rounded-md border border-input px-2 text-xs font-medium text-foreground hover:bg-accent"
                      >
                        <Check size={13} /> Ver detalle
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {activeTab === "historial" && (
            <Seccion
              titulo="Historial de cambios"
              loading={historialCambiosQuery.isLoading}
              error={historialCambiosQuery.isError ? historialCambiosQuery.error : null}
              onRetry={historialCambiosQuery.refetch}
              vacio={
                !historialCambiosQuery.isLoading && (historialCambiosQuery.data?.length ?? 0) === 0
              }
            >
              <DataTable
                columns={historialColumns}
                data={historialCambiosQuery.data ?? []}
                keyExtractor={(r) => r.id}
                emptyMessage="Sin cambios registrados para este cliente"
              />
            </Seccion>
          )}
        </div>

        {/* Pop-ups módulos */}
        <ModalDialog
          open={pstOpen}
          onClose={() => setPstOpen(false)}
          title="Comercios PST vinculados"
          description="Comercios vinculados al cliente vía PST."
        >
          {comerciosPstQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : comerciosPst.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-8 text-sm text-muted-foreground">
              <Inbox size={22} />
              <p>No se encontró comercio PST asociado por email o por legajo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Comercio</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Legajo</th>
                  </tr>
                </thead>
                <tbody>
                  {comerciosPst.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-3">{c.nombre}</td>
                      <td className="px-4 py-3">{c.email ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{c.legajo_comercio ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ModalDialog>

        <ModalDialog
          open={linksOpen}
          onClose={() => setLinksOpen(false)}
          title="Links de pago"
          description="Comercios vinculados y sus links de pago."
        >
          {linksPagoQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : linksPago.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-8 text-sm text-muted-foreground">
              <Inbox size={22} />
              <p>Sin links de pago vinculados.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {linksPago.map((l) => (
                <div key={l.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{l.comercio_nombre}</span>
                    {l.estado && (
                      <Badge tone={l.estado === "Activo" ? "success" : "neutral"}>{l.estado}</Badge>
                    )}
                  </div>
                  {l.url && (
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-xs font-medium text-primary break-all"
                    >
                      {l.url}
                    </a>
                  )}
                  {l.monto != null && (
                    <p className="mt-1 text-xs text-muted-foreground">Monto: {fmtMonto(l.monto)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ModalDialog>

        <ApiUsuariosModal
          open={apiOpen}
          onClose={() => setApiOpen(false)}
          cantidad={apiModulo?.cantidad ?? 0}
        />

        <ApiDetalleModal
          open={apiDetalleOpen}
          onClose={() => setApiDetalleOpen(false)}
          apiUsuarioId={null}
          cantidad={apiModulo?.cantidad ?? 0}
        />

        {/* Edición de parámetros dentro del contexto del usuario */}
        <ParametrosEditorModal
          open={editAlertasOpen}
          onClose={() => setEditAlertasOpen(false)}
          title="Parámetros de alertas automáticas"
          legajo={legajo}
          defs={ALERTA_PARAM_DEF}
          stored={paramAlertasQuery.data ?? []}
          kind="alerta"
        />
        <ParametrosEditorModal
          open={editBloqueosOpen}
          onClose={() => setEditBloqueosOpen(false)}
          title="Parámetros de bloqueos"
          legajo={legajo}
          defs={BLOQUEO_PARAM_DEF}
          stored={paramBloqueosQuery.data ?? []}
          kind="bloqueo"
        />

        <AlertaGestionModal
          open={!!gestionTarget}
          onClose={() => setGestionTarget(null)}
          resumen={gestionTarget?.resumen ?? ""}
          onGuardar={(g) => {
            if (gestionTarget) {
              setGestiones((prev) => ({ ...prev, [gestionTarget.id]: g }));
            }
          }}
        />

        <ExencionModal
          open={exencionOpen}
          onClose={() => setExencionOpen(false)}
          legajo={cliente.legajo}
          cuitDefault={cliente.cuit}
        />

        {movDetail && <MovimientoDetail m={movDetail} onClose={() => setMovDetail(null)} />}

        {impuestoDetail && (
          <DetailModal
            title="Detalle de impuesto asignado"
            onClose={() => setImpuestoDetail(null)}
            rows={[
              {
                label: "Impuesto",
                value: impuestoDetail.impuesto?.nombre ?? impuestoDetail.impuestoId,
              },
              { label: "Código", value: impuestoDetail.impuesto?.codigo ?? "—" },
              { label: "Tipo", value: impuestoDetail.impuesto?.tipo ?? impuestoDetail.tipo },
              {
                label: "Monto / Tasa",
                value:
                  (impuestoDetail.impuesto?.tipo ?? impuestoDetail.tipo) === "Porcentaje"
                    ? `${impuestoDetail.impuesto?.monto ?? impuestoDetail.monto ?? 0} %`
                    : fmtMonto(impuestoDetail.impuesto?.monto ?? impuestoDetail.monto),
              },
              { label: "Fecha asignación", value: fmtFecha(impuestoDetail.fechaAsignacion) },
              { label: "Estado", value: impuestoDetail.estado },
              { label: "Legajo", value: impuestoDetail.clienteLegajo },
            ]}
          />
        )}

        {estadoTarget && (
          <FormDialog
            open
            onClose={() => setEstadoTarget(null)}
            title="Cambiar estado del movimiento"
            description={`Transición atómica registrada en el historial (origen = manual). Estado actual: ${estadoTarget.estadoActual}.`}
            onSubmit={async () => {
              await cambiarMovimientoEstado.mutateAsync({
                movimientoId: estadoTarget.dbId,
                nuevoEstadoId: estadoTarget.nuevoId,
                observaciones: "Cambio manual desde ficha de cliente",
              });
              setEstadoTarget(null);
            }}
            submitLabel={cambiarMovimientoEstado.isPending ? "Guardando…" : "Confirmar cambio"}
            size="md"
          >
            {cambiarMovimientoEstado.isError && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>{(cambiarMovimientoEstado.error as Error).message}</span>
              </div>
            )}
            <div>
              <label htmlFor="nuevo-estado-cli" className="text-sm font-medium">
                Nuevo estado
              </label>
              <select
                id="nuevo-estado-cli"
                className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
                value={estadoTarget.nuevoId}
                onChange={(e) =>
                  setEstadoTarget((s) => (s ? { ...s, nuevoId: Number(e.target.value) } : s))
                }
              >
                {catalogoEstados.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.codigo} — {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          </FormDialog>
        )}

        {confirmAction && (
          <ConfirmDialog
            open={!!confirmAction}
            onClose={() => setConfirmAction(null)}
            title={confirmAction.title}
            message={confirmAction.message}
            confirmLabel={confirmAction.confirmLabel}
            variant={confirmAction.variant}
            onConfirm={confirmAction.onConfirm}
          />
        )}
      </div>
    </PermissionGuard>
  );
}
