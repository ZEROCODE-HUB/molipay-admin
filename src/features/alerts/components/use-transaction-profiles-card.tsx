import { parseMoneyInput } from "@/shared/lib/money";
import { userMessage } from "@/shared/lib/errors";
import { useMemo,useState } from "react";
import { keepPreviousData,useQuery,useQueryClient } from "@tanstack/react-query";
import { Edit3,Trash2 } from "lucide-react";
import { toast } from "sonner";
import { type Column,type TableServerFilters } from "@/shared/ui/data-table";
import { type ActionItem } from "@/shared/ui/actions-dropdown";
import { LegajoCell } from "@/shared/ui/legajo-label";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import {
deleteTransactionProfile,
downloadCsv,
listAllTransactionProfiles,
listTransactionProfiles,
saveTransactionProfile,
type TransactionProfile,
} from "@/features/alerts/alert-rules.supabase";
import { formatMoney } from "@/shared/lib/format";
import { type Draft } from "@/features/alerts/transaction-profiles-card.types";
import { empty } from "@/features/alerts/transaction-profiles-card.rules";
import { Consumo } from "@/features/alerts/components/transaction-profiles-card-parts";

/** Estado y acciones de TransactionProfilesCard: el componente solo dibuja. */
export function useTransactionProfilesCard() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<TableServerFilters>({ global: "", enums: {}, dates: {} });
  const search = useDebouncedValue(filters.global.trim(), 350);

  const list = useQuery({
    queryKey: ["transaction_profiles", page, pageSize, search],
    queryFn: () => listTransactionProfiles({ page, pageSize, search: search || undefined }),
    placeholderData: keepPreviousData,
  });
  const rows = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;

  const [dialog, setDialog] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<TransactionProfile | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["transaction_profiles"] });

  const open = (p?: TransactionProfile) => {
    setDraft(
      p
        ? {
            legajo: p.legajo,
            correo: p.correo,
            monto: String(p.monthlyAmount),
            operaciones: p.monthlyOperations == null ? "" : String(p.monthlyOperations),
            notas: p.notes ?? "",
            editando: true,
          }
        : empty,
    );
    setError(null);
    setDialog(true);
  };

  const save = async () => {
    if (!draft.legajo) return setError("Seleccioná un cliente de la lista.");
    const parsedAmount = parseMoneyInput(draft.monto);
    const amount = parsedAmount ? parsedAmount.cents / 100 : NaN;
    if (draft.monto.trim() === "" || !Number.isFinite(amount) || amount < 0)
      return setError("Ingresá el volumen mensual esperado.");
    const ops = draft.operaciones.trim() === "" ? null : Number(draft.operaciones);
    if (ops !== null && (!Number.isInteger(ops) || ops < 0))
      return setError("La cantidad de operaciones debe ser un entero.");
    setSaving(true);
    setError(null);
    try {
      await saveTransactionProfile({
        legajo: draft.legajo,
        monthlyAmount: Math.round(amount * 100) / 100,
        monthlyOperations: ops,
        notes: draft.notas.trim() || null,
      });
      await refresh();
      toast.success("Perfil transaccional guardado");
      setDialog(false);
    } catch (e) {
      setError(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await deleteTransactionProfile(deleting.id);
      await refresh();
      toast.success("Perfil eliminado: el cliente deja de evaluarse por exceso de perfil");
    } catch (e) {
      toast.error(`No se pudo eliminar: ${userMessage(e)}`);
    } finally {
      setDeleting(null);
    }
  };

  const exportar = async () => {
    try {
      const all = await listAllTransactionProfiles(search || undefined);
      downloadCsv(
        `perfiles-transaccionales-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          "Legajo",
          "Usuario",
          "Nombre",
          "Actividad",
          "Volumen mensual esperado",
          "Operaciones mensuales",
          "Volumen del mes",
          "Operaciones del mes",
          "Notas",
        ],
        all.map((p) => [
          p.legajo,
          p.correo,
          p.nombre,
          p.actividad ?? "",
          p.monthlyAmount,
          p.monthlyOperations ?? "",
          p.currentMonthAmount,
          p.currentMonthOperations,
          p.notes ?? "",
        ]),
      );
    } catch (e) {
      toast.error(`No se pudo exportar: ${userMessage(e)}`);
    }
  };

  const getActions = (p: TransactionProfile): ActionItem[] => [
    { label: "Editar", icon: Edit3, onClick: () => open(p) },
    { label: "Eliminar", icon: Trash2, variant: "danger", onClick: () => setDeleting(p) },
  ];

  const columns: Column<TransactionProfile>[] = useMemo(
    () => [
      {
        key: "legajo",
        label: "Legajo",
        minWidth: 130,
        render: (r) => <LegajoCell legajo={r.legajo} />,
      },
      { key: "correo", label: "Usuario", minWidth: 180, render: (r) => r.correo },
      {
        key: "actividad",
        label: "Actividad",
        minWidth: 140,
        render: (r) => r.actividad ?? <span className="text-muted-foreground">—</span>,
      },
      {
        key: "monto",
        label: "Volumen mensual esperado",
        minWidth: 150,
        render: (r) => (
          <span className="font-mono tabular-nums">{formatMoney(r.monthlyAmount)}</span>
        ),
      },
      {
        key: "ops",
        label: "Operaciones / mes",
        minWidth: 110,
        render: (r) => <span className="font-mono tabular-nums">{r.monthlyOperations ?? "—"}</span>,
      },
      {
        key: "consumo",
        label: "Consumo del mes",
        minWidth: 160,
        render: (r) => <Consumo actual={r.currentMonthAmount} perfil={r.monthlyAmount} />,
      },
    ],
    [],
  );
  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    filters,
    setFilters,
    list,
    rows,
    total,
    dialog,
    setDialog,
    draft,
    setDraft,
    error,
    saving,
    deleting,
    setDeleting,
    open,
    save,
    remove,
    exportar,
    getActions,
    columns,
  };
}

export type TransactionProfilesCardVm = ReturnType<typeof useTransactionProfilesCard>;
