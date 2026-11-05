import { createContext,useCallback,useContext,useRef,useState,type ReactNode } from "react";
import { ConfirmDialog,type ConfirmOptions } from "./confirm-dialog";

/**
 * Confirmaciones con el dialogo de la app en lugar de window.confirm():
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "¿Eliminar?", message: "...", variant: "danger" }))) return;
 *
 * ConfirmProvider se monta una sola vez en la raiz.
 */

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  const confirm = useCallback<ConfirmFn>((next) => {
    // Si habia una confirmacion pendiente, se cancela.
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={options !== null}
        title={options?.title ?? ""}
        message={options?.message ?? ""}
        confirmLabel={options?.confirmLabel}
        cancelLabel={options?.cancelLabel}
        variant={options?.variant}
        onConfirm={() => settle(true)}
        onClose={() => settle(false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
  return confirm;
}
