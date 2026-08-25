import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, AlertTriangle, Inbox, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/portal-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PermissionGuard } from "@/components/permission-guard";
import { useClienteByLegajo } from "@/hooks/useClientes";
import { useComisiones } from "@/hooks/useComisiones";
import { useMovimientos } from "@/hooks/useMovimientos";
import { useImpuestosAsignaciones } from "@/hooks/useImpuestos";
import { updateClienteEstado } from "@/lib/api/clientes";
import {
  listSubcuentas,
  createSubcuenta,
  type Subcuenta,
  type SubcuentaTipo,
  type SubcuentaEstado,
} from "@/lib/api/subcuentas";
import {
  listDocumentos,
  createDocumento,
  DOCUMENTO_LABELS,
  type DocumentoTipo,
} from "@/lib/api/documentos";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import type {
  Cliente,
  ComisionCliente,
  EstadoCliente,
  ImpuestoAsignacion,
  Movimiento,
} from "@/lib/api/types";

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
  | "contexto"
  | "subcuentas"
  | "documentos"
  | "validaciones"
  | "riesgo"
  | "modulos"
  | "financiero"
  | "historial";

const TABS: { key: TabKey; label: string }[] = [
  { key: "identificacion", label: "Identificación" },
  { key: "contexto", label: "Contexto" },
  { key: "subcuentas", label: "Subcuentas" },
  { key: "documentos", label: "Documentos" },
  { key: "validaciones", label: "Validaciones" },
  { key: "riesgo", label: "Riesgo" },
  { key: "modulos", label: "Módulos" },
  { key: "financiero", label: "Financiero" },
  { key: "historial", label: "Historial" },
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

function TablaComisiones({ rows }: { rows: ComisionCliente[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Operación</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">Modalidad</th>
            <th className="px-4 py-3 font-medium">Valor</th>
            <th className="px-4 py-3 font-medium">% IVA</th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3 font-mono text-xs">{r.operacion}</td>
              <td className="px-4 py-3">{r.tipo}</td>
              <td className="px-4 py-3">{r.modalidad}</td>
              <td className="px-4 py-3 tabular-nums">
                {r.modalidad === "Porcentaje" ? `${r.porcentaje ?? 0} %` : fmtMonto(r.montoFijo)}
              </td>
              <td className="px-4 py-3 tabular-nums">{r.porcentajeImpuesto} %</td>
              <td className="px-4 py-3">
                <Badge tone={r.estado === "Habilitado" ? "success" : "neutral"}>{r.estado}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaMovimientos({ rows }: { rows: Movimiento[] }) {
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaImpuestos({ rows }: { rows: ImpuestoAsignacion[] }) {
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

function EmptyTable({ columnas }: { columnas: string[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            {columnas.map((c) => (
              <th key={c} className="px-4 py-3 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              colSpan={columnas.length}
              className="px-4 py-10 text-center text-sm text-muted-foreground"
            >
              Sin registros.
            </td>
          </tr>
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

function SubcuentasTab({ legajo }: { legajo: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
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
      titulo="Subcuentas"
      loading={query.isLoading}
      error={query.isError ? query.error : null}
      onRetry={() => query.refetch()}
      vacio={!query.isLoading && (query.data?.length ?? 0) === 0}
    >
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
        >
          <Plus size={16} /> Cargar subcuenta
        </button>
      </div>
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
  const porTipo = (t: DocumentoTipo) => docs.find((d) => d.tipo === t);

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

  const tipos: DocumentoTipo[] = ["id_frente", "id_dorso", "servicio", "selfie"];

  return (
    <Seccion
      titulo="Documentos"
      loading={query.isLoading}
      error={query.isError ? query.error : null}
      onRetry={() => query.refetch()}
      vacio={!query.isLoading && docs.length === 0}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tipos.map((t) => {
          const d = porTipo(t);
          return (
            <div key={t} className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">{DOCUMENTO_LABELS[t]}</p>
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2 break-all">
                {d?.url ? d.url : "Falta cargar."}
              </p>
              {d?.url && (
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
          );
        })}
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

function ClienteDetailPage() {
  const { legajo } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = useCan();
  const puedeModificar = can("modificar", "usuarios");

  const { cliente, isLoading, isError, error, refetch } = useClienteByLegajo(legajo ?? null);

  const comisionesQuery = useComisiones({
    page: 0,
    pageSize: 25,
    clienteId: cliente?.id,
  });
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

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("identificacion");
  const [contextoSub, setContextoSub] = useState<"movimientos" | "impuestos">("movimientos");
  const [riesgoSub, setRiesgoSub] = useState<"alertas" | "bloqueos">("alertas");

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

  const { personal, compliance, empresa } = camposIdentificacion(cliente);

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
            <Badge tone={estadoTone[cliente.estado]}>{estadoLabel[cliente.estado]}</Badge>
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
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-2">
          {activeTab === "identificacion" && (
            <>
              <SectionCard title="Datos personales">
                <FieldGrid campos={personal} />
              </SectionCard>
              {cliente.tipoPersona === "juridica" && (
                <SectionCard title="Datos de la empresa">
                  <FieldGrid campos={empresa} />
                </SectionCard>
              )}
              <SectionCard title="Compliance / PEP">
                <FieldGrid campos={compliance} />
              </SectionCard>
            </>
          )}

          {activeTab === "contexto" && (
            <>
              <div className="flex gap-1 mt-4">
                <button
                  type="button"
                  onClick={() => setContextoSub("movimientos")}
                  className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px ${contextoSub === "movimientos" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
                >
                  Movimientos
                </button>
                <button
                  type="button"
                  onClick={() => setContextoSub("impuestos")}
                  className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px ${contextoSub === "impuestos" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
                >
                  Impuestos
                </button>
              </div>
              {contextoSub === "movimientos" ? (
                <Seccion
                  titulo="Movimientos recientes (últimos 10)"
                  loading={movimientosQuery.isLoading}
                  error={movimientosQuery.isError ? movimientosQuery.error : null}
                  onRetry={movimientosQuery.refetch}
                  vacio={movimientosQuery.rows.length === 0}
                >
                  <TablaMovimientos rows={movimientosQuery.rows} />
                </Seccion>
              ) : (
                <Seccion
                  titulo="Impuestos asignados"
                  loading={impuestosQuery.isLoading}
                  error={impuestosQuery.isError ? impuestosQuery.error : null}
                  onRetry={impuestosQuery.refetch}
                  vacio={impuestosQuery.rows.length === 0}
                >
                  <TablaImpuestos rows={impuestosQuery.rows} />
                </Seccion>
              )}
            </>
          )}

          {activeTab === "subcuentas" && <SubcuentasTab legajo={cliente.legajo} />}

          {activeTab === "documentos" && <DocumentosTab legajo={cliente.legajo} />}

          {activeTab === "validaciones" && (
            <Seccion titulo="Validaciones automáticas" loading={false} error={null} vacio={true}>
              <EmptyTable columnas={["Proveedor", "Estado", "Fecha"]} />
            </Seccion>
          )}

          {activeTab === "riesgo" && (
            <>
              <div className="flex gap-1 mt-4">
                <button
                  type="button"
                  onClick={() => setRiesgoSub("alertas")}
                  className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px ${riesgoSub === "alertas" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
                >
                  Alertas
                </button>
                <button
                  type="button"
                  onClick={() => setRiesgoSub("bloqueos")}
                  className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px ${riesgoSub === "bloqueos" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
                >
                  Bloqueos
                </button>
              </div>
              <Seccion
                titulo={riesgoSub === "alertas" ? "Alertas" : "Bloqueos"}
                loading={false}
                error={null}
                vacio={true}
              >
                <EmptyTable
                  columnas={
                    riesgoSub === "alertas" ? ["Tipo", "Fecha", "Estado"] : ["Parámetro", "Valor"]
                  }
                />
              </Seccion>
            </>
          )}

          {activeTab === "modulos" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {["PCT", "BLP", "API Externa"].map((m) => (
                <div key={m} className="rounded-xl border border-border bg-card p-5">
                  <p className="text-sm font-semibold">{m}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Sin módulos vinculados.</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "financiero" && (
            <Seccion
              titulo="Comisiones (configuración arancelaria)"
              loading={comisionesQuery.isLoading}
              error={comisionesQuery.isError ? comisionesQuery.error : null}
              onRetry={comisionesQuery.refetch}
              vacio={comisionesQuery.rows.length === 0}
            >
              <TablaComisiones rows={comisionesQuery.rows} />
            </Seccion>
          )}

          {activeTab === "historial" && (
            <Seccion titulo="Historial de cambios" loading={false} error={null} vacio={true}>
              <EmptyTable
                columnas={["Campo", "Valor anterior", "Valor nuevo", "Fecha", "Hora", "Usuario"]}
              />
            </Seccion>
          )}
        </div>

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
