import { useState, useMemo, type ReactNode } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "./portal-shell";

export type UserStatus = "active" | "inactive" | "pending" | "blocked";

export type UserDocument = {
  id: string;
  tipo: string;
  url: string;
  label: string;
};

export type Subcuenta = {
  id: string;
  alias: string;
  cvu: string;
  saldo: string;
  estado: string;
};

export type UserData = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  dni: string;
  status: UserStatus;
  fechaNacimiento?: string;
  direccion?: string;
  cuil?: string;
  nacionalidad?: string;
  subcuentas: Subcuenta[];
  documentos: UserDocument[];
  [key: string]: unknown;
};

const statusLabel: Record<UserStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  pending: "Pendiente",
  blocked: "Bloqueado",
};

const statusTone: Record<UserStatus, "success" | "neutral" | "warn" | "danger"> = {
  active: "success",
  inactive: "neutral",
  pending: "warn",
  blocked: "danger",
};

export function UserModal({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: UserData | null;
}) {
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [subPage, setSubPage] = useState(1);
  const subPageSize = 5;

  if (!open || !user) return null;

  const totalSubPages = Math.max(1, Math.ceil(user.subcuentas.length / subPageSize));
  const safeSubPage = Math.min(subPage, totalSubPages);
  const paginatedSubs = user.subcuentas.slice(
    (safeSubPage - 1) * subPageSize,
    safeSubPage * subPageSize
  );

  const identityFields: { label: string; value: string }[] = [
    { label: "Nombre completo", value: user.nombre },
    { label: "Email", value: user.email },
    { label: "Teléfono", value: user.telefono },
  ];

  const detailFields: { label: string; value: string }[] = [
    { label: "DNI", value: user.dni },
    { label: "CUIL", value: user.cuil ?? "-" },
    { label: "Fecha de nacimiento", value: user.fechaNacimiento ?? "-" },
    { label: "Nacionalidad", value: user.nacionalidad ?? "-" },
    { label: "Dirección", value: user.direccion ?? "-" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-card rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between z-10 rounded-t-lg">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">Usuario</h3>
            <Badge tone={statusTone[user.status]}>{statusLabel[user.status]}</Badge>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Identity Card */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ficha de identidad</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {identityFields.map((f) => (
                <div key={f.label}>
                  <div className="text-xs text-muted-foreground">{f.label}</div>
                  <div className="text-sm font-semibold mt-0.5">{f.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Full Data */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Datos completos</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              {detailFields.map((f) => (
                <div key={f.label} className="flex justify-between border-b border-border pb-2">
                  <span className="text-sm text-muted-foreground">{f.label}</span>
                  <span className="text-sm font-medium">{f.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subcuentas y CVU */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Subcuentas y CVU
            </div>
            {user.subcuentas.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                Sin subcuentas
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-3 py-2 text-left font-semibold text-xs">Alias</th>
                      <th className="px-3 py-2 text-left font-semibold text-xs">CVU</th>
                      <th className="px-3 py-2 text-right font-semibold text-xs">Saldo</th>
                      <th className="px-3 py-2 text-center font-semibold text-xs">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSubs.map((sub) => (
                      <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{sub.alias}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs font-mono">{sub.cvu}</td>
                        <td className="px-3 py-2 text-right">{sub.saldo}</td>
                        <td className="px-3 py-2 text-center">
                          <Badge tone={sub.estado === "activa" ? "success" : "neutral"}>
                            {sub.estado}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalSubPages > 1 && (
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-t text-xs text-muted-foreground">
                    <span>
                      {user.subcuentas.length} subcuentas
                    </span>
                    <div className="flex items-center gap-2">
                      <span>
                        Pág. {safeSubPage} de {totalSubPages}
                      </span>
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-muted disabled:opacity-30"
                          disabled={safeSubPage <= 1}
                          onClick={() => setSubPage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-muted disabled:opacity-30"
                          disabled={safeSubPage >= totalSubPages}
                          onClick={() => setSubPage((p) => Math.min(totalSubPages, p + 1))}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Documentos */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Documentos del usuario
            </div>
            {user.documentos.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                Sin documentos
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {user.documentos.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setPreviewImg(doc.url)}
                    className="group relative aspect-[3/4] rounded-lg border border-border overflow-hidden bg-muted hover:ring-2 hover:ring-ring transition"
                  >
                    <img
                      src={doc.url}
                      alt={doc.label}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <span className="text-[10px] text-white font-medium">{doc.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Preview */}
      {previewImg && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh]">
            <img
              src={previewImg}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImg(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-card rounded-full shadow-lg border hover:bg-muted"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
