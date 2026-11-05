import { useState } from "react";
import { Search,ArrowLeftRight,Banknote,Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Input } from "@/shared/ui/form-controls";
import { BtnPrimary } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";

type QueryType = "deposito" | "retiro";

type ConsultaResult = {
  legajo: string;
  nombre: string;
  email: string;
  monto: string;
  estado: string;
  fecha: string;
  terceroNombre: string;
  terceroCvu: string;
  terceroCuit: string;
  tipo: QueryType;
};

function mockResult(id: string, kind: QueryType): ConsultaResult {
  const base = Number(id.replace(/\D/g, "")) || 1000;
  return {
    legajo: `LEG-${base}`,
    nombre: kind === "deposito" ? "María Rodríguez" : "Luis Fernández",
    email: kind === "deposito" ? "mrodriguez@molipay.com" : "lfernandez@molipay.com",
    monto: `$${(((base * 137) % 90000) + 1000).toLocaleString("es-AR")}`,
    estado: base % 3 === 0 ? "Pendiente" : base % 3 === 1 ? "Acreditado" : "Rechazado",
    fecha:
      kind === "deposito"
        ? `2026-07-${((base % 27) + 1).toString().padStart(2, "0")} 14:32`
        : `2026-07-${((base % 27) + 1).toString().padStart(2, "0")} 09:15`,
    terceroNombre: kind === "deposito" ? "Juan Pérez" : "Comercio Express SRL",
    terceroCvu: `000000${base.toString().padStart(18, "0")}`.slice(-22),
    terceroCuit: `30-${((base % 90000000) + 10000000).toString()}-${base % 9}`,
    tipo: kind,
  };
}

const statusTone: Record<string, "success" | "warn" | "danger" | "neutral"> = {
  Acreditado: "success",
  Pendiente: "warn",
  Rechazado: "danger",
};

export function SupportPage() {
  const [kind, setKind] = useState<QueryType>("deposito");
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsultaResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const consultar = () => {
    if (!id.trim()) {
      setError("Ingresá un ID de Coelsa");
      setResult(null);
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      setResult(mockResult(id.trim(), kind));
      setLoading(false);
    }, 600);
  };

  const fieldDate = kind === "deposito" ? "Fecha de depósito" : "Fecha de retiro";
  const fieldTercero = kind === "deposito" ? "Nombre del depositante" : "Nombre del destinatario";
  const labelCvu = kind === "deposito" ? "CVU del depositante" : "CVU del destinatario";
  const labelCuit = kind === "deposito" ? "CUIT del depositante" : "CUIT del destinatario";

  return (
    <>
      <PageHeader
        title="Consultas frecuentes"
        description="Consultá depósitos y retiros por ID de Coelsa"
      />

      <div className="bg-card border rounded-lg p-5 space-y-4 max-w-2xl">
        <div className="inline-flex p-1 rounded-lg bg-muted text-sm font-medium">
          <button
            type="button"
            onClick={() => setKind("deposito")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              kind === "deposito"
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Banknote size={16} /> Depósito
          </button>
          <button
            type="button"
            onClick={() => setKind("retiro")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              kind === "retiro"
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowLeftRight size={16} /> Retiro
          </button>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              ID de Coelsa
            </label>
            <Input
              placeholder={kind === "deposito" ? "Ej: COE-1293" : "Ej: COE-8841"}
              value={id}
              onChange={(e) => setId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && consultar()}
            />
          </div>
          <BtnPrimary onClick={consultar} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Consultar
          </BtnPrimary>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {loading && (
        <div className="bg-card border rounded-lg p-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 size={18} className="animate-spin" /> Consultando…
        </div>
      )}

      {result && !loading && (
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-foreground">
              Resultado — {result.tipo === "deposito" ? "Depósito" : "Retiro"}
            </h3>
            <Badge tone={statusTone[result.estado] ?? "neutral"}>{result.estado}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
            <Field label="Legajo" value={result.legajo} mono />
            <Field label="Nombre" value={result.nombre} />
            <Field label="Email" value={result.email} />
            <Field label="Monto" value={result.monto} mono />
            <Field label="Estado" value={result.estado} />
            <Field label={fieldDate} value={result.fecha} mono />
            <Field label={fieldTercero} value={result.terceroNombre} />
            <Field label={labelCvu} value={result.terceroCvu} mono />
            <Field label={labelCuit} value={result.terceroCuit} mono />
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-medium text-foreground ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </div>
    </div>
  );
}
