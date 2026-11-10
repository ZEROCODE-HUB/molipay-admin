import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/shared/ui/badge";
import { type Column } from "@/shared/ui/data-table";
import { Amount, date, errMsg } from "@/features/payment-links/components/credits-common";
import { parseFileSettlement, type ResultParseo } from "@/features/payment-links/settlements-parse";
import {
  QK_ACRED,
  confirmSettlement,
  huellaFile,
  listImportaciones,
  previsualizarSettlement,
  rangeDelHeader,
  type PreviewSettlement,
  type LinePreview,
  type ResultImportacion,
} from "@/features/payment-links/credits.supabase";
import { useCan } from "@/features/rbac/rbac.hooks";
import { type Step } from "@/features/payment-links/settlements.types";
import { RESULT_LABEL, RESULT_TONE } from "@/features/payment-links/settlements.rules";

/** Estado y acciones de SettlementsPage: el componente solo dibuja. */
export function useSettlementsPage() {
  const { can } = useCan();
  const puede = can("modificar", "comercios");
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parseo, setParseo] = useState<ResultParseo | null>(null);
  const [hash, setHash] = useState("");
  const [preview, setPreview] = useState<PreviewSettlement | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCeros, setShowCeros] = useState(false);
  const [filterResult, setFilterResult] = useState<"" | LinePreview["resultado"]>("");
  const [revisado, setRevisado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [result, setResult] = useState<ResultImportacion | null>(null);

  const history = useQuery({
    queryKey: [...QK_ACRED, "importaciones"],
    queryFn: () => listImportaciones(15),
  });

  const range = useMemo(
    () => (parseo ? rangeDelHeader(parseo.encabezadoLineas) : { desde: null, hasta: null }),
    [parseo],
  );

  const reiniciar = () => {
    setStep(1);
    setFile(null);
    setParseo(null);
    setHash("");
    setPreview(null);
    setRevisado(false);
    setResult(null);
    setFilterResult("");
  };

  const validate = async () => {
    if (!file) {
      toast.error("Elegí el archivo de liquidaciones.");
      return;
    }
    setLoading(true);
    try {
      const p = await parseFileSettlement(file);
      const h = await huellaFile(file);
      const pv = await previsualizarSettlement(p.renglones, h);
      setParseo(p);
      setHash(h);
      setPreview(pv);
      setRevisado(false);
      setStep(2);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!parseo || !file || !preview?.puede_confirmar || !revisado) return;
    setConfirmando(true);
    try {
      const r = await confirmSettlement({
        renglones: parseo.renglones,
        archivoNombre: file.name,
        hash,
        desde: range.desde,
        hasta: range.hasta,
      });
      setResult(r);
      setStep(4);
      qc.invalidateQueries({ queryKey: QK_ACRED });
      qc.invalidateQueries({ queryKey: ["lotes"] });
      toast.success(`Importación lista: ${r.lotes_creados} lote(s) creado(s).`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setConfirmando(false);
    }
  };

  const rows = useMemo(() => {
    const rs = preview?.renglones ?? [];
    return rs.filter(
      (r) =>
        (showCeros || r.resultado !== "ignora") && (!filterResult || r.resultado === filterResult),
    );
  }, [preview, showCeros, filterResult]);

  const downloadErrors = () => {
    const errors = (preview?.renglones ?? []).filter(
      (r) => r.resultado === "error" || r.resultado === "excepcion",
    );
    const csv = ["FILA;FECHA;MARCA;ESTABLECIMIENTO;NETO;RESULTADO;MOTIVO"]
      .concat(
        errors.map((r) =>
          [
            r.nro,
            r.fecha ?? "",
            r.marca ?? "",
            r.establecimiento ?? "",
            r.neto ?? "",
            RESULT_LABEL[r.resultado],
            (r.motivo ?? "").replace(/;/g, ","),
          ].join(";"),
        ),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `errores_${file?.name ?? "liquidacion"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const columns: Column<LinePreview>[] = [
    {
      key: "nro",
      label: "Fila",
      minWidth: 60,
      hint: "Número de línea en el archivo de Payway.",
      render: (r) => <span className="font-mono text-xs">{r.nro}</span>,
    },
    {
      key: "fecha",
      label: "Fecha",
      hint: "FECHA del archivo: fecha de pago de Payway [A-9].",
      render: (r) => <span className="font-mono text-xs">{date(r.fecha)}</span>,
    },
    { key: "marca", label: "Bandera", render: (r) => r.marca ?? "—" },
    {
      key: "establecimiento",
      label: "Establecimiento",
      hint: "Número que Payway asigna por bandera. Es lo único que identifica al comercio en el archivo.",
      render: (r) => <span className="font-mono text-xs">{r.establecimiento ?? "—"}</span>,
    },
    {
      key: "comercio",
      label: "Comercio",
      hint: "Comercio encontrado por el establecimiento (tabla de establecimientos). Si no hay, queda como excepción.",
      render: (r) =>
        r.comercio_id ? (
          <div className="leading-tight">
            <div className="text-xs font-semibold">{r.comercio ?? "—"}</div>
            <div className="text-[11px] font-mono text-muted-foreground">{r.legajo}</div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Sin asignar</span>
        ),
    },
    { key: "bruto", label: "Bruto", render: (r) => <Amount v={r.bruto} /> },
    { key: "costo", label: "Costo servicio", render: (r) => <Amount v={r.costo} /> },
    { key: "impuestos", label: "Impuestos", render: (r) => <Amount v={r.impuestos} /> },
    {
      key: "neto",
      label: "Neto",
      hint: "Neto de Payway: lo que entra a la recaudadora.",
      render: (r) => <Amount v={r.neto} strong />,
    },
    {
      key: "resultado",
      label: "Resultado",
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <Badge tone={RESULT_TONE[r.resultado]}>{RESULT_LABEL[r.resultado]}</Badge>
          {r.advertencias.map((a) => (
            <span key={a} className="text-[10px] text-amber-700">
              {a === "posible_duplicado" ? "Posible duplicado" : a}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "motivo",
      label: "Motivo",
      minWidth: 220,
      render: (r) => <span className="text-xs text-muted-foreground">{r.motivo ?? ""}</span>,
    },
  ];

  const t = preview?.totales;
  return {
    puede,
    step,
    setStep,
    file,
    setFile,
    preview,
    loading,
    showCeros,
    setShowCeros,
    filterResult,
    setFilterResult,
    revisado,
    setRevisado,
    confirmando,
    result,
    history,
    range,
    reiniciar,
    validate,
    confirm,
    rows,
    downloadErrors,
    columns,
    t,
  };
}

export type SettlementsPageVm = ReturnType<typeof useSettlementsPage>;
