import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { pageRegistryEntries } from "@/features/taxes/iibb-registry.supabase";
import { pct } from "@/features/taxes/iibb-registry.rules";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { userMessage } from "@/shared/lib/errors";
import { Input } from "@/shared/ui/form-controls";
import { Pagination } from "@/shared/ui/pagination";

const PAGE_SIZE = 20;
const COLUMNS = 5;

/** Contribuyentes de un padron, uno por fila, con su alicuota y letra. */
export function RegistryEntriesTable({ registryId }: { registryId: string }) {
  const [text, setText] = useState("");
  const [page, setPage] = useState(0);
  const search = useDebouncedValue(text, 350);
  const entries = useQuery({
    queryKey: ["taxpayer_registry_entries", registryId, search, page],
    queryFn: () => pageRegistryEntries(registryId, search, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
  const rows = entries.data?.rows ?? [];
  const total = entries.data?.total ?? 0;
  const message = entries.isError
    ? userMessage(entries.error)
    : entries.isLoading
      ? "Cargando contribuyentes…"
      : rows.length === 0
        ? "Sin coincidencias en este padrón (un CUIT ausente tributa 0%)."
        : null;

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Contribuyentes del padrón
      </h4>
      <div className="relative mb-3">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          className="pl-8"
          aria-label="Buscar contribuyente"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPage(0);
          }}
          placeholder="Buscar por CUIT o razón social"
        />
      </div>
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 border-b text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">CUIT</th>
              <th className="px-3 py-2 font-medium">Razón social</th>
              <th className="px-3 py-2 font-medium">Jurisdicción</th>
              <th className="px-3 py-2 font-medium">CRC</th>
              <th className="px-3 py-2 font-medium text-right">Alícuota</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {message && (
              <tr>
                <td colSpan={COLUMNS} className="px-3 py-4 text-center text-muted-foreground">
                  {message}
                </td>
              </tr>
            )}
            {rows.map((f) => (
              <tr key={f.cuit}>
                <td className="px-3 py-1.5 font-mono">{f.cuit}</td>
                <td className="px-3 py-1.5">{f.razonSocial || "—"}</td>
                <td className="px-3 py-1.5 font-mono">{f.jurisdiccion ?? "—"}</td>
                <td className="px-3 py-1.5 font-mono">{f.crc ?? "—"}</td>
                <td className="px-3 py-1.5 text-right font-mono font-semibold whitespace-nowrap">
                  {pct(f.alicuotaRetencion)}
                  {f.letra && ` (${f.letra})`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > PAGE_SIZE && (
        <Pagination
          variant="compact"
          page={page + 1}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          total={total}
          countLabel="contribuyente(s)"
          onPageChange={(p) => setPage(p - 1)}
        />
      )}
    </div>
  );
}
