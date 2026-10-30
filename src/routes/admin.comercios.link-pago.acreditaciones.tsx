import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, Loader2, Scale, Send } from "lucide-react";
import { PageHeader, Badge, BtnOutline, BtnPrimary, Card, Input } from "@/components/portal-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { DataTable, type Column } from "@/components/data-table";
import { EstadoLote, Monto, fecha, fechaHora, hoyIso, errMsg } from "@/components/acreditaciones/comunes";
import { useCan } from "@/lib/permissions";
import { parseImporte } from "@/lib/liquidaciones/parse";
import {
  QK_ACRED,
  acreditacionesPorDia,
  conciliacionDelDia,
  conciliar,
  guardarSeleccion,
  listLotesV2,
  type ConciliacionMarca,
  type DiaAcreditacion,
  type LoteV2,
} from "@/lib/api/acreditaciones";

const searchSchema = z.object({
  fecha: z.string().optional(),
  comercio: z.string().optional(),
});

export const Route = createFileRoute("/admin/comercios/link-pago/acreditaciones")({
  validateSearch: searchSchema,
  component: Page,
  head: () => ({
    meta: [
      { title: "Acreditaciones por día — Links de Pago — Admin — Moli" },
      { name: "description", content: "Cuánto liquidó Payway cada día, cuánto ingresó a la recaudadora y cuánto se acreditó." },
    ],
  }),
});

const TONO_DIA: Record<DiaAcreditacion["estado"], "success" | "warn" | "danger" | "neutral"> = {
  Acreditado: "success",
  "Acreditado parcial": "success",
  Listo: "neutral",
  "No conciliado": "warn",
  "Con excepciones": "danger",
};

function Page() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/comercios/link-pago/acreditaciones" });
  const [desde, setDesde] = useState(hoyIso(-30));
  const [hasta, setHasta] = useState(hoyIso(15));

  const irA = (s: { fecha?: string; comercio?: string }) => void navigate({ search: s });

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
            <button type="button" className={search.comercio ? "text-primary hover:underline" : "font-semibold"} onClick={() => irA({ fecha: search.fecha })}>
              {fecha(search.fecha)}
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

      {!search.fecha && <ListaDias desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} onDia={(f) => irA({ fecha: f })} />}
      {search.fecha && !search.comercio && <DetalleDia fechaPago={search.fecha} onComercio={(c) => irA({ fecha: search.fecha, comercio: c })} />}
      {search.fecha && search.comercio && <DetalleComercio fechaPago={search.fecha} comercioId={search.comercio} />}
    </PermissionGuard>
  );
}

function ListaDias({
  desde,
  hasta,
  setDesde,
  setHasta,
  onDia,
}: {
  desde: string;
  hasta: string;
  setDesde: (v: string) => void;
  setHasta: (v: string) => void;
  onDia: (f: string) => void;
}) {
  const q = useQuery({ queryKey: [...QK_ACRED, "por-dia", desde, hasta], queryFn: () => acreditacionesPorDia(desde, hasta) });
  const dias = q.data ?? [];
  const tot = dias.reduce(
    (a, d) => ({
      neto: a.neto + Number(d.neto_payway),
      ingresado: a.ingresado + Number(d.ingresado ?? 0),
      descuentos: a.descuentos + Number(d.descuentos),
      neto_acr: a.neto_acr + Number(d.neto_a_acreditar),
      acreditado: a.acreditado + Number(d.acreditado),
      pendiente: a.pendiente + Number(d.pendiente),
    }),
    { neto: 0, ingresado: 0, descuentos: 0, neto_acr: 0, acreditado: 0, pendiente: 0 },
  );

  const columnas: Column<DiaAcreditacion>[] = [
    { key: "fecha", label: "Fecha de pago", render: (d) => <span className="font-mono text-xs">{fecha(d.fecha)}</span> },
    { key: "comercios", label: "Comercios", render: (d) => d.comercios },
    { key: "lotes", label: "Lotes", render: (d) => d.lotes },
    { key: "neto_payway", label: "Neto Payway", hint: "Suma del neto del archivo de Payway para ese día.", render: (d) => <Monto v={d.neto_payway} /> },
    { key: "ingresado", label: "Ingresó a la recaudadora", hint: "Lo que el operador concilió contra el extracto de la recaudadora.", render: (d) => (d.ingresado == null ? <span className="text-xs text-muted-foreground">Sin conciliar</span> : <Monto v={d.ingresado} />) },
    {
      key: "diferencia",
      label: "Diferencia",
      hint: "Ingresado − neto del archivo (incluye excepciones). Debe dar 0.",
      render: (d) => (d.diferencia == null ? "—" : <Monto v={d.diferencia} className={Number(d.diferencia) !== 0 ? "text-red-600" : ""} />),
    },
    { key: "descuentos", label: "Descuentos MoliPay", hint: "Tasa por bandera + IVA + cierre 0,45% + impuestos asignados.", render: (d) => <Monto v={-Number(d.descuentos)} /> },
    { key: "neto_a_acreditar", label: "Neto a acreditar", render: (d) => <Monto v={d.neto_a_acreditar} strong /> },
    { key: "acreditado", label: "Acreditado", render: (d) => <Monto v={d.acreditado} /> },
    { key: "pendiente", label: "Pendiente", render: (d) => <Monto v={d.pendiente} /> },
    {
      key: "estado",
      label: "Estado del día",
      hint: "Se deriva del peor estado de sus lotes.",
      render: (d) => <Badge tone={TONO_DIA[d.estado]}>{d.estado}</Badge>,
    },
  ];

  return (
    <div className="space-y-3">
      <Card className="p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-semibold mb-1 block">Desde</label>
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Hasta</label>
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div className="flex-1" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-xs">
          <Tot label="Neto Payway" v={tot.neto} />
          <Tot label="Ingresado" v={tot.ingresado} />
          <Tot label="Descuentos" v={-tot.descuentos} />
          <Tot label="Neto a acreditar" v={tot.neto_acr} />
          <Tot label="Acreditado" v={tot.acreditado} />
          <Tot label="Pendiente" v={tot.pendiente} />
        </div>
      </Card>
      {q.isError ? (
        <Card className="text-sm text-red-700">{errMsg(q.error)}</Card>
      ) : (
        <DataTable
          columns={columnas}
          data={dias}
          keyExtractor={(d) => d.fecha}
          loading={q.isLoading}
          pageSize={20}
          showDownloadButton={false}
          showGlobalFilter={false}
          emptyMessage="No hay lotes del archivo de Payway en el rango."
          actions={(d) => (
            <BtnOutline className="h-8 text-xs px-2" onClick={() => onDia(d.fecha)}>
              Ver día <ChevronRight size={13} />
            </BtnOutline>
          )}
        />
      )}
    </div>
  );
}

function Tot({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <Monto v={v} strong />
    </div>
  );
}

type FilaComercio = {
  comercio_id: string;
  comercio: string;
  legajo: string;
  lotes: number;
  bruto: number;
  neto_payway: number;
  descuentos: number;
  compensaciones: number;
  neto_a_acreditar: number;
  acreditado: number;
  elegibles: string[];
  estado: string;
};

function agruparPorComercio(lotes: LoteV2[]): FilaComercio[] {
  const m = new Map<string, FilaComercio>();
  for (const l of lotes) {
    const g =
      m.get(l.comercio_id) ??
      ({
        comercio_id: l.comercio_id,
        comercio: l.comercio_nombre ?? l.comercio_usuario,
        legajo: l.comercio_legajo,
        lotes: 0,
        bruto: 0,
        neto_payway: 0,
        descuentos: 0,
        compensaciones: 0,
        neto_a_acreditar: 0,
        acreditado: 0,
        elegibles: [],
        estado: "Acreditado",
      } as FilaComercio);
    g.lotes++;
    g.bruto += Number(l.importe_bruto);
    g.neto_payway += Number(l.neto_payway ?? 0);
    g.descuentos += Number(l.tasa_molipay_monto ?? 0) + Number(l.iva_tasa_monto ?? 0) + Number(l.comision_cierre_lote_monto ?? 0) + Number(l.impuestos ?? 0);
    g.compensaciones += Number(l.retencion_contracargos ?? 0) + Number(l.compensacion_adelantos) + Number(l.recuperacion_deuda);
    g.neto_a_acreditar += Number(l.neto_a_acreditar ?? 0);
    if (l.estado === "Acreditado") g.acreditado += Number(l.neto_a_acreditar ?? 0);
    if (l.elegible) g.elegibles.push(l.id);
    if (l.estado !== "Acreditado") g.estado = l.subestado === "no_conciliado" ? "No conciliado" : g.estado === "No conciliado" ? g.estado : "Pendiente";
    m.set(l.comercio_id, g);
  }
  return [...m.values()];
}

function DetalleDia({ fechaPago, onComercio }: { fechaPago: string; onComercio: (id: string) => void }) {
  const navigate = useNavigate();
  const lotesQ = useQuery({
    queryKey: [...QK_ACRED, "lotes-dia", fechaPago],
    queryFn: () => listLotesV2({ desde: fechaPago, hasta: fechaPago, origen: "archivo" }, 0, 1000),
  });
  const filas = useMemo(() => agruparPorComercio(lotesQ.data?.rows ?? []), [lotesQ.data]);
  const elegibles = filas.flatMap((f) => f.elegibles);

  const llevar = (ids: string[]) => {
    guardarSeleccion(ids);
    void navigate({ to: "/admin/comercios/link-pago/ejecucion" });
  };

  const columnas: Column<FilaComercio>[] = [
    {
      key: "comercio",
      label: "Comercio",
      render: (f) => (
        <div className="leading-tight">
          <div className="text-sm font-semibold">{f.comercio}</div>
          <div className="text-[11px] font-mono text-muted-foreground">{f.legajo}</div>
        </div>
      ),
    },
    { key: "lotes", label: "Lotes", render: (f) => f.lotes },
    { key: "bruto", label: "Bruto", render: (f) => <Monto v={f.bruto} /> },
    { key: "neto_payway", label: "Neto Payway", render: (f) => <Monto v={f.neto_payway} /> },
    { key: "descuentos", label: "Descuentos MoliPay", render: (f) => <Monto v={-f.descuentos} /> },
    { key: "compensaciones", label: "Compensaciones", hint: "Adelantos y deudas (contracargos / negativos) que se descuentan.", render: (f) => <Monto v={-f.compensaciones} /> },
    { key: "neto_a_acreditar", label: "Neto a acreditar", render: (f) => <Monto v={f.neto_a_acreditar} strong /> },
    { key: "acreditado", label: "Acreditado", render: (f) => <Monto v={f.acreditado} /> },
    { key: "estado", label: "Estado", render: (f) => <Badge tone={f.estado === "Acreditado" ? "success" : f.estado === "No conciliado" ? "warn" : "neutral"}>{f.estado}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <ConciliacionCard fechaPago={fechaPago} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Comercios del {fecha(fechaPago)}</h3>
        <BtnPrimary onClick={() => llevar(elegibles)} disabled={elegibles.length === 0}>
          <Send size={15} /> Llevar a ejecución masiva ({elegibles.length})
        </BtnPrimary>
      </div>
      {lotesQ.isError ? (
        <Card className="text-sm text-red-700">{errMsg(lotesQ.error)}</Card>
      ) : (
        <DataTable
          columns={columnas}
          data={filas}
          keyExtractor={(f) => f.comercio_id}
          loading={lotesQ.isLoading}
          pageSize={20}
          showDownloadButton={false}
          actions={(f) => (
            <div className="flex gap-1">
              <BtnOutline className="h-8 text-xs px-2" onClick={() => onComercio(f.comercio_id)}>
                Ver lotes
              </BtnOutline>
              <BtnOutline className="h-8 text-xs px-2" disabled={f.elegibles.length === 0} onClick={() => llevar(f.elegibles)}>
                <Send size={12} /> Ejecutar
              </BtnOutline>
            </div>
          )}
        />
      )}
    </div>
  );
}

function ConciliacionCard({ fechaPago }: { fechaPago: string }) {
  const { can } = useCan();
  const puede = can("modificar", "comercios");
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [...QK_ACRED, "conciliacion", fechaPago], queryFn: () => conciliacionDelDia(fechaPago) });
  const [valores, setValores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState<string | null>(null);

  const enviar = async (m: ConciliacionMarca) => {
    const raw = (valores[m.marca] ?? "").trim();
    const v = parseImporte(raw);
    if (!raw || !Number.isFinite(v)) {
      toast.error("Ingresá el importe que entró a la recaudadora (ej.: 2407,13).");
      return;
    }
    setEnviando(m.marca);
    try {
      const r = await conciliar(fechaPago, m.marca, Math.round(v * 100) / 100);
      if (r.estado === "conciliado") toast.success(`${m.marca}: conciliado. ${r.lotes_conciliados} lote(s) listos para acreditar.`);
      else toast.error(`${m.marca}: diferencia de ${r.diferencia.toLocaleString("es-AR", { minimumFractionDigits: 2 })}. No se concilió.`);
      qc.invalidateQueries({ queryKey: QK_ACRED });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setEnviando(null);
    }
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <Scale size={16} />
        <h3 className="text-sm font-semibold">Conciliación con la recaudadora de Payway · {fecha(fechaPago)}</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Por cada bandera, cargá lo que ingresó a la recaudadora según el extracto. Si coincide con el neto del archivo (incluidas las excepciones), los lotes quedan
        conciliados. No se acredita lo que no está en la cuenta.
      </p>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : q.isError ? (
        <p className="text-sm text-red-700">{errMsg(q.error)}</p>
      ) : (q.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay renglones del archivo para esta fecha.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="text-left">
                <th className="py-1.5 pr-3">Bandera</th>
                <th className="py-1.5 pr-3 text-right">Neto del archivo</th>
                <th className="py-1.5 pr-3">Lotes sin conciliar</th>
                <th className="py-1.5 pr-3">Última conciliación</th>
                <th className="py-1.5 pr-3">Ingresó a la recaudadora</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {(q.data ?? []).map((m) => (
                <tr key={m.marca}>
                  <td className="py-2 pr-3 font-semibold">{m.marca}</td>
                  <td className="py-2 pr-3 text-right">
                    <Monto v={m.neto_archivo} strong />
                  </td>
                  <td className="py-2 pr-3 text-xs">
                    {m.sin_conciliar > 0 ? <Badge tone="warn">{m.sin_conciliar} de {m.lotes}</Badge> : <Badge tone="success">Todos conciliados</Badge>}
                  </td>
                  <td className="py-2 pr-3 text-xs">
                    {m.ultima ? (
                      <span>
                        <Badge tone={m.ultima.estado === "conciliado" ? "success" : "danger"}>
                          {m.ultima.estado === "conciliado" ? "Conciliado" : "Con diferencia"}
                        </Badge>{" "}
                        <Monto v={m.ultima.ingresado} /> · {fechaHora(m.ultima.created_at)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <Input
                      inputMode="decimal"
                      className="h-9 w-40"
                      placeholder={m.neto_archivo.toFixed(2).replace(".", ",")}
                      value={valores[m.marca] ?? ""}
                      onChange={(e) => setValores((v) => ({ ...v, [m.marca]: e.target.value }))}
                      disabled={!puede || m.sin_conciliar === 0}
                    />
                  </td>
                  <td className="py-2">
                    <BtnOutline className="h-9 text-xs px-3" disabled={!puede || m.sin_conciliar === 0 || enviando !== null} onClick={() => void enviar(m)}>
                      {enviando === m.marca ? <Loader2 size={13} className="animate-spin" /> : null} Conciliar
                    </BtnOutline>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function DetalleComercio({ fechaPago, comercioId }: { fechaPago: string; comercioId: string }) {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: [...QK_ACRED, "lotes-dia-comercio", fechaPago, comercioId],
    queryFn: () => listLotesV2({ desde: fechaPago, hasta: fechaPago, comercioId, origen: "archivo" }, 0, 500),
  });
  const lotes = q.data?.rows ?? [];
  const elegibles = lotes.filter((l) => l.elegible).map((l) => l.id);

  const columnas: Column<LoteV2>[] = [
    { key: "codigo", label: "Lote", render: (l) => <span className="font-mono text-xs">{l.codigo}</span> },
    { key: "bandera", label: "Bandera", render: (l) => l.bandera },
    { key: "establecimiento", label: "Establecimiento", render: (l) => <span className="font-mono text-xs">{l.establecimiento ?? "—"}</span> },
    { key: "neto_payway", label: "Neto Payway", render: (l) => <Monto v={l.neto_payway} /> },
    {
      key: "descuentos",
      label: "Descuentos",
      render: (l) => <Monto v={-(Number(l.tasa_molipay_monto) + Number(l.iva_tasa_monto ?? 0) + Number(l.comision_cierre_lote_monto ?? 0) + Number(l.impuestos ?? 0))} />,
    },
    { key: "compensaciones", label: "Compensaciones", render: (l) => <Monto v={-(Number(l.retencion_contracargos ?? 0) + Number(l.compensacion_adelantos) + Number(l.recuperacion_deuda))} /> },
    { key: "neto_a_acreditar", label: "Neto a acreditar", render: (l) => <Monto v={l.neto_a_acreditar} strong /> },
    { key: "estado", label: "Estado", render: (l) => <EstadoLote lote={l} /> },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          {lotes[0]?.comercio_nombre ?? lotes[0]?.comercio_usuario ?? "Comercio"} · {fecha(fechaPago)}
        </h3>
        <BtnPrimary
          disabled={elegibles.length === 0}
          onClick={() => {
            guardarSeleccion(elegibles);
            void navigate({ to: "/admin/comercios/link-pago/ejecucion" });
          }}
        >
          <Send size={15} /> Llevar a ejecución masiva ({elegibles.length})
        </BtnPrimary>
      </div>
      <DataTable
        columns={columnas}
        data={lotes}
        keyExtractor={(l) => l.id}
        loading={q.isLoading}
        showDownloadButton={false}
        actions={(l) => (
          <Link to="/admin/comercios/link-pago/lotes" search={{ lote: l.id }} className="text-xs font-semibold text-primary hover:underline">
            Apertura
          </Link>
        )}
      />
    </div>
  );
}
