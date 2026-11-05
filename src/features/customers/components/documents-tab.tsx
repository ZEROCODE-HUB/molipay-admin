import { useQuery } from "@tanstack/react-query";
import { listDocuments } from "@/features/customers/documents.supabase";
import { useDocumentsUrls } from "@/features/customers/document-url.hooks";
import { imagenesForLegajo } from "@/features/merchants/assigned-images.data";
import { CustomerSection } from "./customer-section";
import { DocumentCard } from "./document-card";

export function DocumentsTab({ legajo }: { legajo: string }) {
  const query = useQuery({
    queryKey: ["documentos", legajo],
    queryFn: () => listDocuments(legajo),
    enabled: !!legajo,
  });

  const documents = query.data ?? [];
  const { urls, thumbs } = useDocumentsUrls(documents, legajo);
  const imagenesDemo = imagenesForLegajo(legajo);
  const showDemo = documents.length === 0 && imagenesDemo.length > 0;
  const hayContent = documents.length > 0 || imagenesDemo.length > 0;

  return (
    <CustomerSection
      titulo="Documentos"
      loading={query.isLoading}
      error={query.isError ? query.error : null}
      onRetry={() => query.refetch()}
      vacio={!query.isLoading && !hayContent}
    >
      {documents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              legajo={legajo}
              resolvedUrl={urls[doc.id] ?? null}
              thumbUrl={thumbs[doc.id] ?? null}
            />
          ))}
        </div>
      ) : showDemo ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {imagenesDemo.map((img) => (
            <div
              key={img.url}
              className="overflow-hidden rounded-xl border border-border bg-card p-0"
            >
              <div className="h-32 w-full bg-muted">
                <img src={img.url} alt={img.label} className="h-full w-full object-cover" />
              </div>
              <p className="px-4 py-2 text-sm font-semibold">{img.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Fotos no agregadas
        </div>
      )}
    </CustomerSection>
  );
}
