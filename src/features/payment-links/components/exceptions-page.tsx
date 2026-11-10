import { useExceptionsPage } from "@/features/payment-links/components/use-exceptions-page";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { Link } from "@tanstack/react-router";
import { Card } from "@/shared/ui/card";
import { Amount } from "@/features/payment-links/components/credits-common";
import { KIND_EXCEPCION_LABEL, QK_ACRED } from "@/features/payment-links/credits.supabase";
import { ExceptionsList } from "@/features/payment-links/components/exceptions-list";
import { ExceptionsBulkActions } from "@/features/payment-links/components/exceptions-bulk-actions";
import { ResolverDialog } from "./resolver-dialog";

export function ExceptionsPage() {
  const vm = useExceptionsPage();
  const { qc, setSel, dialog, setDialog, abiertas, summaryByKind } = vm;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Excepciones de importación"
        description="Renglones del archivo de Payway que no se pudieron asignar a un comercio o que no cuadran con las ventas. No se acredita nada a ciegas."
        action={
          <Link
            to="/admin/comercios/link-pago/liquidaciones"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Cargar liquidaciones
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Excepciones abiertas
          </div>
          <div className="text-lg font-semibold mt-1">{abiertas.length}</div>
          <div className="text-[11px] text-muted-foreground">
            <Amount v={abiertas.reduce((a, r) => a + Number(r.total_neto), 0)} /> sin asignar
          </div>
        </Card>
        {summaryByKind.map(([t, g]) => (
          <Card key={t} className="p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {KIND_EXCEPCION_LABEL[t] ?? t}
            </div>
            <div className="text-lg font-semibold mt-1">{g.n}</div>
            <div className="text-[11px] text-muted-foreground">
              <Amount v={g.neto} />
            </div>
          </Card>
        ))}
      </div>

      <ExceptionsList {...vm} />

      <ExceptionsBulkActions {...vm} />

      <ResolverDialog
        dialogo={dialog}
        onClose={() => setDialog(null)}
        onHecho={() => {
          setDialog(null);
          setSel(new Set());
          qc.invalidateQueries({ queryKey: QK_ACRED });
        }}
      />
    </PermissionGuard>
  );
}
