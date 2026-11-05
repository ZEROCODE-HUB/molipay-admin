import { createContext,useContext,useState,type ReactNode } from "react";
import {
merchantsInitials,
type Merchant,
type StatusGeneral,
type LinkPaymentStatus,
} from "@/features/merchants/merchants.data";

type MerchantsContextValue = {
  comercios: Merchant[];
  guardarComercio: (merchant: Merchant) => void;
  eliminarComercio: (id: number) => void;
  setEstadoGeneral: (id: number, status: StatusGeneral) => void;
  togglePct: (id: number) => void;
  toggleLinkPago: (id: number) => void;
  setLinkPagoEstado: (id: number, status: LinkPaymentStatus) => void;
};

const MerchantsContext = createContext<MerchantsContextValue | null>(null);

export function MerchantsProvider({ children }: { children: ReactNode }) {
  const [merchants, setMerchants] = useState<Merchant[]>(merchantsInitials);

  const saveMerchant = (merchant: Merchant) => {
    setMerchants((prev) => {
      if (merchant.id) return prev.map((d) => (d.id === merchant.id ? merchant : d));
      const nextId = Math.max(0, ...prev.map((d) => d.id)) + 1;
      return [...prev, { ...merchant, id: nextId }];
    });
  };

  const removeMerchant = (id: number) => {
    setMerchants((prev) => prev.filter((d) => d.id !== id));
  };

  const setStatusGeneral = (id: number, status: StatusGeneral) => {
    setMerchants((prev) => prev.map((d) => (d.id === id ? { ...d, estado: status } : d)));
  };

  const togglePct = (id: number) => {
    setMerchants((prev) =>
      prev.map((d) => (d.id === id ? { ...d, pctHabilitado: !d.pctHabilitado } : d)),
    );
  };

  const toggleLinkPayment = (id: number) => {
    setMerchants((prev) =>
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

  const setLinkPaymentStatus = (id: number, status: LinkPaymentStatus) => {
    setMerchants((prev) => prev.map((d) => (d.id === id ? { ...d, linkPagoEstado: status } : d)));
  };

  return (
    <MerchantsContext.Provider
      value={{
        comercios: merchants,
        guardarComercio: saveMerchant,
        eliminarComercio: removeMerchant,
        setEstadoGeneral: setStatusGeneral,
        togglePct,
        toggleLinkPago: toggleLinkPayment,
        setLinkPagoEstado: setLinkPaymentStatus,
      }}
    >
      {children}
    </MerchantsContext.Provider>
  );
}

export function useMerchants() {
  const ctx = useContext(MerchantsContext);
  if (!ctx) throw new Error("useComercios debe usarse dentro de <ComerciosProvider>");
  return ctx;
}
