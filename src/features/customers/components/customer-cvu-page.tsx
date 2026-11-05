import { useCustomerCvuPage } from "@/features/customers/components/use-customer-cvu-page";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { BtnPrimary } from "@/shared/ui/button";
import { Plus } from "lucide-react";
import { CvuTable } from "@/features/customers/components/cvu-table";
import { FormDialog } from "@/shared/ui/form-dialog";
import { LegajoCell } from "@/shared/ui/legajo-label";
import { Input,Label } from "@/shared/ui/form-controls";
import { NewCvuDialog } from "@/features/customers/components/new-cvu-dialog";

export function CustomerCvuPage() {
  const vm = useCustomerCvuPage();
  const {
    setShowNew,
    viewing,
    setViewing,
    editTarget,
    setEditTarget,
    editAlias,
    setEditAlias,
    canCreate,
    saveEdicion,
  } = vm;

  return (
    <PermissionGuard recurso="usuarios">
      <PageHeader
        title="Usuarios con CVU"
        description="Cuentas Virtuales creadas — búsqueda rápida por email, refleja en detalle Subcuentas y CVUs recientes."
        action={
          <BtnPrimary onClick={() => setShowNew(true)} disabled={!canCreate}>
            <Plus size={16} /> Nuevo CVU
          </BtnPrimary>
        }
      />

      <CvuTable {...vm} />

      {viewing && (
        <FormDialog
          open={!!viewing}
          onClose={() => setViewing(null)}
          title="Detalle de CVU"
          description={`CVU de ${viewing.nombre} ${viewing.apellido}`}
          onSubmit={() => setViewing(null)}
          submitLabel="Cerrar"
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Legajo:</span>{" "}
              <LegajoCell legajo={viewing.legajo} />
            </div>
            <div>
              <span className="text-muted-foreground">Correo:</span>{" "}
              <span className="font-medium">{viewing.cliente?.correo ?? viewing.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Nombre:</span>{" "}
              <span className="font-medium">{viewing.nombre}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Apellido:</span>{" "}
              <span className="font-medium">{viewing.apellido}</span>
            </div>
            <div>
              <span className="text-muted-foreground">CVU:</span>{" "}
              <span className="font-mono font-medium">{viewing.cbu ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Alias:</span>{" "}
              <span className="font-medium">{viewing.cbu ? viewing.cbu.slice(-6) : "—"}</span>
            </div>
          </div>
        </FormDialog>
      )}

      {editTarget && (
        <FormDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          title="Editar CVU"
          description={`Editando CVU de ${editTarget.nombre}`}
          onSubmit={saveEdicion}
          submitLabel="Guardar"
        >
          <div>
            <Label>Alias (derivado del CVU)</Label>
            <Input value={editAlias} onChange={(e) => setEditAlias(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            El CVU es inmutable; alias es informativo.
          </p>
        </FormDialog>
      )}

      <NewCvuDialog {...vm} />
    </PermissionGuard>
  );
}
