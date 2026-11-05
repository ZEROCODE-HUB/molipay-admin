import { useQuery,useQueryClient } from "@tanstack/react-query";
import {
listAlertRules,
listFichaValues,
saveAlertRules,
} from "@/features/alerts/alert-rules.supabase";
import { useEffect,useMemo,useState } from "react";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { type Draft } from "@/features/alerts/alert-settings.types";
import { CODES,construir,toDraft } from "@/features/alerts/alert-settings.rules";

/** Estado y acciones de AlertSettingsPage: el componente solo dibuja. */
export function useAlertSettingsPage() {
  const queryClient = useQueryClient();
  const {
    data: rules,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["alert_rules"],
    queryFn: listAlertRules,
  });

  const ficha = useQuery({
    queryKey: ["ficha_values"],
    queryFn: listFichaValues,
    staleTime: 5 * 60_000,
  });
  const fichaValues = ficha.data ?? { actividades: [], provincias: [] };
  const [condicionesDe, setCondicionesDe] = useState<{ code: string; name: string } | null>(null);

  const [draft, setDraft] = useState<Draft>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const original = useMemo(() => (rules ? toDraft(rules) : null), [rules]);
  useEffect(() => {
    if (original) setDraft(structuredClone(original));
  }, [original]);

  const withoutChanges = useMemo(
    () => JSON.stringify(original) === JSON.stringify(draft),
    [original, draft],
  );
  const faltantes = original ? CODES.filter((c) => !original[c]) : [];

  const patch = (code: string, fn: (d: Draft[string]) => void) =>
    setDraft((prev) => {
      const next = structuredClone(prev);
      if (next[code]) fn(next[code]);
      return next;
    });

  const save = async () => {
    const { rules: aSave, errores: errs } = construir(draft);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Revisá los campos marcados antes de guardar");
      return;
    }
    setSaving(true);
    try {
      await saveAlertRules(aSave);
      await queryClient.invalidateQueries({ queryKey: ["alert_rules"] });
      toast.success("Configuración de alertas guardada");
    } catch (e) {
      toast.error(`No se pudo guardar: ${userMessage(e)}`);
    } finally {
      setSaving(false);
    }
  };
  return {
    rules,
    isLoading,
    isError,
    error,
    refetch,
    ficha,
    fichaValues,
    condicionesDe,
    setCondicionesDe,
    draft,
    errors,
    saving,
    withoutChanges,
    faltantes,
    patch,
    save,
  };
}

export type AlertSettingsPageVm = ReturnType<typeof useAlertSettingsPage>;
