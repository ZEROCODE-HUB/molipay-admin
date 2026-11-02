import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Eye,
  Power,
  PowerOff,
  Edit3,
  Trash2,
  Plus,
  X,
  AlertTriangle,
  Inbox,
  Search,
  ExternalLink,
} from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Badge, BtnOutline, BtnPrimary, Input, Label } from "@/components/portal-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { useImpuestos, useAlicuotas } from "@/hooks/useImpuestos";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  createImpuesto,
  updateImpuesto,
  deleteImpuesto,
  setImpuestoEstado,
  createAlicuota,
  updateAlicuota,
  setAlicuotaEstado,
  deleteAlicuota,
} from "@/lib/api/impuestos";
import { buscarEnPadron, listPadronesIibb, QK_PADRONES } from "@/lib/api/padron-iibb";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { ResumenAlicuota } from "@/components/impuestos/alicuota-resumen";
import { ETIQUETA_DIRECCION, formatValor, vigenteHoy } from "@/lib/impuestos-format";
import {
  AMBITOS_IMPUESTO,
  DIRECCIONES_ALICUOTA,
  FUENTES_ALICUOTA,
  type Alicuota,
  type AlicuotaInput,
  type AmbitoImpuesto,
  type DireccionAlicuota,
  type FuenteAlicuota,
  type Impuesto,
  type TipoCalculoAlicuota,
} from "@/lib/api/types";

export const Route = createFileRoute("/admin/comercios/impuestos/")({
  component: Page,
  head: () => ({
    meta: [{ title: "Impuestos — Admin — Moli" }],
  }),
});

const PAGE_SIZE = 10;
const ALICUOTA_PAGE_SIZE = 8;

const AYUDA_AMBITO: Record<AmbitoImpuesto, string> = {
  Externo: "Se retiene al cliente (DyC, IIBB).",
  Interno: "Costo propio de MoliPay.",
};

const AYUDA_FUENTE: Record<FuenteAlicuota, string> = {
  Fija: "Alícuotas definidas acá (por ley), por dirección y vigencia. Ej.: Débitos y Créditos.",
  Padrón: "Se consulta por CUIT en el padrón vigente del mes. Ej.: Ingresos Brutos.",
  Manual: "Se define por cliente en Impuestos › Usuarios.",
};

const selectCls =
  "w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

const hoy = () => new Date().toISOString().slice(0, 10);

function estadoTone(estado: "Activo" | "Inactivo"): "success" | "neutral" {
  return estado === "Activo" ? "success" : "neutral";
}

const num = (v: number, dec = 2) =>
  v.toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: 4 });

function fechaCorta(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}

function MensajeEstado({
  tipo,
  mensaje,
  onRetry,
}: {
  tipo: "error" | "vacio" | "permiso";
  mensaje: string;
  onRetry?: () => void;
}) {
  if (tipo === "permiso") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-6 py-12 text-center text-sm text-amber-800">
        <AlertTriangle size={28} />
        <div>
          <p className="font-semibold">No tenés permiso para ver esto</p>
          <p className="mt-1">{mensaje}</p>
        </div>
      </div>
    );
  }
  if (tipo === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
        <AlertTriangle size={28} />
        <div>
          <p className="font-semibold">Ocurrió un error al cargar los impuestos</p>
          <p className="mt-1">{mensaje}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
      <Inbox size={28} />
      <p>No hay impuestos que coincidan con la búsqueda.</p>
    </div>
  );
}

// --- Alícuotas: formulario ----------------------------------------------------

type AlicuotaForm = {
  codigo: string;
  tipoCalculo: TipoCalculoAlicuota;
  valor: string;
  direccion: DireccionAlicuota;
  vigenciaDesde: string;
  vigenciaHasta: string;
  descripcion: string;
  estado: "Activo" | "Inactivo";
};

const alicuotaVacia = (): AlicuotaForm => ({
  codigo: "",
  tipoCalculo: "Porcentaje",
  valor: "",
  direccion: "Ambas",
  vigenciaDesde: hoy(),
  vigenciaHasta: "",
  descripcion: "",
  estado: "Activo",
});

function errorAlicuota(f: AlicuotaForm): string | null {
  if (!f.codigo.trim()) return "Falta el código.";
  if (f.valor.trim() === "" || Number.isNaN(Number(f.valor))) return "Falta el valor.";
  const v = Number(f.valor);
  if (v < 0) return "El valor no puede ser negativo.";
  if (f.tipoCalculo === "Porcentaje" && v > 100) return "El porcentaje no puede superar 100.";
  if (!f.vigenciaDesde) return "Falta la fecha de inicio de vigencia.";
  if (f.vigenciaHasta && f.vigenciaHasta < f.vigenciaDesde)
    return "La vigencia termina antes de empezar.";
  return null;
}

const aInput = (f: AlicuotaForm): AlicuotaInput => ({
  codigo: f.codigo,
  tipoCalculo: f.tipoCalculo,
  valor: Number(f.valor),
  direccion: f.direccion,
  descripcion: f.descripcion || null,
  estado: f.estado,
  vigenciaDesde: f.vigenciaDesde,
  vigenciaHasta: f.vigenciaHasta || null,
});

function CamposAlicuota({
  form,
  onChange,
  conEstado,
}: {
  form: AlicuotaForm;
  onChange: (f: AlicuotaForm) => void;
  conEstado?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div>
        <Label>Código</Label>
        <Input
          value={form.codigo}
          onChange={(e) => onChange({ ...form, codigo: e.target.value.toUpperCase() })}
          placeholder="Ej: IN_06"
        />
      </div>
      <div>
        <Label>Cálculo</Label>
        <select
          className={selectCls}
          value={form.tipoCalculo}
          onChange={(e) =>
            onChange({ ...form, tipoCalculo: e.target.value as TipoCalculoAlicuota })
          }
        >
          <option value="Porcentaje">Porcentaje</option>
          <option value="Monto fijo">Monto fijo</option>
        </select>
      </div>
      <div>
        <Label>{form.tipoCalculo === "Porcentaje" ? "Tasa (%)" : "Monto ($)"}</Label>
        <Input
          type="number"
          step="any"
          min="0"
          value={form.valor}
          onChange={(e) => onChange({ ...form, valor: e.target.value })}
          placeholder={form.tipoCalculo === "Porcentaje" ? "Ej: 0.60" : "Ej: 150"}
        />
      </div>
      <div>
        <Label>Dirección</Label>
        <select
          className={selectCls}
          value={form.direccion}
          onChange={(e) => onChange({ ...form, direccion: e.target.value as DireccionAlicuota })}
        >
          {DIRECCIONES_ALICUOTA.map((d) => (
            <option key={d} value={d}>
              {ETIQUETA_DIRECCION[d]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Vigente desde</Label>
        <Input
          type="date"
          value={form.vigenciaDesde}
          onChange={(e) => onChange({ ...form, vigenciaDesde: e.target.value })}
        />
      </div>
      <div>
        <Label>Vigente hasta</Label>
        <Input
          type="date"
          value={form.vigenciaHasta}
          onChange={(e) => onChange({ ...form, vigenciaHasta: e.target.value })}
        />
      </div>
      <div className={conEstado ? "" : "col-span-2"}>
        <Label>Descripción</Label>
        <Input
          value={form.descripcion}
          onChange={(e) => onChange({ ...form, descripcion: e.target.value })}
          placeholder="Ej: Cobros entrantes"
        />
      </div>
      {conEstado && (
        <div>
          <Label>Estado</Label>
          <select
            className={selectCls}
            value={form.estado}
            onChange={(e) => onChange({ ...form, estado: e.target.value as "Activo" | "Inactivo" })}
          >
            <option value="Activo">Activa</option>
            <option value="Inactivo">Inactiva</option>
          </select>
        </div>
      )}
    </div>
  );
}

function AlicuotaFormModal({
  alicuota,
  onClose,
  onSave,
}: {
  alicuota: Alicuota | null;
  onClose: () => void;
  onSave: (form: AlicuotaForm) => void;
}) {
  const [form, setForm] = useState<AlicuotaForm>(() =>
    alicuota
      ? {
          codigo: alicuota.codigo,
          tipoCalculo: alicuota.tipoCalculo,
          valor: String(alicuota.valor),
          direccion: alicuota.direccion,
          vigenciaDesde: alicuota.vigenciaDesde,
          vigenciaHasta: alicuota.vigenciaHasta ?? "",
          descripcion: alicuota.descripcion ?? "",
          estado: alicuota.estado,
        }
      : alicuotaVacia(),
  );
  const error = errorAlicuota(form);

  return (
    <FormDialog
      open
      onClose={onClose}
      size="lg"
      title={alicuota ? "Editar alícuota" : "Nueva alícuota"}
      description="Si la ley cambia la tasa, cerrá la vigencia de la actual y creá una nueva: así queda el historial."
      onSubmit={() => !error && onSave(form)}
      submitLabel={alicuota ? "Guardar cambios" : "Crear alícuota"}
    >
      <CamposAlicuota form={form} onChange={setForm} conEstado />
      {error && <p className="text-xs text-muted-foreground">{error}</p>}
    </FormDialog>
  );
}

// --- Alícuotas: sección del detalle (impuestos con fuente Fija) ----------------

function AlicuotasSection({ impuesto, puedeEditar }: { impuesto: Impuesto; puedeEditar: boolean }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [editTarget, setEditTarget] = useState<Alicuota | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Alicuota | null>(null);
  const [aviso, setAviso] = useState<{ title: string; message: string } | null>(null);

  const { rows, total, isLoading } = useAlicuotas({
    page,
    pageSize: ALICUOTA_PAGE_SIZE,
    impuesto_id: impuesto.id,
  });

  const recargar = () => {
    void qc.invalidateQueries({ queryKey: ["tax_rates"] });
    void qc.invalidateQueries({ queryKey: ["impuestos"] });
  };
  const fallo = (title: string) => (e: unknown) =>
    setAviso({ title, message: (e as Error).message });

  const guardar = async (form: AlicuotaForm) => {
    try {
      if (editTarget) await updateAlicuota(editTarget.id, aInput(form));
      else await createAlicuota(impuesto.id, aInput(form));
      setShowNew(false);
      setEditTarget(null);
      recargar();
    } catch (e) {
      fallo("No se pudo guardar")(e);
    }
  };

  const eliminar = async () => {
    if (!confirmDelete) return;
    try {
      await deleteAlicuota(confirmDelete.id);
      recargar();
    } catch (e) {
      fallo("No se pudo eliminar")(e);
    }
    setConfirmDelete(null);
  };

  const totalPaginas = Math.max(1, Math.ceil(total / ALICUOTA_PAGE_SIZE));
  const th = "px-3 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Alícuotas ({total})
        </h4>
        {puedeEditar && (
          <BtnOutline
            type="button"
            onClick={() => {
              setEditTarget(null);
              setShowNew(true);
            }}
          >
            <Plus size={13} /> Agregar alícuota
          </BtnOutline>
        )}
      </div>
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className={th}>Código</th>
              <th className={th}>Valor</th>
              <th className={th}>Dirección</th>
              <th className={th}>Vigencia</th>
              <th className={th}>Estado</th>
              {puedeEditar && <th className="px-3 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2.5">
                  <div className="font-mono text-xs font-semibold">{a.codigo}</div>
                  {a.descripcion && (
                    <div className="text-[11px] text-muted-foreground">{a.descripcion}</div>
                  )}
                </td>
                <td className="px-3 py-2.5 font-mono tabular-nums">{formatValor(a)}</td>
                <td className="px-3 py-2.5 text-xs">{ETIQUETA_DIRECCION[a.direccion]}</td>
                <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                  {fechaCorta(a.vigenciaDesde)} –{" "}
                  {a.vigenciaHasta ? fechaCorta(a.vigenciaHasta) : "sin fin"}
                </td>
                <td className="px-3 py-2.5">
                  {vigenteHoy(a) ? (
                    <Badge tone="success">Vigente</Badge>
                  ) : a.estado === "Activo" ? (
                    <Badge tone="warn">{a.vigenciaDesde > hoy() ? "Programada" : "Vencida"}</Badge>
                  ) : (
                    <Badge tone="neutral">Inactiva</Badge>
                  )}
                </td>
                {puedeEditar && (
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      title="Editar"
                      className="p-1.5 hover:bg-muted rounded-md mr-1"
                      onClick={() => {
                        setShowNew(false);
                        setEditTarget(a);
                      }}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      title={a.estado === "Activo" ? "Desactivar" : "Activar"}
                      className="p-1.5 hover:bg-muted rounded-md mr-1"
                      onClick={() =>
                        setAlicuotaEstado(a.id, a.estado === "Activo" ? "Inactivo" : "Activo")
                          .then(recargar)
                          .catch(fallo("No se pudo actualizar"))
                      }
                    >
                      {a.estado === "Activo" ? <PowerOff size={14} /> : <Power size={14} />}
                    </button>
                    <button
                      type="button"
                      title="Eliminar"
                      className="p-1.5 hover:bg-red-50 text-red-600 rounded-md"
                      onClick={() => setConfirmDelete(a)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  {isLoading ? "Cargando…" : "Sin alícuotas cargadas."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPaginas > 1 && (
        <div className="flex items-center justify-end gap-2 mt-3 text-sm text-muted-foreground">
          <span>
            Página {page + 1} de {totalPaginas}
          </span>
          <BtnOutline
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Anterior
          </BtnOutline>
          <BtnOutline
            type="button"
            disabled={page + 1 >= totalPaginas}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </BtnOutline>
        </div>
      )}

      {(showNew || editTarget) && (
        <AlicuotaFormModal
          alicuota={editTarget}
          onClose={() => {
            setShowNew(false);
            setEditTarget(null);
          }}
          onSave={guardar}
        />
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar alícuota"
        message={`¿Eliminar la alícuota "${confirmDelete?.codigo}"? Si ya se usó, mejor desactivala o cerrá su vigencia para conservar el historial.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={eliminar}
      />
      {aviso && (
        <ConfirmDialog
          open
          onClose={() => setAviso(null)}
          title={aviso.title}
          message={aviso.message}
          confirmLabel="Cerrar"
          variant="danger"
          onConfirm={() => setAviso(null)}
        />
      )}
    </div>
  );
}

// --- Padrón: sección del detalle (impuestos con fuente Padrón) ----------------

function PadronSection({ impuesto }: { impuesto: Impuesto }) {
  const [texto, setTexto] = useState("");
  const busqueda = useDebouncedValue(texto, 350);
  const padrones = useQuery({
    queryKey: QK_PADRONES,
    queryFn: listPadronesIibb,
    staleTime: 30_000,
  });

  const vigentes = useMemo(() => {
    const todos = (padrones.data ?? []).filter((p) => p.estado === "Vigente");
    const propios = todos.filter((p) => p.impuestoId === impuesto.id);
    return (propios.length ? propios : todos).sort((a, b) =>
      (b.periodo ?? "").localeCompare(a.periodo ?? ""),
    );
  }, [padrones.data, impuesto.id]);
  const [padronId, setPadronId] = useState("");
  const padron = vigentes.find((p) => p.id === padronId) ?? vigentes[0] ?? null;

  const digitos = busqueda.replace(/\D/g, "");
  const consulta = useQuery({
    queryKey: ["taxpayer_registry_entries", padron?.id, busqueda],
    queryFn: () => buscarEnPadron(padron!.id, busqueda, 20),
    enabled: !!padron && busqueda.trim().length >= 3,
  });

  if (padrones.isLoading)
    return <p className="text-sm text-muted-foreground">Cargando padrones…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Alícuota según padrón
        </h4>
        <Link
          to="/admin/comercios/impuestos/ingresos-brutos"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Gestionar padrones <ExternalLink size={12} />
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
        <p>
          Las alícuotas no se cargan a mano: salen del padrón vigente del período, por CUIT del
          cliente.
        </p>
        <p>
          Solo en el ingreso de fondos (Pay-In) sobre el bruto. En el egreso (Pay-Out) es 0,00%. Si
          el CUIT no figura en el padrón o figura como exento / no sujeto, es 0,00%.
        </p>
      </div>

      {!padron ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No hay un padrón vigente cargado. Mientras tanto la alícuota de todos los CUIT es 0,00%.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
            <Field
              label="Padrón vigente"
              value={
                vigentes.length > 1 ? (
                  <select
                    className={selectCls}
                    value={padron.id}
                    onChange={(e) => setPadronId(e.target.value)}
                  >
                    {vigentes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.organismo} · {p.periodo}
                      </option>
                    ))}
                  </select>
                ) : (
                  `${padron.organismo ?? "—"} · ${padron.periodo ?? "—"}`
                )
              }
            />
            <Field
              label="Vigencia"
              value={
                <span className="text-sm">
                  {fechaCorta(padron.vigenciaDesde)} – {fechaCorta(padron.vigenciaHasta)}
                </span>
              }
            />
            <Field
              label="CUITs"
              value={
                <span className="font-mono tabular-nums">
                  {padron.filasValidas.toLocaleString("es-AR")}
                </span>
              }
            />
            <Field
              label="Exentos"
              value={
                <span className="font-mono tabular-nums">
                  {(padron.kpis?.exentos ?? 0).toLocaleString("es-AR")}
                </span>
              }
            />
          </div>

          {padron.kpis?.alicuotas?.length ? (
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
                Alícuotas del padrón
              </div>
              <div className="flex flex-wrap gap-1.5">
                {padron.kpis.alicuotas.map((a) => (
                  <span
                    key={a.alicuota}
                    className="rounded border border-border px-2 py-0.5 font-mono text-[11px] tabular-nums"
                  >
                    {num(a.alicuota)}% · {a.cuits.toLocaleString("es-AR")} CUITs
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <Label htmlFor="padron-cuit">Consultar alícuota por CUIT o razón social</Label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="padron-cuit"
                className="pl-8"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Ej: 20123456789"
              />
            </div>
            {busqueda.trim().length >= 3 && (
              <div className="mt-2 overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 font-medium">CUIT</th>
                      <th className="px-3 py-2 font-medium">Razón social</th>
                      <th className="px-3 py-2 font-medium">Padrón</th>
                      <th className="px-3 py-2 font-medium">Alícuota a aplicar (Pay-In)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(consulta.data ?? []).map((f) => {
                      const exento = f.exento === true || f.sujeto === false;
                      return (
                        <tr key={f.cuit} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 font-mono text-xs">{f.cuit}</td>
                          <td className="px-3 py-2">{f.razonSocial || "—"}</td>
                          <td className="px-3 py-2 font-mono text-xs tabular-nums">
                            {num(f.alicuotaRetencion)}%
                          </td>
                          <td className="px-3 py-2">
                            {exento ? (
                              <span>
                                <span className="font-mono tabular-nums">0,00%</span>{" "}
                                <span className="text-xs text-muted-foreground">
                                  ({f.exento ? "exento" : "no sujeto"})
                                </span>
                              </span>
                            ) : (
                              <span className="font-mono font-semibold tabular-nums">
                                {num(f.alicuotaRetencion)}%
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {consulta.isFetching && !consulta.data && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-4 text-center text-sm text-muted-foreground"
                        >
                          Buscando…
                        </td>
                      </tr>
                    )}
                    {consulta.data && consulta.data.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-4 text-center text-sm text-muted-foreground"
                        >
                          {digitos.length === 11
                            ? "El CUIT no figura en el padrón: alícuota 0,00%."
                            : "Sin coincidencias en el padrón."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// --- Detalle -------------------------------------------------------------------

function DetalleModal({
  imp,
  puedeEditar,
  onClose,
}: {
  imp: Impuesto;
  puedeEditar: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display text-lg font-semibold">
              Detalle del impuesto: {imp.nombre}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">{imp.codigo}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Código" value={<span className="font-mono">{imp.codigo}</span>} />
            <Field label="Nombre" value={imp.nombre} />
            <Field
              label="Estado"
              value={<Badge tone={estadoTone(imp.estado)}>{imp.estado}</Badge>}
            />
            <Field
              label="Ámbito"
              value={
                <span className="flex flex-col">
                  <Badge tone={imp.ambito === "Interno" ? "success" : "neutral"}>
                    {imp.ambito}
                  </Badge>
                  <span className="text-[11px] font-normal text-muted-foreground mt-1">
                    {AYUDA_AMBITO[imp.ambito]}
                  </span>
                </span>
              }
            />
            <Field
              label="Fuente de la alícuota"
              value={
                <span className="flex flex-col">
                  <span>{imp.fuenteAlicuota}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {AYUDA_FUENTE[imp.fuenteAlicuota]}
                  </span>
                </span>
              }
            />
            <Field label="Descripción" value={imp.descripcion ?? "—"} />
            <Field
              label="Creado"
              value={
                <span className="font-mono tabular-nums text-sm">
                  {new Date(imp.createdAt).toLocaleString("es-AR")}
                </span>
              }
            />
            <Field
              label="Actualizado"
              value={
                <span className="font-mono tabular-nums text-sm">
                  {new Date(imp.updatedAt).toLocaleString("es-AR")}
                </span>
              }
            />
          </div>

          <div className="border-t border-border pt-5">
            {imp.fuenteAlicuota === "Fija" && (
              <AlicuotasSection impuesto={imp} puedeEditar={puedeEditar} />
            )}
            {imp.fuenteAlicuota === "Padrón" && <PadronSection impuesto={imp} />}
            {imp.fuenteAlicuota === "Manual" && (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                La alícuota se define por cliente.{" "}
                <Link
                  to="/admin/comercios/impuestos/usuarios"
                  className="font-semibold text-primary hover:underline"
                >
                  Ver asignaciones
                </Link>
              </div>
            )}
          </div>
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

// --- Form principal -----------------------------------------------------------

type ImpuestoForm = {
  codigo: string;
  nombre: string;
  descripcion: string;
  estado: "Activo" | "Inactivo";
  ambito: AmbitoImpuesto;
  fuenteAlicuota: FuenteAlicuota;
  alicuotas: AlicuotaForm[];
};

function ImpuestoFormModal({
  impuesto,
  onClose,
  onSave,
}: {
  impuesto: Impuesto | null;
  onClose: () => void;
  onSave: (form: ImpuestoForm) => void;
}) {
  const [form, setForm] = useState<ImpuestoForm>(() => ({
    codigo: impuesto?.codigo ?? "",
    nombre: impuesto?.nombre ?? "",
    descripcion: impuesto?.descripcion ?? "",
    estado: impuesto?.estado ?? "Activo",
    ambito: impuesto?.ambito ?? "Externo",
    fuenteAlicuota: impuesto?.fuenteAlicuota ?? "Fija",
    alicuotas: impuesto ? [] : [alicuotaVacia()],
  }));

  const creando = !impuesto;
  const cargaAlicuotas = creando && form.fuenteAlicuota === "Fija";
  const errorAlic = cargaAlicuotas
    ? form.alicuotas.length === 0
      ? "Agregá al menos una alícuota."
      : (form.alicuotas.map(errorAlicuota).find(Boolean) ?? null)
    : null;
  const valido = form.codigo.trim() !== "" && form.nombre.trim() !== "" && !errorAlic;
  const cambiaAlicuota = (i: number, f: AlicuotaForm) =>
    setForm({ ...form, alicuotas: form.alicuotas.map((a, k) => (k === i ? f : a)) });

  return (
    <FormDialog
      open
      onClose={onClose}
      size="xl"
      title={impuesto ? "Editar impuesto" : "Nuevo impuesto"}
      description={
        impuesto
          ? `Modificá los datos del impuesto "${impuesto.nombre}". Las alícuotas se gestionan desde Ver detalles.`
          : "Definí el impuesto y de dónde sale su alícuota."
      }
      onSubmit={() => valido && onSave(form)}
      submitLabel={impuesto ? "Guardar cambios" : "Crear impuesto"}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="im-codigo">Código</Label>
          <Input
            id="im-codigo"
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
            placeholder="Ej: DEBITOS_CREDITOS"
          />
          <p className="text-[11px] text-muted-foreground mt-1">Único entre los impuestos.</p>
        </div>
        <div>
          <Label htmlFor="im-nombre">Nombre</Label>
          <Input
            id="im-nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Débitos y Créditos"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="im-desc">Descripción</Label>
          <Input
            id="im-desc"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="im-ambito">Ámbito</Label>
          <select
            id="im-ambito"
            className={selectCls}
            value={form.ambito}
            onChange={(e) => setForm({ ...form, ambito: e.target.value as AmbitoImpuesto })}
          >
            {AMBITOS_IMPUESTO.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">{AYUDA_AMBITO[form.ambito]}</p>
        </div>
        <div>
          <Label htmlFor="im-estado">Estado</Label>
          <select
            id="im-estado"
            className={selectCls}
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value as "Activo" | "Inactivo" })}
          >
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="im-fuente">Fuente de la alícuota</Label>
          <select
            id="im-fuente"
            className={selectCls}
            value={form.fuenteAlicuota}
            onChange={(e) => setForm({ ...form, fuenteAlicuota: e.target.value as FuenteAlicuota })}
          >
            {FUENTES_ALICUOTA.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">
            {AYUDA_FUENTE[form.fuenteAlicuota]}
          </p>
        </div>
      </div>

      {cargaAlicuotas && (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Alícuotas ({form.alicuotas.length})
            </h4>
            <BtnOutline
              type="button"
              onClick={() => setForm({ ...form, alicuotas: [...form.alicuotas, alicuotaVacia()] })}
            >
              <Plus size={13} /> Agregar alícuota
            </BtnOutline>
          </div>
          {form.alicuotas.map((a, i) => (
            <div key={i} className="relative rounded-lg border border-border p-3 pr-10">
              <CamposAlicuota form={a} onChange={(f) => cambiaAlicuota(i, f)} />
              <button
                type="button"
                title="Quitar"
                className="absolute right-2 top-2 p-1.5 hover:bg-red-50 text-red-600 rounded-md"
                onClick={() =>
                  setForm({ ...form, alicuotas: form.alicuotas.filter((_, k) => k !== i) })
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {creando && form.fuenteAlicuota === "Padrón" && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          Este impuesto no lleva alícuotas: se toman del padrón vigente cargado en Ingresos Brutos,
          por CUIT.
        </div>
      )}
      {impuesto && impuesto.fuenteAlicuota === "Fija" && form.fuenteAlicuota !== "Fija" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Para dejar de usar alícuotas fijas, primero desactivá las alícuotas del impuesto desde Ver
          detalles.
        </div>
      )}

      {!valido && (
        <p className="text-xs text-muted-foreground">
          {errorAlic ?? "Completá el código y el nombre para poder guardar."}
        </p>
      )}
    </FormDialog>
  );
}

// --- Página --------------------------------------------------------------------

function Page() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [estadoFilter, setEstadoFilter] = useState<"Activo" | "Inactivo" | "">("");
  const [tab, setTab] = useState<"externos" | "internos">("externos");

  const { can } = useCan();
  const puedeCrear = can("crear", "impuestos");
  const puedeModificar = can("modificar", "impuestos");
  const puedeBorrar = can("borrar", "impuestos");

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useImpuestos({
    page,
    pageSize: PAGE_SIZE,
    search,
    estado: estadoFilter || undefined,
  });

  const filteredRows = useMemo(() => {
    const target: AmbitoImpuesto = tab === "internos" ? "Interno" : "Externo";
    return rows.filter((r) => r.ambito === target);
  }, [rows, tab]);

  const externosCount = useMemo(() => rows.filter((r) => r.ambito === "Externo").length, [rows]);
  const internosCount = useMemo(() => rows.filter((r) => r.ambito === "Interno").length, [rows]);

  const err = error instanceof DataAccessError ? error : null;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = rows.find((r) => r.id === detailId) ?? null;
  const [editTarget, setEditTarget] = useState<Impuesto | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Impuesto | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["impuestos"] });
  const mostrarError = (title: string, message: string) =>
    setConfirmAction({
      title,
      message,
      confirmLabel: "Cerrar",
      variant: "danger",
      onConfirm: () => setConfirmAction(null),
    });

  const toggleEstado = async (row: Impuesto) => {
    try {
      await setImpuestoEstado(row.id, row.estado === "Activo" ? "Inactivo" : "Activo");
      invalidar();
    } catch (e) {
      mostrarError("No se pudo actualizar", (e as Error).message);
    }
  };

  const guardar = async (form: ImpuestoForm) => {
    const payload = {
      codigo: form.codigo,
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      estado: form.estado,
      ambito: form.ambito,
      fuenteAlicuota: form.fuenteAlicuota,
    };
    try {
      if (editTarget) await updateImpuesto(editTarget.id, payload);
      else await createImpuesto(payload, form.alicuotas.map(aInput));
      invalidar();
      setShowNew(false);
      setEditTarget(null);
    } catch (e) {
      const dErr = e as DataAccessError;
      const duplicado = dErr.code === "23505" || /duplicat|unique/i.test(dErr.message);
      mostrarError(
        "No se pudo guardar",
        duplicado
          ? /tax_rates/i.test(dErr.message)
            ? "Hay dos alícuotas con el mismo código y la misma fecha de inicio."
            : `Ya existe un impuesto con el código "${form.codigo.trim()}".`
          : (e as Error).message,
      );
    }
  };

  const eliminar = async () => {
    if (!confirmDelete) return;
    try {
      await deleteImpuesto(confirmDelete.id);
      invalidar();
    } catch (e) {
      mostrarError("No se pudo eliminar", (e as Error).message);
    }
    setConfirmDelete(null);
  };

  const getActions = (row: Impuesto): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetailId(row.id) },
    {
      label: row.estado === "Activo" ? "Desactivar" : "Activar",
      icon: row.estado === "Activo" ? PowerOff : Power,
      disabled: !puedeModificar,
      onClick: () => toggleEstado(row),
    },
    { label: "Editar", icon: Edit3, disabled: !puedeModificar, onClick: () => setEditTarget(row) },
    {
      label: "Eliminar",
      icon: Trash2,
      variant: "danger",
      disabled: !puedeBorrar,
      onClick: () => setConfirmDelete(row),
    },
  ];

  const columns: Column<Impuesto>[] = [
    {
      key: "codigo",
      label: "Código",
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.codigo}</span>,
    },
    {
      key: "nombre",
      label: "Nombre",
      sortable: true,
      render: (r) => (
        <div className="min-w-0">
          <div className="font-medium">{r.nombre}</div>
          {r.descripcion && (
            <div className="text-[11px] text-muted-foreground line-clamp-1">{r.descripcion}</div>
          )}
        </div>
      ),
    },
    {
      key: "ambito",
      label: "Ámbito",
      sortable: true,
      render: (r) => (
        <span title={AYUDA_AMBITO[r.ambito]}>
          <Badge tone={r.ambito === "Interno" ? "success" : "neutral"}>{r.ambito}</Badge>
        </span>
      ),
    },
    {
      key: "fuenteAlicuota",
      label: "Fuente",
      sortable: true,
      render: (r) => <span className="text-xs">{r.fuenteAlicuota}</span>,
    },
    {
      key: "alicuota",
      label: "Alícuota vigente",
      render: (r) => <ResumenAlicuota fuente={r.fuenteAlicuota} alicuotas={r.alicuotas} />,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (r) => <Badge tone={estadoTone(r.estado)}>{r.estado}</Badge>,
    },
  ];

  const tabCls = (activa: boolean) =>
    `relative px-4 py-2.5 text-sm font-medium transition-colors ${
      activa
        ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <PermissionGuard recurso="impuestos">
      <PageHeader
        title="Impuestos"
        description="Catálogo de impuestos y de dónde sale su alícuota: fija por ley, padrón mensual o por cliente."
        action={
          <BtnPrimary type="button" onClick={() => setShowNew(true)} disabled={!puedeCrear}>
            <Plus size={14} /> Nuevo impuesto
          </BtnPrimary>
        }
      />

      <div className="flex gap-1 border-b border-border mb-4">
        <button
          type="button"
          onClick={() => {
            setTab("externos");
            setPage(0);
          }}
          className={tabCls(tab === "externos")}
          title={AYUDA_AMBITO.Externo}
        >
          Externos {externosCount > 0 ? "(" + externosCount + ")" : ""}
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("internos");
            setPage(0);
          }}
          className={tabCls(tab === "internos")}
          title={AYUDA_AMBITO.Interno}
        >
          Internos {internosCount > 0 ? "(" + internosCount + ")" : ""}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="buscar">Buscar</Label>
          <Input
            id="buscar"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(0);
            }}
            placeholder="Código, nombre o descripción…"
          />
        </div>
        <div>
          <Label htmlFor="f-estado">Estado</Label>
          <select
            id="f-estado"
            className={selectCls}
            value={estadoFilter}
            onChange={(e) => {
              setEstadoFilter(e.target.value as "Activo" | "Inactivo" | "");
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando impuestos…
        </div>
      ) : isError ? (
        <MensajeEstado
          tipo={err?.permission ? "permiso" : "error"}
          mensaje={err?.message ?? "Error desconocido"}
          onRetry={() => refetch()}
        />
      ) : isEmpty ? (
        <MensajeEstado tipo="vacio" mensaje="" />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={filteredRows}
            keyExtractor={(r) => r.id}
            pageSize={PAGE_SIZE}
            showDownloadButton={false}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
          />
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>
              {total} impuesto(s) · página {page + 1} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <BtnOutline
                type="button"
                disabled={page === 0 || isFetching}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Anterior
              </BtnOutline>
              <BtnOutline
                type="button"
                disabled={page + 1 >= totalPaginas || isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </BtnOutline>
            </div>
          </div>
        </>
      )}

      {detail && (
        <DetalleModal imp={detail} puedeEditar={puedeModificar} onClose={() => setDetailId(null)} />
      )}

      {(showNew || editTarget) && (
        <ImpuestoFormModal
          impuesto={editTarget}
          onClose={() => {
            setShowNew(false);
            setEditTarget(null);
          }}
          onSave={guardar}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar impuesto"
        message={`¿Estás seguro de eliminar el impuesto "${confirmDelete?.nombre}"? Se eliminan también sus alícuotas. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={eliminar}
      />

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
    </PermissionGuard>
  );
}
