import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BtnPrimary } from "@/components/portal-shell";
import { BlocksTable, BLOCKS_QUERY_KEY, NuevoBloqueoDialog } from "@/components/alertas/blocks-table";

export const Route = createFileRoute("/admin/general/alertas/bloqueos")({
  head: () => ({ meta: [{ title: "Listado de bloqueos — Admin Panel" }] }),
  component: Page,
});

function Page() {
  const queryClient = useQueryClient();
  const [nuevo, setNuevo] = useState(false);

  return (
    <>
      <PageHeader
        title="Listado de bloqueos"
        description="Bloqueos preventivos vigentes e históricos. Un bloqueo activo impide los egresos de la cuenta o subcuenta y retiene los depósitos entrantes."
        action={
          <BtnPrimary onClick={() => setNuevo(true)}>
            <Plus size={14} /> Nuevo bloqueo manual
          </BtnPrimary>
        }
      />

      <BlocksTable />

      {nuevo && (
        <NuevoBloqueoDialog onClose={() => setNuevo(false)} onDone={() => void queryClient.invalidateQueries({ queryKey: BLOCKS_QUERY_KEY })} />
      )}
    </>
  );
}
