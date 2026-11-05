import { Modal } from "@/shared/ui/modal";
import { type Tax } from "@/infrastructure/supabase/legacy/types";
import { X } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Link } from "@tanstack/react-router";
import { BtnOutline } from "@/shared/ui/button";
import { Field } from "@/shared/ui/labeled-field";
import { HELP_AMBITO,HELP_SOURCE,statusTone } from "@/features/taxes/taxes.rules";
import { RatesSection } from "./rates-section";
import { RegistrySection } from "./registry-section";

// --- Detalle -------------------------------------------------------------------

export function DetailModal({
  imp,
  puedeEditar: canEdit,
  onClose,
}: {
  imp: Tax;
  puedeEditar: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} size="custom" className="max-w-4xl">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display text-lg font-semibold">
              Detalle del impuesto: {imp.nombre}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">{imp.codigo}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Código" value={<span className="font-mono">{imp.codigo}</span>} />
            <Field label="Nombre" value={imp.nombre} />
            <Field
              label="Estado"
              value={<Badge tone={statusTone(imp.estado)}>{imp.estado}</Badge>}
            />
            <Field
              label="Ámbito"
              value={
                <span className="flex flex-col">
                  <Badge tone={imp.ambito === "Interno" ? "success" : "neutral"}>
                    {imp.ambito}
                  </Badge>
                  <span className="text-[11px] font-normal text-muted-foreground mt-1">
                    {HELP_AMBITO[imp.ambito]}
                  </span>
                </span>
              }
            />
            <Field
              label="Fuente de la alícuota"
              value={
                <span className="flex flex-col">
                  <span>{imp.fuenteAlicuota}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {HELP_SOURCE[imp.fuenteAlicuota]}
                  </span>
                </span>
              }
            />
            <Field label="Descripción" value={imp.descripcion ?? "—"} />
            <Field
              label="Creado"
              value={
                <span className="font-mono tabular-nums text-sm">
                  {new Date(imp.createdAt).toLocaleString("es-AR")}
                </span>
              }
            />
            <Field
              label="Actualizado"
              value={
                <span className="font-mono tabular-nums text-sm">
                  {new Date(imp.updatedAt).toLocaleString("es-AR")}
                </span>
              }
            />
          </div>

          <div className="border-t border-border pt-5">
            {imp.fuenteAlicuota === "Fija" && <RatesSection impuesto={imp} puedeEditar={canEdit} />}
            {imp.fuenteAlicuota === "Padrón" && (
              <RegistrySection impuesto={imp} puedeEditar={canEdit} />
            )}
            {imp.fuenteAlicuota === "Manual" && (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                La alícuota se define por cliente.{" "}
                <Link
                  to="/admin/comercios/impuestos/usuarios"
                  className="font-semibold text-primary hover:underline"
                >
                  Ver asignaciones
                </Link>
              </div>
            )}
          </div>
        </div>
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-end">
          <BtnOutline type="button" onClick={onClose}>
            Cerrar
          </BtnOutline>
        </div>
      </div>
    </Modal>
  );
}
