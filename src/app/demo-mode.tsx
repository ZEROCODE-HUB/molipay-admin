import { createContext,useContext,useEffect,useState,type ReactNode } from "react";
import { createKeyValueStore } from "@/infrastructure/browser-storage/key-value-store";

export type DemoRole = "admin" | "operador";

type DemoCtx = {
  role: DemoRole | null;
  setRole: (r: DemoRole | null) => void;
};

const DEMO_ROLES: readonly string[] = ["admin", "operador"];
const demoRoleStore = createKeyValueStore<DemoRole>({
  key: "molly_role",
  validate: (v): v is DemoRole => typeof v === "string" && DEMO_ROLES.includes(v),
});

const Ctx = createContext<DemoCtx | null>(null);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<DemoRole | null>(null);

  useEffect(() => {
    const r = demoRoleStore.get();
    if (r) setRoleState(r);
  }, []);

  const setRole = (r: DemoRole | null) => {
    setRoleState(r);
    if (r) demoRoleStore.set(r);
    else demoRoleStore.remove();
  };

  return <Ctx.Provider value={{ role, setRole }}>{children}</Ctx.Provider>;
}

export function useDemoMode() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDemoMode must be used inside DemoModeProvider");
  return c;
}
