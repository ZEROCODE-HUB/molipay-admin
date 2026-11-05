import { useQuery } from "@tanstack/react-query";
import { listCustomerApiUsers } from "@/features/customers/customer-detail.supabase";
import { userMessage } from "@/shared/lib/errors";
import { Eye,Inbox } from "lucide-react";
import { Badge } from "@/shared/ui/badge";

export function ApiUsersInline({
  legajo,
  onVerDetalle: onVerDetail,
}: {
  legajo: string;
  onVerDetalle: (id: string) => void;
}) {
  const query = useQuery({
    queryKey: ["cliente_api_usuarios", legajo],
    queryFn: () => listCustomerApiUsers(legajo),
    enabled: !!legajo,
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando usuarios API…</p>;
  }
  if (query.isError) {
    return <p className="text-sm text-red-600">{userMessage(query.error)}</p>;
  }
  const rows = query.data ?? [];
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-8 text-sm text-muted-foreground">
        <Inbox size={22} />
        <p>Sin usuarios API asociados a este cliente.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Código</th>
            <th className="px-4 py-3 font-medium">Usuario</th>
            <th className="px-4 py-3 font-medium">Nombre</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3 font-mono text-xs">{u.codigoUsuarioApi}</td>
              <td className="px-4 py-3">{u.usuario}</td>
              <td className="px-4 py-3">{u.nombreCompleto}</td>
              <td className="px-4 py-3">
                <Badge
                  tone={
                    u.estado === "Producción"
                      ? "success"
                      : u.estado === "Homologación"
                        ? "warn"
                        : "neutral"
                  }
                >
                  {u.estado}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onVerDetail(u.id)}
                  className="inline-flex items-center gap-1 h-8 rounded-md border border-input px-2 text-xs font-medium text-foreground hover:bg-accent"
                >
                  <Eye size={13} /> Ver detalle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
