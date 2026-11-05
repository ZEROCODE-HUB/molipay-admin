import { useCreditsPage } from "@/features/payment-links/components/use-credits-page";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { ChevronRight } from "lucide-react";
import { date } from "@/features/payment-links/components/credits-common";
import { ListDays } from "./list-days";
import { DetailDay } from "./detail-day";
import { DetailMerchant } from "./detail-merchant";

export function CreditsPage() {
  const vm = useCreditsPage();
  const { search, from, setFrom, to, setTo, irA } = vm;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Acreditaciones por día"
        description="Por fecha de pago: lo que liquidó Payway, lo que ingresó a la recaudadora, los descuentos de MoliPay y lo acreditado."
      />
      <nav className="flex items-center gap-1 text-sm mb-4">
        <button type="button" className="text-primary hover:underline" onClick={() => irA({})}>
          Días
        </button>
        {search.fecha && (
          <>
            <ChevronRight size={14} className="text-muted-foreground" />
            <button
              type="button"
              className={search.comercio ? "text-primary hover:underline" : "font-semibold"}
              onClick={() => irA({ fecha: search.fecha })}
            >
              {date(search.fecha)}
            </button>
          </>
        )}
        {search.fecha && search.comercio && (
          <>
            <ChevronRight size={14} className="text-muted-foreground" />
            <span className="font-semibold">Comercio</span>
          </>
        )}
      </nav>

      {!search.fecha && (
        <ListDays
          desde={from}
          hasta={to}
          setDesde={setFrom}
          setHasta={setTo}
          onDia={(f) => irA({ fecha: f })}
        />
      )}
      {search.fecha && !search.comercio && (
        <DetailDay
          fechaPago={search.fecha}
          onComercio={(c) => irA({ fecha: search.fecha, comercio: c })}
        />
      )}
      {search.fecha && search.comercio && (
        <DetailMerchant fechaPago={search.fecha} comercioId={search.comercio} />
      )}
    </PermissionGuard>
  );
}
