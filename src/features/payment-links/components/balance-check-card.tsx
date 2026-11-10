import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import {
  QK_ACRED,
  balanceCheck,
  type BalanceCheck,
} from "@/features/payment-links/credits.supabase";
import { Amount, errMsg } from "@/features/payment-links/components/credits-common";
import { formatDateTime } from "@/shared/lib/format";
import { Card } from "@/shared/ui/card";

/** Cada problema del control, en una linea que el operador pueda seguir. */
function issues(d: BalanceCheck): { titulo: string; detalle: React.ReactNode }[] {
  return [
    ...d.subcuentas.map((s) => ({
      titulo: `Subcuenta ${s.legajo} · ${s.nombre}`,
      detalle: (
        <>
          Disponible <Amount v={s.disponible} /> / ledger <Amount v={s.disponible_ledger} /> ·
          Retenido <Amount v={s.retenido} /> / ledger <Amount v={s.retenido_ledger} />
          {s.conciliado < 0 && (
            <>
              {" "}
              · Conciliado negativo <Amount v={s.conciliado} />
            </>
          )}
        </>
      ),
    })),
    ...d.lotes.map((l) => ({
      titulo: `Lote ${l.codigo}`,
      detalle: (
        <>
          Acreditado <Amount v={l.neto_a_acreditar} /> / entró a la subcuenta{" "}
          <Amount v={l.acreditado_ledger} />
        </>
      ),
    })),
    ...d.adelantos.map((a) => ({
      titulo: `Adelanto ${a.adelanto_id.slice(0, 8)} (${a.estado})`,
      detalle: (
        <>
          Compensado <Amount v={a.compensado} /> / compensaciones <Amount v={a.compensaciones} /> de{" "}
          <Amount v={a.monto} />
        </>
      ),
    })),
    ...d.deudas.map((x) => ({
      titulo: `Deuda ${x.deuda_id.slice(0, 8)} (${x.origen})`,
      detalle: (
        <>
          Recuperado <Amount v={x.recuperado} /> / recuperos <Amount v={x.recuperos} /> de{" "}
          <Amount v={x.monto} />
        </>
      ),
    })),
    ...d.cuentas_puente
      .filter((c) => Number(c.diferencia) !== 0)
      .map((c) => ({
        titulo: `Cuenta ${c.cuenta}`,
        detalle: (
          <>
            Ledger <Amount v={c.ledger} /> / pendiente en tablas <Amount v={c.detalle} />
          </>
        ),
      })),
  ];
}

/** Control de saldos: el saldo de cada comercio coincide con lo contabilizado. */
export function BalanceCheckCard() {
  const q = useQuery({
    queryKey: [...QK_ACRED, "control-saldos"],
    queryFn: balanceCheck,
    staleTime: 60_000,
  });
  const list = q.data ? issues(q.data) : [];

  return (
    <Card className="mb-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {q.data && !q.data.ok ? (
            <ShieldAlert size={16} className="text-red-600" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-600" />
          )}
          Control de saldos
        </h3>
        <button
          type="button"
          onClick={() => q.refetch()}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          title="Volver a revisar"
          aria-label="Volver a revisar"
        >
          <RefreshCw size={14} className={q.isFetching ? "animate-spin" : ""} />
        </button>
      </div>
      {q.isPending ? (
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
      ) : q.isError ? (
        <p className="text-sm text-red-700">{errMsg(q.error)}</p>
      ) : list.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Los saldos de las subcuentas, adelantos, deudas y lotes acreditados coinciden con el
          ledger. Revisado {formatDateTime(q.data.revisado_at)}.
        </p>
      ) : (
        <>
          <p className="text-xs text-red-700">
            {list.length} diferencia(s) entre los saldos y lo contabilizado. No acredites a esos
            comercios hasta revisarlas.
          </p>
          <ul className="max-h-60 divide-y overflow-auto rounded-md border text-xs">
            {list.map((i, n) => (
              <li key={n} className="px-3 py-2">
                <div className="font-semibold">{i.titulo}</div>
                <div className="text-muted-foreground">{i.detalle}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
