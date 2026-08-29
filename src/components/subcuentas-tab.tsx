import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, CheckCircle, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { ModalDialog } from "@/components/modal-dialog";
import { ActionsDropdown } from "@/components/actions-dropdown";
import { Badge } from "@/components/portal-shell";
import { toast } from "sonner";

function fmtMonto(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
import {
  type Subcuenta,
  type SubcuentaConfiguracion,
  type SubcuentaParam,
  type SubcuentaComision,
  updateSubcuenta,
} from "@/lib/api/subcuentas";
import { DEFAULT_PARAMS_ALERTAS, DEFAULT_PARAMS_BLOQUEO } from "@/components/user-modal";

export function TablaSubcuentas({
  rows,
  onVerDetalles,
  onValidar,
  onSuspender,
  onReactivar,
  onEliminar,
}: {
  rows: Subcuenta[];
  onVerDetalles: (s: Subcuenta) => void;
  onValidar: (s: Subcuenta) => void;
  onSuspender: (s: Subcuenta) => void;
  onReactivar: (s: Subcuenta) => void;
  onEliminar: (s: Subcuenta) => void;
}) {
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
            <th className="px-4 py-3 font-medium text-right">Acciones</th>
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
                {s.validada && (
                  <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-emerald-600">
                    <CheckCircle size={11} /> Validada
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{fmtMonto(s.saldoDisponible)}</td>
              <td className="px-4 py-3 text-right">
                {s.retirosHabilitados ? "Habilitados" : "Bloqueados"}
              </td>
              <td className="px-4 py-3 text-right">
                <ActionsDropdown
                  actions={[
                    { label: "Ver detalles", icon: Eye, onClick: () => onVerDetalles(s) },
                    {
                      label: "Validar",
                      icon: CheckCircle,
                      onClick: () => onValidar(s),
                      disabled: s.validada,
                    },
                    {
                      label: "Suspender",
                      icon: PauseCircle,
                      onClick: () => onSuspender(s),
                      disabled: s.estado === "Pausada",
                    },
                    {
                      label: "Reactivar",
                      icon: PlayCircle,
                      onClick: () => onReactivar(s),
                      disabled: s.estado === "Activa",
                    },
                    {
                      label: "Eliminar",
                      icon: Trash2,
                      variant: "danger",
                      onClick: () => onEliminar(s),
                    },
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SubcuentaDetalleModal({
  subcuenta,
  legajo,
  onClose,
  onValidar,
  onSuspender,
  onReactivar,
  onEliminar,
}: {
  subcuenta: Subcuenta;
  legajo: string;
  onClose: () => void;
  onValidar: (s: Subcuenta) => void;
  onSuspender: (s: Subcuenta) => void;
  onReactivar: (s: Subcuenta) => void;
  onEliminar: (s: Subcuenta) => void;
}) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<SubcuentaConfiguracion>(
    subcuenta.configuracion ?? { alertas: [], bloqueos: [], comisiones: [] },
  );
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setConfig((c) => ({
      alertas: c.alertas.length ? c.alertas : DEFAULT_PARAMS_ALERTAS.map((p) => ({ ...p })),
      bloqueos: c.bloqueos.length ? c.bloqueos : DEFAULT_PARAMS_BLOQUEO.map((p) => ({ ...p })),
      comisiones: c.comisiones ?? [],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardarConfig = async () => {
    setGuardando(true);
    try {
      await updateSubcuenta(legajo, subcuenta.id, { configuracion: config });
      await queryClient.invalidateQueries({ queryKey: ["subcuentas", legajo] });
      toast.success("Configuración de subcuenta guardada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const actualizarParam = (
    seccion: "alertas" | "bloqueos",
    idx: number,
    cambio: Partial<SubcuentaParam>,
  ) =>
    setConfig((c) => ({
      ...c,
      [seccion]: c[seccion].map((p, i) => (i === idx ? { ...p, ...cambio } : p)),
    }));
  const agregarParam = (seccion: "alertas" | "bloqueos") =>
    setConfig((c) => ({
      ...c,
      [seccion]: [...c[seccion], { label: "Nuevo parámetro", valor: "" }],
    }));
  const quitarParam = (seccion: "alertas" | "bloqueos", idx: number) =>
    setConfig((c) => ({ ...c, [seccion]: c[seccion].filter((_, i) => i !== idx) }));

  const actualizarComision = (idx: number, cambio: Partial<SubcuentaComision>) =>
    setConfig((c) => ({
      ...c,
      comisiones: c.comisiones.map((x, i) => (i === idx ? { ...x, ...cambio } : x)),
    }));
  const agregarComision = () =>
    setConfig((c) => ({
      ...c,
      comisiones: [
        ...c.comisiones,
        { id: crypto.randomUUID(), tipo: "", monto: "", fecha: "", origen: "" },
      ],
    }));
  const quitarComision = (idx: number) =>
    setConfig((c) => ({ ...c, comisiones: c.comisiones.filter((_, i) => i !== idx) }));

  const btnAccion = (extra: string) =>
    `inline-flex items-center gap-1.5 h-9 rounded-md border px-3 text-sm font-medium transition disabled:opacity-40 ${extra}`;

  return (
    <ModalDialog
      open
      onClose={onClose}
      title={`Subcuenta ${subcuenta.nombre} ${subcuenta.apellido}`.trim()}
      size="xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-xs text-muted-foreground">Nombre</p>
          <p className="text-sm font-medium">{subcuenta.nombre}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Apellido</p>
          <p className="text-sm font-medium">{subcuenta.apellido}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Correo asociado</p>
          <p className="text-sm font-medium">{subcuenta.email}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          disabled={subcuenta.validada}
          onClick={() => {
            onValidar(subcuenta);
            onClose();
          }}
          className={btnAccion("hover:bg-accent")}
        >
          <CheckCircle size={16} /> Validar
        </button>
        <button
          type="button"
          disabled={subcuenta.estado === "Pausada"}
          onClick={() => {
            onSuspender(subcuenta);
            onClose();
          }}
          className={btnAccion("hover:bg-accent")}
        >
          <PauseCircle size={16} /> Suspender
        </button>
        <button
          type="button"
          disabled={subcuenta.estado === "Activa"}
          onClick={() => {
            onReactivar(subcuenta);
            onClose();
          }}
          className={btnAccion("hover:bg-accent")}
        >
          <PlayCircle size={16} /> Reactivar
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            onEliminar(subcuenta);
          }}
          className={btnAccion("border-red-300 text-red-600 hover:bg-red-50")}
        >
          <Trash2 size={16} /> Eliminar
        </button>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-border p-4">
          <h4 className="mb-2 text-sm font-semibold">Parámetros de alerta</h4>
          {config.alertas.map((p, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input
                className="flex-1 rounded-md border border-input px-2 py-1.5 text-sm"
                value={p.label}
                onChange={(e) => actualizarParam("alertas", i, { label: e.target.value })}
              />
              <input
                className="flex-1 rounded-md border border-input px-2 py-1.5 text-sm"
                value={p.valor}
                placeholder="Valor"
                onChange={(e) => actualizarParam("alertas", i, { valor: e.target.value })}
              />
              <button
                type="button"
                onClick={() => quitarParam("alertas", i)}
                className="px-2 text-red-600 hover:bg-red-50 rounded-md"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => agregarParam("alertas")}
            className="text-sm text-primary hover:underline"
          >
            + Agregar parámetro
          </button>
        </div>

        <div className="rounded-lg border border-border p-4">
          <h4 className="mb-2 text-sm font-semibold">Parámetros de bloqueo</h4>
          {config.bloqueos.map((p, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input
                className="flex-1 rounded-md border border-input px-2 py-1.5 text-sm"
                value={p.label}
                onChange={(e) => actualizarParam("bloqueos", i, { label: e.target.value })}
              />
              <input
                className="flex-1 rounded-md border border-input px-2 py-1.5 text-sm"
                value={p.valor}
                placeholder="Valor"
                onChange={(e) => actualizarParam("bloqueos", i, { valor: e.target.value })}
              />
              <button
                type="button"
                onClick={() => quitarParam("bloqueos", i)}
                className="px-2 text-red-600 hover:bg-red-50 rounded-md"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => agregarParam("bloqueos")}
            className="text-sm text-primary hover:underline"
          >
            + Agregar parámetro
          </button>
        </div>

        <div className="rounded-lg border border-border p-4">
          <h4 className="mb-2 text-sm font-semibold">Comisiones</h4>
          {config.comisiones.length === 0 && (
            <p className="mb-2 text-xs text-muted-foreground">Sin comisiones configuradas.</p>
          )}
          {config.comisiones.map((c, i) => (
            <div key={c.id} className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input
                className="rounded-md border border-input px-2 py-1.5 text-sm"
                value={c.tipo}
                placeholder="Tipo"
                onChange={(e) => actualizarComision(i, { tipo: e.target.value })}
              />
              <input
                className="rounded-md border border-input px-2 py-1.5 text-sm"
                value={c.monto}
                placeholder="Monto"
                onChange={(e) => actualizarComision(i, { monto: e.target.value })}
              />
              <input
                className="rounded-md border border-input px-2 py-1.5 text-sm"
                value={c.fecha}
                placeholder="Fecha"
                onChange={(e) => actualizarComision(i, { fecha: e.target.value })}
              />
              <div className="flex gap-1">
                <input
                  className="flex-1 rounded-md border border-input px-2 py-1.5 text-sm"
                  value={c.origen}
                  placeholder="Origen"
                  onChange={(e) => actualizarComision(i, { origen: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => quitarComision(i)}
                  className="px-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={agregarComision}
            className="text-sm text-primary hover:underline"
          >
            + Agregar comisión
          </button>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={guardarConfig}
          disabled={guardando}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar configuración"}
        </button>
      </div>
    </ModalDialog>
  );
}
