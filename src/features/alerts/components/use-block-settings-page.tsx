import { keepPreviousData,useQuery,useQueryClient } from "@tanstack/react-query";
import {
deleteClientBlockParameter,
downloadCsv,
listAlertRules,
listAllClientBlockParameters,
listClientBlockParameters,
saveAlertRules,
saveClientBlockParameter,
type ClientBlockParameter,
} from "@/features/alerts/alert-rules.supabase";
import { useEffect,useMemo,useState } from "react";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { type Column,type TableServerFilters } from "@/shared/ui/data-table";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { type ActionItem } from "@/shared/ui/actions-dropdown";
import { Edit3,Eye,Trash2 } from "lucide-react";
import { LegajoCell } from "@/shared/ui/legajo-label";
import { RULE_GLOBAL,empty,fmtUmbral,readUmbral } from "@/features/alerts/block-settings.rules";
import { type Draft } from "@/features/alerts/block-settings.types";

/** Estado y acciones de BlockSettingsPage: el componente solo dibuja. */
export function useBlockSettingsPage() {
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------- generales
  const rules = useQuery({ queryKey: ["alert_rules"], queryFn: listAlertRules });
  const rule = rules.data?.find((r) => r.code === RULE_GLOBAL);
  const generales = {
    persona:
      typeof rule?.parameters.individual_min_wages === "number"
        ? (rule.parameters.individual_min_wages as number)
        : null,
    empresa:
      typeof rule?.parameters.company_min_wages === "number"
        ? (rule.parameters.company_min_wages as number)
        : null,
  };
  const [params, setParams] = useState({ persona: "", empresa: "" });
  const [errGen, setErrGen] = useState<{ persona?: string; empresa?: string }>({});
  const [savingGen, setSavingGen] = useState(false);

  useEffect(() => {
    if (rule)
      setParams({
        persona: String(generales.persona ?? ""),
        empresa: String(generales.empresa ?? ""),
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rule?.updatedAt]);

  const genWithoutChanges =
    params.persona === String(generales.persona ?? "") &&
    params.empresa === String(generales.empresa ?? "");

  const saveGenerales = async () => {
    if (!rule) return;
    const p = readUmbral(params.persona);
    const e = readUmbral(params.empresa);
    const errs = {
      persona: !p.ok ? p.error : p.value == null ? "Obligatorio" : undefined,
      empresa: !e.ok ? e.error : e.value == null ? "Obligatorio" : undefined,
    };
    setErrGen(errs);
    if (errs.persona || errs.empresa || !p.ok || !e.ok) return;
    setSavingGen(true);
    try {
      await saveAlertRules([
        {
          code: RULE_GLOBAL,
          isEnabled: rule.isEnabled,
          parameters: {
            ...rule.parameters,
            individual_min_wages: p.value,
            company_min_wages: e.value,
          },
        },
      ]);
      await queryClient.invalidateQueries({ queryKey: ["alert_rules"] });
      toast.success("Parámetros generales de bloqueos guardados");
    } catch (err) {
      toast.error(`No se pudo guardar: ${userMessage(err)}`);
    } finally {
      setSavingGen(false);
    }
  };

  // -------------------------------------------------------------- por cliente
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<TableServerFilters>({ global: "", enums: {}, dates: {} });
  const search = useDebouncedValue(filters.global.trim(), 350);

  const list = useQuery({
    queryKey: ["client_block_parameters", page, pageSize, search],
    queryFn: () => listClientBlockParameters({ page, pageSize, search: search || undefined }),
    placeholderData: keepPreviousData,
  });
  const rows = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;

  const [dialog, setDialog] = useState<"nuevo" | "editar" | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [errDraft, setErrDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [viendo, setViendo] = useState<ClientBlockParameter | null>(null);
  const [deleting, setDeleting] = useState<ClientBlockParameter | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["client_block_parameters"] });

  const openNew = () => {
    setDraft(empty);
    setErrDraft(null);
    setDialog("nuevo");
  };
  const openEdit = (r: ClientBlockParameter) => {
    setDraft({
      id: r.id,
      legajo: r.legajo,
      correo: r.correo,
      persona: r.individualMinWages == null ? "" : String(r.individualMinWages),
      empresa: r.companyMinWages == null ? "" : String(r.companyMinWages),
    });
    setErrDraft(null);
    setDialog("editar");
  };

  const saveDraft = async () => {
    if (!draft.legajo) {
      setErrDraft("Seleccioná un cliente de la lista.");
      return;
    }
    const p = readUmbral(draft.persona);
    const e = readUmbral(draft.empresa);
    if (!p.ok || !e.ok) {
      setErrDraft(`Salarios mínimos: ${!p.ok ? p.error : !e.ok ? e.error : ""}`);
      return;
    }
    if (p.value == null && e.value == null) {
      setErrDraft("Completá al menos uno de los dos umbrales.");
      return;
    }
    setSaving(true);
    setErrDraft(null);
    try {
      await saveClientBlockParameter({
        id: draft.id,
        legajo: draft.legajo,
        individualMinWages: p.value,
        companyMinWages: e.value,
      });
      await refresh();
      toast.success(
        dialog === "nuevo"
          ? "Parámetros del cliente agregados"
          : "Parámetros del cliente actualizados",
      );
      setDialog(null);
    } catch (err) {
      setErrDraft(userMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await deleteClientBlockParameter(deleting.id);
      await refresh();
      toast.success(
        "Configuración individual eliminada: el cliente vuelve a usar los valores generales",
      );
    } catch (err) {
      toast.error(`No se pudo eliminar: ${userMessage(err)}`);
    } finally {
      setDeleting(null);
    }
  };

  const exportar = async () => {
    try {
      const all = await listAllClientBlockParameters(search || undefined);
      downloadCsv(
        `parametros-bloqueos-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          "Legajo",
          "Usuario (correo)",
          "Nombre",
          "Salarios mínimos por persona",
          "Salarios mínimos por empresa",
        ],
        all.map((r) => [
          r.legajo,
          r.correo,
          r.nombre,
          r.individualMinWages ?? "General",
          r.companyMinWages ?? "General",
        ]),
      );
    } catch (err) {
      toast.error(`No se pudo exportar: ${userMessage(err)}`);
    }
  };

  const getActions = (r: ClientBlockParameter): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setViendo(r) },
    { label: "Editar", icon: Edit3, onClick: () => openEdit(r) },
    { label: "Eliminar", icon: Trash2, variant: "danger", onClick: () => setDeleting(r) },
  ];

  const columns: Column<ClientBlockParameter>[] = useMemo(
    () => [
      {
        key: "legajo",
        label: "Legajo",
        filterable: true,
        render: (r) => <LegajoCell legajo={r.legajo} />,
      },
      { key: "correo", label: "Usuario (correo)", filterable: true, render: (r) => r.correo },
      {
        key: "persona",
        label: "Cantidad de salarios mínimos depositados por persona",
        render: (r) => (
          <span
            className={`font-mono tabular-nums ${r.individualMinWages == null ? "text-muted-foreground" : ""}`}
          >
            {fmtUmbral(r.individualMinWages)}
          </span>
        ),
      },
      {
        key: "empresa",
        label: "Cantidad de salarios mínimos depositados por empresa",
        render: (r) => (
          <span
            className={`font-mono tabular-nums ${r.companyMinWages == null ? "text-muted-foreground" : ""}`}
          >
            {fmtUmbral(r.companyMinWages)}
          </span>
        ),
      },
    ],
    [],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    rules,
    rule,
    generales,
    params,
    setParams,
    errGen,
    savingGen,
    genWithoutChanges,
    saveGenerales,
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
    errDraft,
    saving,
    viendo,
    setViendo,
    deleting,
    setDeleting,
    openNew,
    saveDraft,
    remove,
    exportar,
    getActions,
    columns,
    totalPages,
  };
}

export type BlockSettingsPageVm = ReturnType<typeof useBlockSettingsPage>;
