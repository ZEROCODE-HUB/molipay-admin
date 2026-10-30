import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, RefreshCw } from "lucide-react";
import { PageHeader, Card, BtnOutline } from "@/components/portal-shell";
import { FilaAlerta, ESTILO_SEVERIDAD } from "@/components/alertas/alertas-header";
import {
  QK_ALERTAS_CENTRO,
  SEVERIDAD_LABEL,
  TIPO_ALERTA_LABEL,
  getCentroAlertas,
  marcarAlertasLeidas,
  type AlertaCentro,
  type SeveridadAlerta,
} from "@/lib/api/alertas-centro";

export const Route = createFileRoute("/admin/centro-alertas")({
  component: CentroAlertasPage,
});

/**
 * Centro de alertas: todo lo que requiere accion en el backoffice, de todos
 * los modulos, con filtros. Las alertas desaparecen solas cuando se resuelve
 * la causa; "leida" es solo para el administrador de la sesion.
 */
function CentroAlertasPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [severidad, setSeveridad] = useState<SeveridadAlerta | "">("");
  const [tipo, setTipo] = useState("");
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [buscar, setBuscar] = useState("");

  const q = useQuery({
    queryKey: [...QK_ALERTAS_CENTRO, "pagina"],
    queryFn: () => getCentroAlertas(1000),
    refetchInterval: 60_000,
  });
  const todas = q.data?.alertas ?? [];
  const tipos = useMemo(() => Array.from(new Set(todas.map((a) => a.tipo))).sort(), [todas]);
  const filas = todas.filter(
    (a) =>
      (!severidad || a.severidad === severidad) &&
      (!tipo || a.tipo === tipo) &&
      (!soloNoLeidas || !a.leida) &&
      (!buscar.trim() || `${a.titulo} ${a.detalle}`.toLowerCase().includes(buscar.trim().toLowerCase())),
  );
  const res = q.data?.resumen;

  const marcar = async (claves: string[]) => {
    try {
      await marcarAlertasLeidas(claves);
    } finally {
      void qc.invalidateQueries({ queryKey: QK_ALERTAS_CENTRO });
    }
  };
  const ir = (a: AlertaCentro) => {
    if (!a.leida) void marcar([a.clave]);
    void navigate({ to: a.link } as never);
  };

  return (
    <div>
      <PageHeader
        title="Centro de alertas"
        description="Lo que requiere acción en todos los módulos: monitoreo, bloqueos, contracargos, saldos negativos, conciliación, acreditaciones, adelantos, impuestos y BCRA. Cada alerta desaparece cuando se resuelve su causa."
        action={
          <div className="flex gap-2">
            <BtnOutline onClick={() => void q.refetch()} disabled={q.isFetching}>
              <RefreshCw size={14} className={q.isFetching ? "animate-spin" : ""} /> Actualizar
            </BtnOutline>
            <BtnOutline
              disabled={!filas.some((a) => !a.leida)}
              onClick={() => void marcar(filas.filter((a) => !a.leida).map((a) => a.clave))}
            >
              <CheckCheck size={14} /> Marcar leídas ({filas.filter((a) => !a.leida).length})
            </BtnOutline>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {([
          ["", "Todas", res?.total ?? 0, "bg-black-400"],
          ["critica", "Críticas", res?.critica ?? 0, ESTILO_SEVERIDAD.critica.punto],
          ["advertencia", "Advertencias", res?.advertencia ?? 0, ESTILO_SEVERIDAD.advertencia.punto],
          ["info", "Informativas", res?.info ?? 0, ESTILO_SEVERIDAD.info.punto],
        ] as const).map(([k, label, n, punto]) => (
          <button
            key={k || "todas"}
            type="button"
            onClick={() => setSeveridad(k)}
            className={`rounded-xl border p-4 text-left transition ${severidad === k ? "ring-2 ring-primary/40 bg-muted/40" : "bg-card hover:bg-muted/20"}`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className={`h-2.5 w-2.5 rounded-full ${punto}`} /> {label}
            </div>
            <div className="font-display text-2xl font-bold mt-1 tabular-nums">{n}</div>
          </button>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar por comercio, cliente, marca…"
            className="h-9 flex-1 min-w-[200px] rounded-md border bg-background px-3 text-sm"
          />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="">Todos los módulos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {TIPO_ALERTA_LABEL[t] ?? t}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={soloNoLeidas} onChange={(e) => setSoloNoLeidas(e.target.checked)} /> Solo no leídas
          </label>
        </div>
        <div className="divide-y">
          {q.isLoading ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">Cargando…</p>
          ) : q.isError ? (
            <p className="px-4 py-8 text-sm text-red-700">
              {(q.error as Error).message} (¿se aplicó la migración 20261030180000?)
            </p>
          ) : filas.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No hay alertas con estos filtros.</p>
          ) : (
            filas.map((a) => (
              <FilaAlerta
                key={a.clave}
                a={a}
                onIr={() => ir(a)}
                extra={
                  <>
                    <span className="text-[10px] text-muted-foreground">{SEVERIDAD_LABEL[a.severidad]}</span>
                    {!a.leida && (
                      <button type="button" onClick={() => void marcar([a.clave])} className="text-[11px] text-muted-foreground hover:text-foreground hover:underline">
                        Marcar leída
                      </button>
                    )}
                  </>
                }
              />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
