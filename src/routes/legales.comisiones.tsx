import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Info } from "lucide-react";
import { MollyLogo } from "@/components/molly-logo";
import { fmtPct } from "@/lib/aranceles";

export const Route = createFileRoute("/legales/comisiones")({
  head: () => ({
    meta: [
      { title: "Tabla de Comisiones — Moli" },
      {
        name: "description",
        content: "Detalle de comisiones y aranceles vigentes de la plataforma.",
      },
    ],
  }),
  component: Page,
});

const IVA = 21;

type Fila = {
  op: string;
  comPct: number | null;
  comFijo: number | null;
  comTexto: string | null;
};

const filas: Fila[] = [
  { op: "Transferencias entre cuentas Molly", comPct: null, comFijo: null, comTexto: "Sin cargo" },
  {
    op: "Transferencias inmediatas a CBU/CVU (hasta $ 500.000)",
    comPct: null,
    comFijo: null,
    comTexto: "Sin cargo",
  },
  {
    op: "Transferencias inmediatas a CBU/CVU (mas de $ 500.000)",
    comPct: 0.3,
    comFijo: null,
    comTexto: null,
  },
  { op: "Cobros con QR", comPct: 0.8, comFijo: null, comTexto: null },
  { op: "Link de pago (debito / credito)", comPct: 1.9, comFijo: null, comTexto: null },
  { op: "Cobros masivos por lote", comPct: null, comFijo: 45, comTexto: null },
  { op: "Pago de servicios", comPct: null, comFijo: null, comTexto: "Sin cargo" },
  { op: "Alta de subcuenta con CBU propio", comPct: null, comFijo: null, comTexto: "Sin cargo" },
  { op: "Emision de constancia de CBU", comPct: null, comFijo: null, comTexto: "Sin cargo" },
];

const comLabel = (f: Fila) =>
  f.comTexto ? f.comTexto : f.comPct != null ? fmtPct(f.comPct) : "$ 45,00";

const totalLabel = (f: Fila): string => {
  if (f.comTexto) return "—";
  if (f.comPct != null) return `${(f.comPct * (1 + IVA / 100)).toFixed(2).replace(".", ",")}%`;
  return `$ ${(45 * (1 + IVA / 100)).toFixed(2).replace(".", ",")}`;
};

function Page() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <MollyLogo />
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Volver al inicio
          </Link>
        </div>
      </header>
      <article className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
          Tabla de Comisiones
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Vigente desde <span className="font-mono tabular-nums">01/06/2026</span> · Aplicable al
          Plan Empresa.
        </p>

        <div className="mt-8 border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-display font-semibold">Operacion</th>
                <th className="text-right px-4 py-3 font-display font-semibold">Comision</th>
                <th className="text-right px-4 py-3 font-display font-semibold">
                  Impuesto (IVA {IVA}%)
                </th>
                <th className="text-right px-4 py-3 font-display font-semibold">Total cobrado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.op} className="border-t">
                  <td className="px-4 py-3">{f.op}</td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap font-mono tabular-nums">
                    {comLabel(f)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap font-mono tabular-nums text-muted-foreground">
                    {f.comTexto ? "—" : `IVA ${fmtPct(IVA)}`}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap font-mono tabular-nums">
                    {totalLabel(f)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-muted bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          <Info size={14} className="shrink-0 mt-0.5" />
          <p>
            El impuesto (IVA {fmtPct(IVA)}) se aplica <strong>sobre la comision</strong> y MoliPay
            lo retiene y liquida por el servicio. Formula del total cobrado:{" "}
            <span className="font-mono">comision x (1 + {fmtPct(IVA)})</span>. Es independiente de
            retenciones impositivas que correspondan al comercio (Ingresos Brutos, debito/credito).
          </p>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Todas las comisiones estan expresadas en pesos argentinos. IVA no incluido salvo
          indicacion contraria. Los aranceles pueden modificarse con un preaviso minimo de 60 dias
          conforme normativa BCRA.
        </p>
      </article>
    </div>
  );
}
