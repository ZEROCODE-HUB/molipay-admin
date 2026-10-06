import { createContext, useContext, useState, type ReactNode } from "react";
import {
  comerciosIniciales,
  type Comercio,
  type EstadoGeneral,
  type LinkPagoEstado,
} from "@/data/comercios";

type ComerciosContextValue = {
  comercios: Comercio[];
  guardarComercio: (comercio: Comercio) => void;
  eliminarComercio: (id: number) => void;
  setEstadoGeneral: (id: number, estado: EstadoGeneral) => void;
  togglePct: (id: number) => void;
  toggleLinkPago: (id: number) => void;
  setLinkPagoEstado: (id: number, estado: LinkPagoEstado) => void;
};

const ComerciosContext = createContext<ComerciosContextValue | null>(null);

export function ComerciosProvider({ children }: { children: ReactNode }) {
  const [comercios, setComercios] = useState<Comercio[]>(comerciosIniciales);

  const guardarComercio = (comercio: Comercio) => {
    setComercios((prev) => {
      if (comercio.id) return prev.map((d) => (d.id === comercio.id ? comercio : d));
      const nextId = Math.max(0, ...prev.map((d) => d.id)) + 1;
      return [...prev, { ...comercio, id: nextId }];
    });
  };

  const eliminarComercio = (id: number) => {
    setComercios((prev) => prev.filter((d) => d.id !== id));
  };

  const setEstadoGeneral = (id: number, estado: EstadoGeneral) => {
    setComercios((prev) => prev.map((d) => (d.id === id ? { ...d, estado } : d)));
  };

  const togglePct = (id: number) => {
    setComercios((prev) =>
      prev.map((d) => (d.id === id ? { ...d, pctHabilitado: !d.pctHabilitado } : d)),
    );
  };

  const toggleLinkPago = (id: number) => {
    setComercios((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              linkPagoHabilitado: !d.linkPagoHabilitado,
              linkPagoEstado: !d.linkPagoHabilitado ? "Pendiente de aprobación" : "No asociado",
            }
          : d,
      ),
    );
  };

  const setLinkPagoEstado = (id: number, estado: LinkPagoEstado) => {
    setComercios((prev) => prev.map((d) => (d.id === id ? { ...d, linkPagoEstado: estado } : d)));
  };

  return (
    <ComerciosContext.Provider
      value={{
        comercios,
        guardarComercio,
        eliminarComercio,
        setEstadoGeneral,
        togglePct,
        toggleLinkPago,
        setLinkPagoEstado,
      }}
    >
      {children}
    </ComerciosContext.Provider>
  );
}

export function useComercios() {
  const ctx = useContext(ComerciosContext);
  if (!ctx) throw new Error("useComercios debe usarse dentro de <ComerciosProvider>");
  return ctx;
}
