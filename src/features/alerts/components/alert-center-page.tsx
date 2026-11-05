import { userMessage } from "@/shared/lib/errors";
import { useMemo,useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { CheckCheck,RefreshCw } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { BtnOutline } from "@/shared/ui/button";
import { RowAlert,ESTILO_SEVERITY } from "@/features/alerts/components/alerts-header";
import {
QK_ALERTS_CENTRO,
SEVERITY_LABEL,
KIND_ALERT_LABEL,
getCentroAlerts,
markAlertsLeidas,
type AlertCentro,
type SeverityAlert,
} from "@/features/alerts/alert-center.supabase";

/**
 * Centro de alertas: todo lo que requiere accion en el backoffice, de todos
 * los modulos, con filtros. Las alertas desaparecen solas cuando se resuelve
 * la causa; "leida" es solo para el administrador de la sesion.
 */
export function AlertCenterPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [severity, setSeverity] = useState<SeverityAlert | "">("");
  const [kind, setKind] = useState("");
  const [onlyNoLeidas, setOnlyNoLeidas] = useState(false);
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: [...QK_ALERTS_CENTRO, "pagina"],
    queryFn: () => getCentroAlerts(1000),
    refetchInterval: 60_000,
  });
  const all = q.data?.alertas ?? [];
  const kinds = useMemo(() => Array.from(new Set(all.map((a) => a.tipo))).sort(), [all]);
  const rows = all.filter(
    (a) =>
      (!severity || a.severidad === severity) &&
      (!kind || a.tipo === kind) &&
      (!onlyNoLeidas || !a.leida) &&
      (!search.trim() ||
        `${a.titulo} ${a.detalle}`.toLowerCase().includes(search.trim().toLowerCase())),
  );
  const res = q.data?.resumen;

  const mark = async (keys: string[]) => {
    try {
      await markAlertsLeidas(keys);
    } finally {
      void qc.invalidateQueries({ queryKey: QK_ALERTS_CENTRO });
    }
  };
  const ir = (a: AlertCentro) => {
    if (!a.leida) void mark([a.clave]);
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
              disabled={!rows.some((a) => !a.leida)}
              onClick={() => void mark(rows.filter((a) => !a.leida).map((a) => a.clave))}
            >
              <CheckCheck size={14} /> Marcar leídas ({rows.filter((a) => !a.leida).length})
            </BtnOutline>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {(
          [
            ["", "Todas", res?.total ?? 0, "bg-black-400"],
            ["critica", "Críticas", res?.critica ?? 0, ESTILO_SEVERITY.critica.punto],
            [
              "advertencia",
              "Advertencias",
              res?.advertencia ?? 0,
              ESTILO_SEVERITY.advertencia.punto,
            ],
            ["info", "Informativas", res?.info ?? 0, ESTILO_SEVERITY.info.punto],
          ] as const
        ).map(([k, label, n, point]) => (
          <button
            key={k || "todas"}
            type="button"
            onClick={() => setSeverity(k)}
            className={`rounded-xl border p-4 text-left transition ${severity === k ? "ring-2 ring-primary/40 bg-muted/40" : "bg-card hover:bg-muted/20"}`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className={`h-2.5 w-2.5 rounded-full ${point}`} /> {label}
            </div>
            <div className="font-display text-2xl font-bold mt-1 tabular-nums">{n}</div>
          </button>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por comercio, cliente, marca…"
            className="h-9 flex-1 min-w-[200px] rounded-md border bg-background px-3 text-sm"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Todos los módulos</option>
            {kinds.map((t) => (
              <option key={t} value={t}>
                {KIND_ALERT_LABEL[t] ?? t}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={onlyNoLeidas}
              onChange={(e) => setOnlyNoLeidas(e.target.checked)}
            />{" "}
            Solo no leídas
          </label>
        </div>
        <div className="divide-y">
          {q.isLoading ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">Cargando…</p>
          ) : q.isError ? (
            <p className="px-4 py-8 text-sm text-red-700">
              {userMessage(q.error)} (¿se aplicó la migración 20261030180000?)
            </p>
          ) : rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No hay alertas con estos filtros.
            </p>
          ) : (
            rows.map((a) => (
              <RowAlert
                key={a.clave}
                a={a}
                onIr={() => ir(a)}
                extra={
                  <>
                    <span className="text-[10px] text-muted-foreground">
                      {SEVERITY_LABEL[a.severidad]}
                    </span>
                    {!a.leida && (
                      <button
                        type="button"
                        onClick={() => void mark([a.clave])}
                        className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                      >
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
