import { Select } from "@/shared/ui/form-controls";
import { useSettlementsPage } from "@/features/payment-links/components/use-settlements-page";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { Link } from "@tanstack/react-router";
import { Card } from "@/shared/ui/card";
import { FileDropzone } from "@/shared/ui/file-dropzone";
import { BtnOutline, BtnPrimary } from "@/shared/ui/button";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { SettlementImportPreview } from "@/features/payment-links/components/settlement-import-preview";
import { Amount } from "@/features/payment-links/components/credits-common";
import { SettlementImportHistory } from "@/features/payment-links/components/settlement-import-history";
import { Dato, Steps } from "./settlements-parts";

export function SettlementsPage() {
  const vm = useSettlementsPage();
  const { puede, step, file, setFile, loading, result, reiniciar, validate } = vm;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Carga de liquidaciones"
        description="Importá el archivo diario de Payway. Cada renglón con importe crea un lote de acreditación Pendiente; lo que no se puede asignar va a Excepciones."
        action={
          <Link
            to="/admin/comercios/link-pago/excepciones"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Ver excepciones
          </Link>
        }
      />

      <Steps paso={step} />

      {step === 1 && (
        <Card className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Adquirente de origen</label>
              <Select defaultValue="payway">
                <option value="payway">Payway / Decidir</option>
                <option value="qr" disabled>
                  Proveedor QR (no habilitado)
                </option>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Define contra qué recaudadora se concilia y qué tabla de establecimientos se usa.
                Hoy solo Payway.
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block">
                Archivo (CSV separado por punto y coma)
              </label>
              <FileDropzone onFile={setFile} accept=".csv,.txt,text/csv,text/plain" />
            </div>
          </div>
          <div className="flex justify-end">
            <BtnPrimary onClick={() => void validate()} disabled={!file || loading || !puede}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}{" "}
              Validar archivo
            </BtnPrimary>
          </div>
        </Card>
      )}

      <SettlementImportPreview {...vm} />

      {step === 4 && result && (
        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold">
            <CheckCircle2 size={18} />
            {result.estado === "importada" ? "Importada" : "Importada con excepciones"}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Dato label="Lotes creados (Pendiente)" v={result.lotes_creados} />
            <Dato
              label="Excepciones"
              v={result.excepciones}
              tone={result.excepciones > 0 ? "warn" : undefined}
            />
            <Dato label="Renglones en cero" v={result.en_cero} />
            <Dato label="Neto del archivo" v={<Amount v={result.totales?.neto} strong />} />
          </div>
          <p className="text-xs text-muted-foreground">
            Siguiente paso: conciliar lo que ingresó a la recaudadora por fecha y bandera. Sin
            conciliar no se puede acreditar.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/comercios/link-pago/acreditaciones"
              className="inline-flex items-center h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
            >
              Conciliar y acreditar
            </Link>
            <Link
              to="/admin/comercios/link-pago/lotes"
              search={{ importacion: result.importacion_id }}
              className="inline-flex items-center h-10 px-4 rounded-lg border text-sm font-semibold"
            >
              Ver lotes de esta importación
            </Link>
            {result.excepciones > 0 && (
              <Link
                to="/admin/comercios/link-pago/excepciones"
                className="inline-flex items-center h-10 px-4 rounded-lg border text-sm font-semibold"
              >
                Resolver excepciones
              </Link>
            )}
            <BtnOutline onClick={reiniciar}>Cargar otro archivo</BtnOutline>
          </div>
        </Card>
      )}

      <SettlementImportHistory {...vm} />
    </PermissionGuard>
  );
}
