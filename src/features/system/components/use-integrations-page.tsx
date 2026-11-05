import { useState } from "react";
import { useDeveloperMode } from "@/app/use-developer-mode";
import { useIntegrations } from "../integrations.hooks";
import type { Integration } from "../integrations.types";
import { useCan } from "@/features/rbac/rbac.hooks";
import { type IntegrationUI } from "@/features/system/integrations.types";
import { mockExecutions } from "@/features/system/integrations.rules";
import { mockProximaExecution } from "@/features/system/integrations.rules";
import { mockUltimaExecution } from "@/features/system/integrations.rules";
import { mockHealth } from "@/features/system/integrations.rules";

/** Estado y acciones de IntegrationsPage: el componente solo dibuja. */
export function useIntegrationsPage() {
  const { devMode } = useDeveloperMode();
  const { can } = useCan();
  const {
    rows: integrations,
    isLoading,
    isError,
    isEmpty,
  } = useIntegrations({
    page: 0,
    pageSize: 100,
  });

  const [showLogs, setShowLogs] = useState(false);
  const [logLevel, setLogLevel] = useState("INFO");
  const [logRetencion, setLogRetencion] = useState("7");
  const [showRunEspecifico, setShowRunEspecifico] = useState(false);
  const [loginSeleccionado, setLoginSeleccionado] = useState("pct:wondersoft");
  const [confirmRunAll, setConfirmRunAll] = useState(false);

  const buildUI = (i: Integration): IntegrationUI => ({
    id: i.id,
    nombre: i.name,
    proveedor: i.provider,
    salud: mockHealth[i.id] ?? "ok",
    ultimaEjecucion: mockUltimaExecution[i.id] ?? "—",
    proximaEjecucion: mockProximaExecution[i.id] ?? "—",
    ejecuciones: mockExecutions[i.id] ?? 0,
  });

  const integrationsUI = integrations.map(buildUI);
  return {
    devMode,
    integrations,
    isLoading,
    isError,
    isEmpty,
    showLogs,
    setShowLogs,
    logLevel,
    setLogLevel,
    logRetencion,
    setLogRetencion,
    showRunEspecifico,
    setShowRunEspecifico,
    loginSeleccionado,
    setLoginSeleccionado,
    confirmRunAll,
    setConfirmRunAll,
    integrationsUI,
  };
}

export type IntegrationsPageVm = ReturnType<typeof useIntegrationsPage>;
