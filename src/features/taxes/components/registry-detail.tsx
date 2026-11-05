import { type RegistryIibb } from "@/features/taxes/iibb-registry.supabase";
import { type ReactNode } from "react";
import { TaxModal } from "./tax-modal";
import { SummaryRegistry } from "./summary-registry";

// ---------------------------------------------------------------------------
// Detalle de un padron: resumen y contribuyentes
// ---------------------------------------------------------------------------

export function RegistryDetail({
  p,
  onClose,
  acciones: actions,
}: {
  p: RegistryIibb;
  onClose: () => void;
  acciones?: ReactNode;
}) {
  return (
    <TaxModal
      title={p.nombre}
      subtitle={`${p.organismo ?? "—"} · ${p.archivo} · ${p.estado}`}
      onClose={onClose}
      footer={actions}
    >
      <div className="space-y-5">
        {p.estado === "Error" && p.errorMensaje && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {p.errorMensaje}
          </p>
        )}
        <SummaryRegistry p={p} />
      </div>
    </TaxModal>
  );
}
