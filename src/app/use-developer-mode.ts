import { useState } from "react";
import { createKeyValueStore } from "@/infrastructure/browser-storage/key-value-store";

const devModeStore = createKeyValueStore<boolean>({
  key: "molly_dev_mode",
  validate: (v): v is boolean => typeof v === "boolean",
});

export function useDeveloperMode() {
  const [devMode, setDevModeState] = useState<boolean>(() => devModeStore.get() ?? false);

  const setDevMode = (v: boolean) => {
    setDevModeState(v);
    if (v) devModeStore.set(true);
    else devModeStore.remove();
  };

  return { devMode, setDevMode };
}
