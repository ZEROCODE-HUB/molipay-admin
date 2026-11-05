import { useMemo,useState } from "react";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/shared/ui/badge";
import { type Column } from "@/shared/ui/data-table";
import { Amount,date } from "@/features/payment-links/components/credits-common";
import {
QK_ACRED,
KIND_EXCEPCION_LABEL,
listExcepciones,
type Excepcion,
} from "@/features/payment-links/credits.supabase";
import { useCan } from "@/features/rbac/rbac.hooks";
import { type Action } from "@/features/payment-links/exceptions.types";
import { esAccionable,daysHabiles } from "@/features/payment-links/exceptions.rules";

/** Estado y acciones de ExceptionsPage: el componente solo dibuja. */
export function useExceptionsPage() {
  const { can } = useCan();
  const puede = can("modificar", "comercios");
  const qc = useQueryClient();
  const [status, setStatus] = useState<"abierta" | "resuelta" | "descartada" | "todas">("abierta");
  const [kind, setKind] = useState("");
  const [sel, setSel] = useState<Set<string | number>>(new Set());
  const [dialog, setDialog] = useState<{ accion: Action; ids: string[] } | null>(null);

  const q = useQuery({
    queryKey: [...QK_ACRED, "excepciones", status],
    queryFn: () => listExcepciones({ estado: status }),
  });

  const rows = useMemo(
    () =>
      (q.data ?? []).filter(
        (r) =>
          (!kind || r.tipo === kind) &&
          (status === "todas" || r.clase === "aviso" || r.excepcion_estado === status),
      ),
    [q.data, kind, status],
  );
  const rowKey = (r: Excepcion) => `${r.clase}:${r.id}`;
  const selection = rows.filter((r) => sel.has(rowKey(r)));
  const kindsSel = new Set(selection.map((r) => r.tipo));
  const mismoKind = kindsSel.size <= 1;

  const abiertas = (q.data ?? []).filter(
    (r) => r.clase === "excepcion" && r.excepcion_estado === "abierta",
  );
  const summaryByKind = useMemo(() => {
    const m = new Map<string, { n: number; neto: number }>();
    for (const r of abiertas) {
      const g = m.get(r.tipo) ?? { n: 0, neto: 0 };
      g.n++;
      g.neto += Number(r.total_neto);
      m.set(r.tipo, g);
    }
    return [...m.entries()];
  }, [abiertas]);

  const toggle = (id: string | number) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSel((s) => {
      const visibles = rows.filter((r) => esAccionable(r)).map(rowKey);
      const all = visibles.every((k) => s.has(k));
      return all ? new Set() : new Set(visibles);
    });

  const open = (action: Action, ids: string[]) => setDialog({ accion: action, ids });

  const columns: Column<Excepcion>[] = [
    {
      key: "fecha",
      label: "Fecha",
      render: (r) => <span className="font-mono text-xs">{date(r.fecha)}</span>,
    },
    { key: "marca", label: "Bandera", render: (r) => r.marca },
    {
      key: "establecimiento",
      label: "Establecimiento",
      render: (r) => <span className="font-mono text-xs">{r.establecimiento}</span>,
    },
    { key: "total_neto", label: "Neto", render: (r) => <Amount v={r.total_neto} strong /> },
    {
      key: "tipo",
      label: "Tipo de excepción",
      hint: "Establecimiento sin comercio / comercio inactivo: el renglón no se importó. Diferencia con ventas: se importó, pero lo pagado no coincide con las ventas registradas.",
      render: (r) => (
        <div className="leading-tight">
          <Badge tone={r.clase === "aviso" ? "neutral" : "warn"}>
            {KIND_EXCEPCION_LABEL[r.tipo] ?? r.tipo}
          </Badge>
          {r.motivo_excepcion && (
            <div className="text-[10px] text-muted-foreground mt-0.5">{r.motivo_excepcion}</div>
          )}
        </div>
      ),
    },
    {
      key: "importacion",
      label: "Importación",
      render: (r) => <span className="text-xs">{r.importacion?.archivo_nombre ?? "—"}</span>,
    },
    {
      key: "antiguedad",
      label: "Antigüedad",
      hint: "Días hábiles desde la fecha de pago.",
      render: (r) => <span className="font-mono text-xs">{daysHabiles(r.fecha)} d</span>,
    },
    {
      key: "estado",
      label: "Estado",
      render: (r) =>
        r.clase === "aviso" ? (
          <Badge tone="neutral">Aviso</Badge>
        ) : r.excepcion_estado === "abierta" ? (
          <Badge tone="warn">Abierta</Badge>
        ) : r.excepcion_estado === "resuelta" ? (
          <span title={r.resolucion_motivo ?? undefined}>
            <Badge tone="success">Resuelta</Badge>
          </span>
        ) : (
          <span title={r.resolucion_motivo ?? undefined}>
            <Badge tone="neutral">Descartada</Badge>
          </span>
        ),
    },
  ];
  return {
    puede,
    qc,
    status,
    setStatus,
    kind,
    setKind,
    sel,
    setSel,
    dialog,
    setDialog,
    q,
    rows,
    rowKey,
    selection,
    mismoKind,
    abiertas,
    summaryByKind,
    toggle,
    toggleAll,
    open,
    columns,
  };
}

export type ExceptionsPageVm = ReturnType<typeof useExceptionsPage>;
