import { FilingsFilters } from "./filings-filters";
import { useFilingsTab } from "./use-filings-tab";
import { BCRA_FILES,type BcraFiling } from "@/features/regulatory-reports/bcra.supabase";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { AlertTriangle,FileArchive,Wand2 } from "lucide-react";
import { DataTable } from "@/shared/ui/data-table";
import { Card } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { errMsg } from "@/features/regulatory-reports/bcra-reports.rules";
import { MarkFiledDialog } from "./bcra-reports-parts";
import { VistaPreviaModal } from "./vista-previa-modal";
import { PackageModal } from "./package-modal";
import { CorregirDialog } from "./corregir-dialog";

/* ============================================================================
 * Presentaciones por período
 * ========================================================================== */

export function FilingsTab() {
  const vm = useFilingsTab();
  const {
    presQ,
    search,
    busy,
    ver,
    setVer,
    corregir,
    setCorregir,
    presentar,
    setPresentar,
    rectificar,
    setRectificar,
    zipPeriod,
    setZipPeriod,
    refresh,
    generate,
    generateFaltantes,
    download,
    cuit,
    pedirPackage,
    bajarPackage,
    rows,
    columns,
  } = vm;

  return (
    <div className="space-y-5">
      <FilingsFilters {...vm} />

      {presQ.isError ? (
        <Card className="p-5 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} /> {errMsg(presQ.error)} (¿se aplicó la migración
          20261028110000_bcra_reportes?)
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          keyExtractor={(r) => r.periodo}
          pageSize={12}
          showDownloadButton={false}
          actions={(r) => {
            const completos = BCRA_FILES.every((a) => search(r.periodo, a));
            const faltan = BCRA_FILES.filter((a) => !search(r.periodo, a)).length;
            return (
              <ActionsDropdown
                actions={[
                  {
                    label: "Descargar paquete ZIP",
                    icon: FileArchive,
                    disabled: !completos || busy !== null,
                    onClick: () => pedirPackage(r.periodo),
                  },
                  {
                    label: `Generar faltantes (${faltan})`,
                    icon: Wand2,
                    disabled: faltan === 0 || busy !== null,
                    onClick: () => void generateFaltantes(r.periodo),
                  },
                ]}
              />
            );
          }}
        />
      )}

      <p className="text-[11px] text-muted-foreground">
        Com. "A" 8207 (BCRA) · SISCEN. Cada archivo se calcula desde el ledger y queda guardado como
        foto: la vista previa muestra exactamente lo que se descarga.
      </p>

      {ver && (
        <VistaPreviaModal
          p={ver}
          onClose={() => setVer(null)}
          onDescargar={() => void download(ver)}
        />
      )}
      {zipPeriod && (
        <PackageModal
          periodo={zipPeriod}
          cuit={cuit}
          presentaciones={BCRA_FILES.map((a) => search(zipPeriod, a)).filter(
            (x): x is BcraFiling => !!x,
          )}
          onClose={() => setZipPeriod(null)}
          onConfirm={() => bajarPackage(zipPeriod)}
        />
      )}
      {corregir && (
        <CorregirDialog p={corregir} onClose={() => setCorregir(null)} onDone={refresh} />
      )}
      {presentar && (
        <MarkFiledDialog p={presentar} onClose={() => setPresentar(null)} onDone={refresh} />
      )}
      <ConfirmDialog
        open={rectificar !== null}
        onClose={() => setRectificar(null)}
        title={rectificar?.estado === "presentado" ? "Generar rectificativa" : "Regenerar archivo"}
        message={
          rectificar?.estado === "presentado"
            ? `La versión ${rectificar.version} ya fue presentada y queda guardada sin cambios. Se va a crear la versión ${rectificar.version + 1} (rectificativa) recalculada desde la base.`
            : `Se recalcula desde la base y se descartan las ${rectificar?.correcciones ?? 0} corrección(es) manual(es) aplicadas (quedan en el historial).`
        }
        confirmLabel="Regenerar"
        onConfirm={async () => {
          if (rectificar) await generate(rectificar.periodo, rectificar.archivo);
          setRectificar(null);
        }}
      />
    </div>
  );
}
