import { Badge } from "@/shared/ui/badge";
import { ADDRESS_DE_OPERATION,type TaxAssignment } from "@/infrastructure/supabase/legacy/types";
import { formatValue } from "@/shared/lib/tax-format";
import { SummaryRate } from "@/features/taxes/components/rate-summary";

export function FichaDato({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground break-words">{value}</dd>
    </div>
  );
}

export function FieldGrid({ campos: fields }: { campos: { label: string; valor: string }[] }) {
  return (
    <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
      {fields.map((c) => (
        <FichaDato key={c.label} label={c.label} value={c.valor} />
      ))}
    </dl>
  );
}

export function SectionCard({
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

export function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "default" | "muted";
}) {
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

export const apiUsersColumns = [
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

/** Alicuota que rige para la asignacion segun la fuente del impuesto. */
export function RateAsignada({ a }: { a: TaxAssignment }) {
  if (!a.impuesto) return <>—</>;
  if (a.impuesto.fuenteAlicuota === "Manual")
    return (
      <span className="font-mono tabular-nums">
        {a.tipoCalculo && a.alicuotaPropia !== null
          ? formatValue({ tipoCalculo: a.tipoCalculo, valor: a.alicuotaPropia })
          : "Sin alícuota"}
      </span>
    );
  return (
    <SummaryRate
      fuente={a.impuesto.fuenteAlicuota}
      alicuotas={a.impuesto.alicuotas}
      direccion={a.operacion ? ADDRESS_DE_OPERATION[a.operacion] : undefined}
    />
  );
}

export function DetailJson({ titulo: title, data }: { titulo: string; data: unknown }) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <pre className="max-h-48 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
        {text}
      </pre>
    </div>
  );
}
