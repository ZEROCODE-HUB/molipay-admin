import {
BCRA_FILE_LABEL,
markFiled,
type BcraControl,
type BcraFile,
type BcraFiling,
} from "@/features/regulatory-reports/bcra.supabase";
import { Badge } from "@/shared/ui/badge";
import { AlertTriangle,CheckCircle2,X } from "lucide-react";
import { formatMoney } from "@/shared/lib/format";
import { type ReactNode,useEffect,useState } from "react";
import { toast } from "sonner";
import { FormDialog } from "@/shared/ui/form-dialog";
import { type ColPreview } from "@/features/regulatory-reports/bcra-reports.types";
import { errMsg,labelPeriod } from "@/features/regulatory-reports/bcra-reports.rules";

export function StatusBadge({ p }: { p: BcraFiling }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Badge tone={p.estado === "presentado" ? "success" : "warn"}>
        {p.estado === "presentado" ? "Presentado" : "Generado"}
      </Badge>
      {p.version > 1 && <Badge>v{p.version}</Badge>}
    </span>
  );
}

export function ControlCell({ control }: { control?: BcraControl }) {
  if (!control) return <span className="text-xs text-muted-foreground">Generá el Apartado A</span>;
  if (control.cuadra)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 size={13} /> Cuadra
      </span>
    );
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"
      title="Saldo final − (inicial + créditos − débitos). Puede venir de ajustes, adelantos o reversos."
    >
      <AlertTriangle size={13} /> Dif. {formatMoney(control.diferencia)}
    </span>
  );
}

/* ---------- Modal base ---------- */

export function Modal({
  onClose,
  children,
  className = "max-w-5xl",
}: {
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full ${className} max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden`}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({
  icon,
  title,
  subtitle,
  extra,
  onClose,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  extra?: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{title}</h3>
            {extra}
          </div>
          <p className="text-xs text-muted-foreground font-mono truncate">{subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        aria-label="Cerrar"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/** Columnas en el orden del archivo, con los nombres que usa Compliance. */
export const COLUMNS_PREVIEW: Record<BcraFile, ColPreview[]> = {
  A: [
    {
      key: "codigo",
      label: "Código (partida+día)",
      hint: "Código de 7 dígitos: el número de bloque (1 a 6) seguido del día del mes.\nEj.: 1000005 = bloque 1, día 5. Los meses con menos de 31 días completan hasta el día 31 con ceros.",
    },
    {
      key: "monto",
      label: "Campo 1",
      align: "right",
      hint: "MONTO: saldo al cierre de ese día, en miles de pesos y sin decimales.\nBloque 1: plata de los clientes en sus cuentas. Bloque 2: plata depositada en la cuenta a la vista del banco. Bloque 6: cobros con tarjeta pendientes de liquidar. Bloques 3 y 4 (fondos de inversión): siempre 0.",
    },
    {
      key: "cantidad",
      label: "Campo 2",
      align: "right",
      hint: "CANTIDAD de cuentas.\nBloque 1: cuentas de pago que ese día tenían saldo mayor a 0. Bloque 5: total de cuentas activas, tengan o no saldo. En los demás bloques va vacío.",
    },
    {
      key: "aux",
      label: "Campo 3",
      hint: "Dato auxiliar (COL_AUX).\nBloque 2: CBU o identificador de la cuenta a la vista donde están depositados los fondos de los clientes. Se carga en Partidas y parámetros. En el resto va vacío.",
    },
  ],
  B: [
    {
      key: "codigo",
      label: "Código",
      hint: "Partida (concepto) que se informa.\n5001000: transferencias de CVU a CBU (enviadas a bancos). 5002000: de CBU a CVU (recibidas desde bancos). 5003000: de CVU a CVU acreditadas. 5004000: de CVU a CVU debitadas. 2020220: pagos con transferencia / QR. 60xxxxx: cantidad de clientes y cuentas.",
    },
    {
      key: "medio",
      label: "(sin uso)",
      hint: "Medio de pago (Tabla 1 del BCRA).\n6 = transferencia inmediata push · 7 = pull · 8 = pago con transferencia (QR) · 1 / 2 = tarjeta de crédito / débito. Vacío en las partidas que solo cuentan clientes o cuentas.",
    },
    {
      key: "esquema",
      label: "(sin uso)",
      hint: "Esquema de pago (Tabla 2 del BCRA).\n00007 = CBU · 00008 = CVU · 00009 = esquema propio de MoliPay. Vacío en las partidas que solo cuentan clientes o cuentas.",
    },
    {
      key: "cantidad",
      label: "Cantidad",
      align: "right",
      hint: "Cantidad de operaciones del mes en esa partida.\nEn las partidas 60xxxxx es la cantidad de clientes o de cuentas.",
    },
    {
      key: "monto",
      label: "Monto (en miles)",
      align: "right",
      hint: "Importe total del mes en miles de pesos, sin decimales (0,5 o más redondea para arriba). Ej.: 1.635.371 = $ 1.635.371.000.\nIngresos: netos de comisión e impuesto. Egresos: total que salió de la cuenta. Vacío en las partidas que solo cuentan.",
    },
  ],
  P: [
    {
      key: "tipoDocumento",
      label: "Tipo",
      hint: "Tipo de documento. Siempre 11, que significa CUIT.",
    },
    { key: "cuit", label: "CUIT", hint: "CUIT de la empresa: 11 dígitos sin guiones." },
    { key: "sufijo", label: "Código", hint: "Sufijo de la cuenta. Siempre 00." },
    { key: "vacio", label: "DNI", hint: "No aplica a empresas: siempre va vacío." },
    {
      key: "razonSocial",
      label: "Nombre",
      hint: "Razón social de la empresa. En el archivo se completa con espacios hasta 80 caracteres.",
      render: (r) => <span className="font-sans">{String(r.razonSocial ?? "").trimEnd()}</span>,
    },
    { key: "flag", label: "(cero)", hint: "Campo de control fijo. Siempre 0." },
    {
      key: "codigoPostal",
      label: "Cód. Postal",
      hint: 'Código postal del domicilio legal (ej. C1425BXG), completado a 8 caracteres.\nSi dice "sin dato", hay que cargarlo en la ficha del cliente antes de presentar.',
      render: (r) =>
        String(r.codigoPostal ?? "").trim() ? (
          String(r.codigoPostal).trim()
        ) : (
          <Badge tone="warn">sin dato</Badge>
        ),
    },
    {
      key: "tipoPersonaSocietaria",
      label: "Alta(10)/Baja(20)",
      hint: "Código del tipo de sociedad, tomado del tipo de sociedad de la ficha del cliente.\nHoy: 10 = S.A., 20 = S.R.L., 11 = S.A.S. Si la ficha no lo tiene, se usa 20.",
    },
  ],
  I: [
    {
      key: "codigo",
      label: "Partida",
      hint: "Concepto informado. 2010100 = débitos en cuentas de pago por transferencias entre cuentas de MoliPay.",
    },
    {
      key: "medio",
      label: "Medio de pago",
      hint: "6 = transferencia inmediata push (envío instantáneo de fondos).",
    },
    { key: "moneda", label: "Moneda", hint: "ARS = pesos argentinos." },
    {
      key: "titular",
      label: "Tipo titular",
      hint: "1 = Persona Humana · 2 = Persona Jurídica (empresa).",
      render: (r) => (r.titular === "2" ? "2 · Jurídica" : "1 · Humana"),
    },
    {
      key: "cantidad",
      label: "Cantidad",
      align: "right",
      hint: "Cantidad de transferencias del mes de ese tipo de titular.",
    },
    {
      key: "monto",
      label: "Monto (en miles)",
      align: "right",
      hint: "Total transferido en el mes, en miles de pesos y sin decimales. Ej.: 1.635.371 = $ 1.635.371.000.",
    },
  ],
};

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground truncate">{hint}</div>}
    </div>
  );
}

export function Amount({ label, v, tone }: { label: string; v: number; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-sans">
        {label}
      </div>
      <div
        className={`font-semibold ${tone === "ok" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : ""}`}
      >
        {formatMoney(v)}
      </div>
    </div>
  );
}

export function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 px-2.5 rounded-full border text-[11px] font-semibold ${
        on
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- Marcar presentado ---------- */

export function MarkFiledDialog({
  p,
  onClose,
  onDone,
}: {
  p: BcraFiling;
  onClose: () => void;
  onDone: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const send = async () => {
    setSending(true);
    try {
      await markFiled(p.id, notes.trim());
      toast.success(
        `${BCRA_FILE_LABEL[p.archivo]} de ${labelPeriod(p.periodo)} marcado como presentado.`,
      );
      onDone();
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSending(false);
    }
  };
  return (
    <FormDialog
      open
      onClose={onClose}
      title="Marcar como presentado"
      description={`${BCRA_FILE_LABEL[p.archivo]} · ${labelPeriod(p.periodo)} · versión ${p.version}. Una vez presentado no se puede modificar: cualquier cambio posterior genera una rectificativa.`}
      onSubmit={() => void send()}
      submitLabel={sending ? "Guardando…" : "Marcar presentado"}
      isSubmitting={sending}
    >
      <label className="text-xs font-semibold mb-1.5 block">Notas (opcional)</label>
      <textarea
        className="w-full min-h-[70px] rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Ej.: número de presentación SISCEN, fecha de envío."
      />
    </FormDialog>
  );
}
