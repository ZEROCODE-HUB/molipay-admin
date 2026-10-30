import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertOctagon, AlertTriangle, Bell, CheckCheck, ChevronRight, Info } from "lucide-react";
import {
  QK_ALERTAS_CENTRO,
  TIPO_ALERTA_LABEL,
  getCentroAlertas,
  haceCuanto,
  marcarAlertasLeidas,
  type AlertaCentro,
  type SeveridadAlerta,
} from "@/lib/api/alertas-centro";

export const ESTILO_SEVERIDAD: Record<SeveridadAlerta, { icono: typeof Bell; color: string; fondo: string; punto: string }> = {
  critica: { icono: AlertOctagon, color: "text-red-600", fondo: "bg-red-50", punto: "bg-red-500" },
  advertencia: { icono: AlertTriangle, color: "text-amber-600", fondo: "bg-amber-50", punto: "bg-amber-400" },
  info: { icono: Info, color: "text-sky-600", fondo: "bg-sky-50", punto: "bg-sky-500" },
};

/**
 * Campana del header: contador de alertas no leidas (rojo si hay criticas,
 * amarillo si solo advertencias) y un desplegable con las 10 mas urgentes y
 * su accion directa. Se actualiza cada minuto y al volver a la pestaña.
 */
export function AlertasHeader() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const q = useQuery({
    queryKey: [...QK_ALERTAS_CENTRO, "header"],
    queryFn: () => getCentroAlertas(10),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  useEffect(() => {
    if (!open) return;
    const fuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const res = q.data?.resumen;
  const noLeidas = res?.no_leidas ?? 0;
  const tono = (res?.criticas_no_leidas ?? 0) > 0 ? "bg-red-500" : noLeidas > 0 ? "bg-amber-400" : "";
  const alertas = q.data?.alertas ?? [];

  const marcar = async (claves: string[]) => {
    try {
      await marcarAlertasLeidas(claves);
    } finally {
      void qc.invalidateQueries({ queryKey: QK_ALERTAS_CENTRO });
    }
  };

  const ir = (a: AlertaCentro) => {
    setOpen(false);
    if (!a.leida) void marcar([a.clave]);
    // El link lo arma la base y siempre es una ruta del backoffice.
    void navigate({ to: a.link } as never);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative h-9 w-9 inline-flex items-center justify-center rounded-full border border-black-100 bg-white text-black-600 hover:bg-plata-200 transition-colors ${
          open ? "ring-2 ring-primary/30" : ""
        }`}
        aria-label={noLeidas > 0 ? `Alertas: ${noLeidas} sin leer` : "Alertas"}
        title="Centro de alertas"
      >
        <Bell size={18} />
        {noLeidas > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full ${tono} text-white text-[10px] font-bold leading-[18px] text-center`}
          >
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-[80] w-[min(400px,calc(100vw-2rem))] rounded-xl border bg-card shadow-xl overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Alertas</div>
              <div className="flex gap-3 text-[11px] text-muted-foreground mt-0.5">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> {res?.critica ?? 0} críticas
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> {res?.advertencia ?? 0} advertencias
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-sky-500" /> {res?.info ?? 0} info
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={noLeidas === 0}
              onClick={() => void marcar(alertas.filter((a) => !a.leida).map((a) => a.clave))}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-40 disabled:no-underline"
              title="Marcar como leídas las que se ven"
            >
              <CheckCheck size={14} /> Marcar leídas
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto divide-y">
            {q.isLoading ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Cargando…</p>
            ) : q.isError ? (
              <p className="px-4 py-6 text-sm text-red-700">
                No se pudieron leer las alertas. {(q.error as Error).message}
              </p>
            ) : alertas.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                <CheckCheck size={22} className="mx-auto mb-2 text-emerald-500" />
                Todo en orden: no hay alertas pendientes.
              </div>
            ) : (
              alertas.map((a) => <FilaAlerta key={a.clave} a={a} onIr={() => ir(a)} />)
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void navigate({ to: "/admin/centro-alertas" });
            }}
            className="w-full flex items-center justify-center gap-1 border-t px-4 py-2.5 text-sm font-semibold text-primary hover:bg-muted/40"
          >
            Ver centro de alertas{res && res.total > alertas.length ? ` (${res.total})` : ""} <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

export function FilaAlerta({ a, onIr, extra }: { a: AlertaCentro; onIr: () => void; extra?: ReactNode }) {
  const e = ESTILO_SEVERIDAD[a.severidad];
  const Icono = e.icono;
  return (
    <div className={`flex gap-3 px-4 py-3 ${a.leida ? "opacity-60" : ""}`}>
      <div className={`mt-0.5 h-8 w-8 shrink-0 rounded-full ${e.fondo} ${e.color} inline-flex items-center justify-center`}>
        <Icono size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold leading-tight">
            {!a.leida && <span className={`inline-block h-2 w-2 rounded-full ${e.punto} mr-1.5 align-middle`} />}
            {a.titulo}
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground">{haceCuanto(a.fecha)}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 break-words">{a.detalle}</div>
        <div className="mt-1.5 flex items-center gap-3">
          <button type="button" onClick={onIr} className="text-xs font-semibold text-primary hover:underline">
            {a.accion} →
          </button>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{TIPO_ALERTA_LABEL[a.tipo] ?? a.tipo}</span>
          {extra}
        </div>
      </div>
    </div>
  );
}
