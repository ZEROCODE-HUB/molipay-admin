import { useTaxesForAssignment } from "@/features/taxes/taxes.hooks";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
CERTIFICATE_KINDS,
KINDS_EXEMPTION,
createExemption,
searchCustomerByCuit,
type KindExemption,
} from "@/features/taxes/exemptions.supabase";
import { toast } from "sonner";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input,Label } from "@/shared/ui/form-controls";
import { type AltaForm } from "@/features/taxes/debits-credits.types";
import { localAIso } from "@/features/taxes/debits-credits.rules";
import { selectCls } from "@/features/taxes/taxes.rules";

export function NewExemptionDialog({
  onClose,
  onCreada,
}: {
  onClose: () => void;
  onCreada: () => void;
}) {
  const { rows: taxes } = useTaxesForAssignment();
  const [f, setF] = useState<AltaForm>({
    cuit: "",
    impuestoId: "",
    direccion: "Ambos",
    tipo: "Certificado de exención",
    motivo: "",
    desde: "",
    hasta: "",
    codigo: "",
    certificado: null,
  });
  const [saving, setSaving] = useState(false);

  // Impuesto por defecto: Debitos y Creditos.
  const taxId =
    f.impuestoId || taxes.find((i) => /DEBITOS|^DC$/i.test(i.codigo))?.id || taxes[0]?.id || "";
  const tax = taxes.find((i) => i.id === taxId);
  const esRegistry = tax?.fuenteAlicuota === "Padrón";
  const address = esRegistry ? "Entrantes" : f.direccion;

  const cuit = f.cuit.replace(/\D/g, "");
  const cuitOk = /^\d{11}$/.test(cuit);
  const customer = useQuery({
    queryKey: ["clientes", "por-cuit", cuit],
    queryFn: () => searchCustomerByCuit(cuit),
    enabled: cuitOk,
    staleTime: 60_000,
  });

  const datesOk = !f.desde || !f.hasta || new Date(f.hasta) >= new Date(f.desde);
  const valid = cuitOk && !!taxId && f.motivo.trim() !== "" && datesOk;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const n = await createExemption({
        cuit,
        email: customer.data?.correo ?? null,
        impuestoId: taxId,
        direccion: address,
        tipo: f.tipo,
        motivo: f.motivo,
        desde: localAIso(f.desde),
        hasta: localAIso(f.hasta),
        codigoAutorizacion: f.codigo,
        certificado: f.certificado,
      });
      toast.success(
        n > 1 ? "Exención creada (2 altas: entrantes y salientes)." : "Exención creada.",
      );
      onCreada();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear la exención");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Nueva exención"
      description="Mientras esté vigente, el impuesto elegido se calcula en 0% para ese CUIT."
      onSubmit={save}
      submitLabel={saving ? "Creando…" : "Crear exención"}
      size="lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="ex-cuit">CUIT</Label>
          <Input
            id="ex-cuit"
            inputMode="numeric"
            value={f.cuit}
            onChange={(e) => setF({ ...f, cuit: e.target.value })}
            placeholder="Exactamente 11 dígitos"
          />
          <p className="text-[11px] mt-1">
            {!cuit ? (
              <span className="text-muted-foreground">Exactamente 11 dígitos.</span>
            ) : !cuitOk ? (
              <span className="text-red-600">Tiene que tener 11 dígitos.</span>
            ) : customer.isLoading ? (
              <span className="text-muted-foreground">Buscando cliente…</span>
            ) : customer.data ? (
              <span className="text-emerald-700">
                {customer.data.nombre} · <span className="font-mono">{customer.data.legajo}</span>
              </span>
            ) : (
              <span className="text-amber-700">
                No hay un cliente con ese CUIT (se guarda igual por CUIT).
              </span>
            )}
          </p>
        </div>
        <div>
          <Label htmlFor="ex-impuesto">Impuesto</Label>
          <select
            id="ex-impuesto"
            className={selectCls}
            value={taxId}
            onChange={(e) => setF({ ...f, impuestoId: e.target.value })}
          >
            {taxes.map((i) => (
              <option key={i.id} value={i.id}>
                {i.codigo} · {i.nombre}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">
            Cada impuesto lleva su propia exención.
          </p>
        </div>
        <div>
          <Label htmlFor="ex-direccion">Dirección</Label>
          <select
            id="ex-direccion"
            className={selectCls}
            value={address}
            disabled={esRegistry}
            onChange={(e) => setF({ ...f, direccion: e.target.value as AltaForm["direccion"] })}
          >
            <option value="Ambos">Ambos</option>
            <option value="Entrantes">Entrantes</option>
            <option value="Salientes">Salientes</option>
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">
            {esRegistry
              ? "IIBB solo se retiene en los ingresos: la exención va en Entrantes."
              : "Con Ambos se crean dos altas (entrantes y salientes), desactivables por separado."}
          </p>
        </div>
        <div>
          <Label htmlFor="ex-tipo">Tipo</Label>
          <select
            id="ex-tipo"
            className={selectCls}
            value={f.tipo}
            onChange={(e) => setF({ ...f, tipo: e.target.value as KindExemption })}
          >
            {KINDS_EXEMPTION.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ex-motivo">Motivo</Label>
          <Input
            id="ex-motivo"
            value={f.motivo}
            onChange={(e) => setF({ ...f, motivo: e.target.value })}
            placeholder="Ej: Certificado de exención AFIP — cooperativa"
          />
        </div>
        <div>
          <Label htmlFor="ex-desde">Vigencia desde</Label>
          <Input
            id="ex-desde"
            type="datetime-local"
            value={f.desde}
            onChange={(e) => setF({ ...f, desde: e.target.value })}
          />
          <p className="text-[11px] text-muted-foreground mt-1">Vacío: desde ahora.</p>
        </div>
        <div>
          <Label htmlFor="ex-hasta">Vigencia hasta</Label>
          <Input
            id="ex-hasta"
            type="datetime-local"
            value={f.hasta}
            onChange={(e) => setF({ ...f, hasta: e.target.value })}
          />
          <p className={`text-[11px] mt-1 ${datesOk ? "text-muted-foreground" : "text-red-600"}`}>
            {datesOk
              ? "Puede quedar vacío (sin vencimiento)."
              : "Tiene que ser posterior a la fecha desde."}
          </p>
        </div>
        <div>
          <Label htmlFor="ex-codigo">Código de autorización (opcional)</Label>
          <Input
            id="ex-codigo"
            value={f.codigo}
            onChange={(e) => setF({ ...f, codigo: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="ex-cert">Certificado (opcional)</Label>
          <input
            id="ex-cert"
            type="file"
            accept={CERTIFICATE_KINDS.join(",")}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-card file:px-3 file:py-1.5 file:text-sm"
            onChange={(e) => setF({ ...f, certificado: e.target.files?.[0] ?? null })}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            PDF, JPG, PNG o WEBP · hasta 10 MB.
          </p>
        </div>
      </div>
      {!valid && (
        <p className="text-xs text-muted-foreground">
          Completá CUIT de 11 dígitos, impuesto y motivo.
        </p>
      )}
    </FormDialog>
  );
}
