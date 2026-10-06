import { useState } from "react";

const STORAGE_KEY = "molly_dev_mode";

export function useDeveloperMode() {
  const [devMode, setDevModeState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });

  const setDevMode = (v: boolean) => {
    setDevModeState(v);
    if (typeof window !== "undefined") {
      if (v) localStorage.setItem(STORAGE_KEY, "1");
      else localStorage.removeItem(STORAGE_KEY);
    }
  };

  return { devMode, setDevMode };
}
