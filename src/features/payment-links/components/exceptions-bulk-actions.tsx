import { BtnOutline } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Amount } from "@/features/payment-links/components/credits-common";

import type { ExceptionsPageVm } from "./use-exceptions-page";

export function ExceptionsBulkActions({
  selection,
  mismoKind,
  open,
  setSel,
}: Pick<ExceptionsPageVm, "selection" | "mismoKind" | "open" | "setSel">) {
  return (
    <>
      {selection.length > 0 && (
        <div className="sticky bottom-3 mt-3 z-10">
          <Card className="p-3 flex flex-wrap items-center justify-between gap-2 shadow-lg">
            <div className="text-sm">
              <span className="font-semibold">{selection.length}</span> seleccionada(s) ·{" "}
              <Amount v={selection.reduce((a, r) => a + Number(r.total_neto), 0)} />
              {!mismoKind && (
                <span className="ml-2 text-xs text-red-700">
                  Solo se resuelven juntas excepciones del mismo tipo.
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {selection.every((r) => r.clase === "excepcion") ? (
                <>
                  <BtnOutline
                    disabled={!mismoKind}
                    onClick={() =>
                      open(
                        "asignar",
                        selection.map((r) => r.id),
                      )
                    }
                  >
                    Asignar comercio
                  </BtnOutline>
                  <BtnOutline
                    disabled={!mismoKind}
                    onClick={() =>
                      open(
                        "no_corresponde",
                        selection.map((r) => r.id),
                      )
                    }
                  >
                    No corresponde
                  </BtnOutline>
                </>
              ) : selection.every((r) => r.clase === "aviso") ? (
                <BtnOutline
                  onClick={() =>
                    open(
                      "aceptar",
                      selection.map((r) => r.id),
                    )
                  }
                >
                  Aceptar diferencias
                </BtnOutline>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Mezcla de excepciones y avisos: elegí un solo tipo.
                </span>
              )}
              <BtnOutline onClick={() => setSel(new Set())}>Limpiar</BtnOutline>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
