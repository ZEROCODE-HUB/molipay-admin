import { keepPreviousData,useQuery,useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/features/rbac/rbac.hooks";
import { useTaxesForAssignment } from "@/features/taxes/taxes.hooks";
import { useEffect,useState } from "react";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import {
QK_EXEMPTIONS,
contarOverduesActivas,
listExemptions,
listExemptionsForExport,
setStatusExemption,
situacion,
type AddressExemption,
type Exemption,
type ExemptionFilters,
type SituacionExemption,
} from "@/features/taxes/exemptions.supabase";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { type ActionItem } from "@/shared/ui/actions-dropdown";
import { Eye,Power,PowerOff } from "lucide-react";
import { type Column } from "@/shared/ui/data-table";
import { Badge } from "@/shared/ui/badge";
import { PAGE_SIZE,dateHour } from "@/features/taxes/debits-credits.rules";
import { SituacionBadge } from "./debits-credits-parts";

/** Estado y acciones de DebitsCreditsPage: el componente solo dibuja. */
export function useDebitsCreditsPage() {
  const qc = useQueryClient();
  const { can } = useCan();
  const canCreate = can("crear", "impuestos");
  const canUpdate = can("modificar", "impuestos");
  const { rows: taxes } = useTaxesForAssignment();

  const [page, setPage] = useState(0);
  const [cuitInput, setCuitInput] = useState("");
  const cuit = useDebouncedValue(cuitInput, 350);
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState<AddressExemption | "">("");
  const [status, setStatus] = useState<SituacionExemption | "">("");
  const filters: Omit<ExemptionFilters, "page" | "pageSize"> = {
    cuit: cuit || undefined,
    impuestoId: taxId || undefined,
    direccion: address || undefined,
    situacion: status || undefined,
  };
  // Cualquier cambio de filtro vuelve a la primera pagina.
  useEffect(() => setPage(0), [cuit, taxId, address, status]);

  const query = useQuery({
    queryKey: [...QK_EXEMPTIONS, "list", page, filters],
    queryFn: () => listExemptions({ page, pageSize: PAGE_SIZE, ...filters }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const overdues = useQuery({
    queryKey: [...QK_EXEMPTIONS, "vencidas-activas"],
    queryFn: contarOverduesActivas,
    staleTime: 60_000,
  });

  const [nueva, setNew] = useState(false);
  const [verify, setVerify] = useState(false);
  const [detail, setDetail] = useState<Exemption | null>(null);
  const [exporting, setExporting] = useState(false);

  const refresh = () => void qc.invalidateQueries({ queryKey: QK_EXEMPTIONS });

  const changeStatus = async (e: Exemption) => {
    try {
      await setStatusExemption(e.id, e.estado === "Activa" ? "Inactiva" : "Activa");
      toast.success(e.estado === "Activa" ? "Exención desactivada." : "Exención activada.");
      refresh();
    } catch (err) {
      toast.error(userMessage(err));
    }
  };

  const exportar = async () => {
    setExporting(true);
    try {
      const rows = await listExemptionsForExport(filters);
      const cab = [
        "Usuario",
        "Legajo",
        "CUIT",
        "Impuesto",
        "Dirección",
        "Tipo",
        "Motivo",
        "Vigencia desde",
        "Vigencia hasta",
        "Estado",
        "Alta",
        "Actualización",
      ];
      const lines = rows.map((e) =>
        [
          e.clienteNombre ?? e.email ?? "",
          e.clienteLegajo ?? "",
          e.cuit,
          e.impuestoCodigo,
          e.direccion,
          e.tipo,
          e.motivo ?? "",
          dateHour(e.desde),
          e.hasta ? dateHour(e.hasta) : "Sin fecha",
          situacion(e),
          dateHour(e.createdAt),
          dateHour(e.updatedAt),
        ]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(";"),
      );
      const blob = new Blob(["﻿" + [cab.join(";"), ...lines].join("\n")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "exenciones.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(userMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const getActions = (e: Exemption): ActionItem[] => [
    { label: "Ver", icon: Eye, onClick: () => setDetail(e) },
    {
      label: e.estado === "Activa" ? "Desactivar" : "Activar",
      icon: e.estado === "Activa" ? PowerOff : Power,
      disabled: !canUpdate,
      onClick: () => changeStatus(e),
    },
  ];

  const columns: Column<Exemption>[] = [
    {
      key: "usuario",
      label: "Usuario",
      render: (e) => (
        <div className="leading-tight">
          <div className="font-medium">{e.clienteNombre ?? e.email ?? "—"}</div>
          <div className="text-[11px] text-muted-foreground font-mono">
            {e.clienteLegajo ?? "sin cliente"}
          </div>
        </div>
      ),
    },
    {
      key: "cuit",
      label: "CUIT",
      render: (e) => <span className="font-mono tabular-nums text-xs">{e.cuit}</span>,
    },
    {
      key: "impuesto",
      label: "Impuesto",
      render: (e) => <span className="font-mono text-xs">{e.impuestoCodigo}</span>,
    },
    {
      key: "direccion",
      label: "Dirección",
      render: (e) => <Badge tone="neutral">{e.direccion}</Badge>,
    },
    {
      key: "motivo",
      label: "Motivo",
      render: (e) => <span className="text-xs line-clamp-2 max-w-[220px]">{e.motivo ?? "—"}</span>,
    },
    {
      key: "desde",
      label: "Vigencia desde",
      render: (e) => <span className="text-xs whitespace-nowrap">{dateHour(e.desde)}</span>,
    },
    {
      key: "hasta",
      label: "Vigencia hasta",
      render: (e) => <span className="text-xs whitespace-nowrap">{dateHour(e.hasta)}</span>,
    },
    { key: "estado", label: "Estado", render: (e) => <SituacionBadge e={e} /> },
    {
      key: "alta",
      label: "Alta",
      render: (e) => <span className="text-xs whitespace-nowrap">{dateHour(e.createdAt)}</span>,
    },
    {
      key: "actualizacion",
      label: "Actualización",
      render: (e) => <span className="text-xs whitespace-nowrap">{dateHour(e.updatedAt)}</span>,
    },
  ];

  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hayFilters = cuitInput || taxId || address || status;
  const nOverdues = overdues.data ?? 0;
  return {
    canCreate,
    canUpdate,
    taxes,
    page,
    setPage,
    cuitInput,
    setCuitInput,
    cuit,
    taxId,
    setTaxId,
    address,
    setAddress,
    status,
    setStatus,
    query,
    overdues,
    nueva,
    setNew,
    verify,
    setVerify,
    detail,
    setDetail,
    exporting,
    refresh,
    exportar,
    getActions,
    columns,
    rows,
    total,
    totalPages,
    hayFilters,
    nOverdues,
  };
}

export type DebitsCreditsPageVm = ReturnType<typeof useDebitsCreditsPage>;
