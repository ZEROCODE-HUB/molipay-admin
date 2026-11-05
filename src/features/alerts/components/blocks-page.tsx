import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { BtnPrimary } from "@/shared/ui/button";
import { BlocksTable } from "@/features/alerts/components/blocks-table";
import { BLOCKS_QUERY_KEY } from "@/features/alerts/blocks-table.rules";
import { NewBlockDialog } from "@/features/alerts/components/new-block-dialog";

export function BlocksPage() {
  const queryClient = useQueryClient();
  const [nuevo, setNew] = useState(false);

  return (
    <>
      <PageHeader
        title="Listado de bloqueos"
        description="Bloqueos preventivos vigentes e históricos. Un bloqueo activo impide los egresos de la cuenta o subcuenta y retiene los depósitos entrantes."
        action={
          <BtnPrimary onClick={() => setNew(true)}>
            <Plus size={14} /> Nuevo bloqueo manual
          </BtnPrimary>
        }
      />

      <BlocksTable />

      {nuevo && (
        <NewBlockDialog
          onClose={() => setNew(false)}
          onDone={() => void queryClient.invalidateQueries({ queryKey: BLOCKS_QUERY_KEY })}
        />
      )}
    </>
  );
}
