import { useState } from "react";
import { generateRegistryDemo } from "@/features/taxes/iibb-registry.supabase";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Download,Loader2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { NormalizationIibbDialog } from "@/features/taxes/components/iibb-normalization";
import { n } from "@/features/taxes/iibb-registry.rules";
import { download as downloadBlob } from "@/features/taxes/tax-reports.rules";
import { latin1 } from "@/features/taxes/tax-reports.rules";
import { TarjetaAction } from "./iibb-registry-parts";
import { RegistriesIibbTable } from "./iibb-registry";
import { LoadRegistryDialog } from "./load-registry-dialog";

export function RegistriesManagement({ puedeEditar: canEdit }: { puedeEditar: boolean }) {
  const [load, setLoad] = useState(false);
  const [normalize, setNormalize] = useState(false);
  const [verAll, setVerAll] = useState(false);
  const [generatingDemo, setGeneratingDemo] = useState(false);

  // Padron de prueba con los clientes cargados: se descarga y se vuelve a subir.
  const downloadDemo = async () => {
    setGeneratingDemo(true);
    try {
      const d = await generateRegistryDemo();
      if (d.incluidos === 0) {
        toast.error("Ningún cliente tiene un CUIT de 11 dígitos.");
        return;
      }
      downloadBlob(
        `padron-prueba-sircupa-${d.periodo}.txt`,
        new Blob([latin1(d.txt)], { type: "text/plain;charset=iso-8859-1" }),
      );
      toast.success(
        `Padrón de prueba ${d.periodo}: ${n(d.incluidos)} CUIT` +
          (d.sinVerificador > 0 ? ` (${n(d.sinVerificador)} sin dígito verificador válido)` : "") +
          "." +
          (d.omitidos > 0
            ? ` ${n(d.omitidos)} cliente(s) sin CUIT de 11 dígitos quedaron afuera.`
            : "") +
          " Subilo con «Cargar padrón» como archivo de prueba.",
      );
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setGeneratingDemo(false);
    }
  };

  return (
    <>
      <div className="mb-4">
        <h3 className="font-display font-semibold text-base">Gestión de padrones</h3>
        <p className="text-sm text-muted-foreground">
          Carga del padrón y normalización de lo ya cobrado
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <TarjetaAction
          titulo="Cargar padrón"
          texto="Subí el padrón SIRCUPA (.txt, hasta 100 MB) y seguí el procesamiento en tiempo real."
        >
          <div className="flex flex-wrap items-center gap-2">
            <BtnPrimary onClick={() => setLoad(true)} disabled={!canEdit}>
              Cargar padrón
            </BtnPrimary>
            <BtnOutline
              onClick={downloadDemo}
              disabled={generatingDemo}
              title="Arma un padrón SIRCUPA con los CUIT de los clientes cargados, vigente este mes, para probar la carga"
            >
              {generatingDemo ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Generando…
                </>
              ) : (
                <>
                  <Download size={14} /> TXT de prueba
                </>
              )}
            </BtnOutline>
            <Badge tone="neutral">Demo</Badge>
          </div>
        </TarjetaAction>
        <TarjetaAction
          titulo="Normalización retroactiva"
          texto="Generá un preview de los cambios retroactivos y confirmalo para aplicar la normalización sobre los registros históricos."
        >
          <BtnOutline onClick={() => setNormalize(true)} disabled={!canEdit}>
            Ver preview y aplicar
          </BtnOutline>
        </TarjetaAction>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">
          {verAll ? "Todos los padrones" : "Ejecuciones recientes"}
        </h4>
        <button
          type="button"
          className="text-xs font-semibold text-primary hover:underline"
          onClick={() => setVerAll((v) => !v)}
        >
          {verAll ? "Ver solo recientes" : "Ver todos"}
        </button>
      </div>
      {verAll ? (
        <RegistriesIibbTable puedeEditar={canEdit} />
      ) : (
        <RegistriesIibbTable
          puedeEditar={canEdit}
          limite={5}
          vacio="Todavía no cargaste padrones. Al cargar uno, su ejecución aparece acá."
        />
      )}

      {load && <LoadRegistryDialog onClose={() => setLoad(false)} />}
      {normalize && <NormalizationIibbDialog onClose={() => setNormalize(false)} />}
    </>
  );
}
