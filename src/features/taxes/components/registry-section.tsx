import { type Tax } from "@/infrastructure/supabase/legacy/types";
import { useMemo,useState } from "react";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useQuery } from "@tanstack/react-query";
import {
QK_REGISTRIES,
listRegistriesIibb,
searchEnRegistry,
} from "@/features/taxes/iibb-registry.supabase";
import { Link } from "@tanstack/react-router";
import { ExternalLink,Search } from "lucide-react";
import { Input,Label } from "@/shared/ui/form-controls";
import { Field } from "@/shared/ui/labeled-field";
import { dateCorta,num,selectCls } from "@/features/taxes/taxes.rules";
import { RatesSection } from "./rates-section";

// --- Padrón: sección del detalle (impuestos con fuente Padrón) ----------------

export function RegistrySection({
  impuesto: tax,
  puedeEditar: canEdit,
}: {
  impuesto: Tax;
  puedeEditar: boolean;
}) {
  const [text, setText] = useState("");
  const search = useDebouncedValue(text, 350);
  const registries = useQuery({
    queryKey: QK_REGISTRIES,
    queryFn: listRegistriesIibb,
    staleTime: 30_000,
  });

  const effectives = useMemo(() => {
    const all = (registries.data ?? []).filter((p) => p.estado === "Vigente");
    const propios = all.filter((p) => p.impuestoId === tax.id);
    return (propios.length ? propios : all).sort((a, b) =>
      (b.periodo ?? "").localeCompare(a.periodo ?? ""),
    );
  }, [registries.data, tax.id]);
  const [registryId, setRegistryId] = useState("");
  const registry = effectives.find((p) => p.id === registryId) ?? effectives[0] ?? null;

  const digits = search.replace(/\D/g, "");
  const consulta = useQuery({
    queryKey: ["taxpayer_registry_entries", registry?.id, search],
    queryFn: () => searchEnRegistry(registry!.id, search, 20),
    enabled: !!registry && search.trim().length >= 3,
  });

  if (registries.isLoading)
    return <p className="text-sm text-muted-foreground">Cargando padrones…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Alícuota según padrón
        </h4>
        <Link
          to="/admin/comercios/impuestos/ingresos-brutos"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Gestionar padrones <ExternalLink size={12} />
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
        <p>
          El padrón vigente del período indica la letra de cada CUIT y esta tabla, su porcentaje. Si
          cambiás un porcentaje, se aplica a los padrones que cargues después.
        </p>
        <p>
          Solo en el ingreso de fondos (Pay-In) sobre el bruto. En el egreso (Pay-Out) es 0,00%. Si
          el CUIT no figura en el padrón o figura como exento / no sujeto, es 0,00%.
        </p>
      </div>

      <RatesSection
        impuesto={tax}
        puedeEditar={canEdit}
        cuitsPorCodigo={
          registry?.kpis?.letras && new Map(registry.kpis.letras.map((l) => [l.letra, l.cuits]))
        }
      />

      {!registry ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No hay un padrón vigente cargado. Mientras tanto la alícuota de todos los CUIT es 0,00%.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
            <Field
              label="Padrón vigente"
              value={
                effectives.length > 1 ? (
                  <select
                    className={selectCls}
                    value={registry.id}
                    onChange={(e) => setRegistryId(e.target.value)}
                  >
                    {effectives.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.organismo} · {p.periodo}
                      </option>
                    ))}
                  </select>
                ) : (
                  `${registry.organismo ?? "—"} · ${registry.periodo ?? "—"}`
                )
              }
            />
            <Field
              label="Vigencia"
              value={
                <span className="text-sm">
                  {dateCorta(registry.vigenciaDesde)} – {dateCorta(registry.vigenciaHasta)}
                </span>
              }
            />
            <Field
              label="CUITs"
              value={
                <span className="font-mono tabular-nums">
                  {registry.filasValidas.toLocaleString("es-AR")}
                </span>
              }
            />
            <Field
              label="Exentos"
              value={
                <span className="font-mono tabular-nums">
                  {(registry.kpis?.exentos ?? 0).toLocaleString("es-AR")}
                </span>
              }
            />
          </div>

          <div>
            <Label htmlFor="padron-cuit">Consultar alícuota por CUIT o razón social</Label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="padron-cuit"
                className="pl-8"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ej: 20123456789"
              />
            </div>
            {search.trim().length >= 3 && (
              <div className="mt-2 overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 font-medium">CUIT</th>
                      <th className="px-3 py-2 font-medium">Razón social</th>
                      <th className="px-3 py-2 font-medium">Padrón</th>
                      <th className="px-3 py-2 font-medium">Alícuota a aplicar (Pay-In)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(consulta.data ?? []).map((f) => {
                      const exento = f.exento === true || f.sujeto === false;
                      return (
                        <tr key={f.cuit} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 font-mono text-xs">{f.cuit}</td>
                          <td className="px-3 py-2">{f.razonSocial || "—"}</td>
                          <td className="px-3 py-2 font-mono text-xs tabular-nums">
                            {num(f.alicuotaRetencion)}%
                          </td>
                          <td className="px-3 py-2">
                            {exento ? (
                              <span>
                                <span className="font-mono tabular-nums">0,00%</span>{" "}
                                <span className="text-xs text-muted-foreground">
                                  ({f.exento ? "exento" : "no sujeto"})
                                </span>
                              </span>
                            ) : (
                              <span className="font-mono font-semibold tabular-nums">
                                {num(f.alicuotaRetencion)}%
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {consulta.isFetching && !consulta.data && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-4 text-center text-sm text-muted-foreground"
                        >
                          Buscando…
                        </td>
                      </tr>
                    )}
                    {consulta.data && consulta.data.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-4 text-center text-sm text-muted-foreground"
                        >
                          {digits.length === 11
                            ? "El CUIT no figura en el padrón: alícuota 0,00%."
                            : "Sin coincidencias en el padrón."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
