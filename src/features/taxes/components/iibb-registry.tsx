import { useConfirm } from "@/shared/ui/confirm-provider";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import {
QK_REGISTRIES,
confirmRegistry,
descartarRegistry,
exportRegistryTxt,
listErrorsRegistry,
listRegistriesIibb,
type RegistryIibb,
} from "@/features/taxes/iibb-registry.supabase";
import { useTaxesForAssignment } from "@/features/taxes/taxes.hooks";
import { useMemo,useState } from "react";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { Badge } from "@/shared/ui/badge";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { createZip } from "@/shared/lib/zip-store";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { CheckCircle2,Download } from "lucide-react";
import { downloadErrors,n } from "@/features/taxes/iibb-registry.rules";
import { download as downloadBlob } from "@/features/taxes/tax-reports.rules";
import { fmtCreacion as dateHour } from "@/features/taxes/tax-reports.rules";
import { RegistryDetail } from "./registry-detail";
import { TaxModal } from "./tax-modal";
import { SummaryRegistry } from "./summary-registry";

// ---------------------------------------------------------------------------
// Lista de padrones
// ---------------------------------------------------------------------------

export function RegistriesIibbTable({
  puedeEditar: canEdit,
  limite: limit,
  vacio: empty = "Todavía no hay padrones cargados.",
}: {
  puedeEditar: boolean;
  /** Muestra solo las ultimas N cargas, sin filtros ni paginado. */
  limite?: number;
  vacio?: string;
}) {
  const askConfirm = useConfirm();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: QK_REGISTRIES,
    queryFn: listRegistriesIibb,
    // Mientras haya una carga en curso, refrescar el progreso.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((p) => p.estado === "Cargando") ? 3000 : false,
  });
  const { rows: taxes } = useTaxesForAssignment();
  const [detail, setDetail] = useState<RegistryIibb | null>(null);
  const [revisar, setRevisar] = useState<RegistryIibb | null>(null);

  const remove = async (p: RegistryIibb) => {
    const ok = await askConfirm({
      title: "Eliminar padrón",
      message: `¿Eliminar "${p.nombre}"? Se borran sus ${n(p.filasValidas)} filas.`,
      confirmLabel: "Eliminar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await descartarRegistry(p.id);
      toast.success("Padrón eliminado.");
      void qc.invalidateQueries({ queryKey: QK_REGISTRIES });
    } catch (e) {
      toast.error(userMessage(e));
    }
  };

  const confirm = async (p: RegistryIibb) => {
    try {
      const r = await confirmRegistry(p.id);
      toast.success(
        r.reemplazado
          ? `Padrón ${p.periodo} vigente. El anterior quedó como Reemplazado.`
          : `Padrón ${p.periodo} vigente.`,
      );
      setRevisar(null);
      void qc.invalidateQueries({ queryKey: QK_REGISTRIES });
    } catch (e) {
      toast.error(userMessage(e));
    }
  };

  // Version por organismo y periodo (v1, v2...), igual que los reportes.
  const versiones = useMemo(() => {
    const m = new Map<string, number>();
    const grupos = new Map<string, RegistryIibb[]>();
    for (const p of q.data ?? []) {
      if (!["Borrador", "Vigente", "Reemplazado"].includes(p.estado)) continue;
      const k = `${p.organismo}|${p.periodo}`;
      grupos.set(k, [...(grupos.get(k) ?? []), p]);
    }
    for (const list of grupos.values()) {
      list
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .forEach((p, i) => m.set(p.id, i + 1));
    }
    return m;
  }, [q.data]);
  const codeTax = useMemo(() => new Map(taxes.map((i) => [i.id, i.codigo])), [taxes]);

  const versionCelda = (p: RegistryIibb) => {
    const v = versiones.get(p.id);
    if (p.estado === "Cargando") return <Badge tone="warn">cargando {p.progreso}%</Badge>;
    if (p.estado === "Error") return <Badge tone="danger">error</Badge>;
    if (!v) return <span className="text-muted-foreground">—</span>;
    if (p.estado === "Vigente") return <Badge tone="success">v{v} vigente</Badge>;
    if (p.estado === "Reemplazado") return <Badge tone="neutral">v{v} reemplazada</Badge>;
    return <Badge tone="warn">v{v} borrador</Badge>;
  };
  const siNo = (v: boolean) =>
    v ? <Badge tone="success">Sí</Badge> : <Badge tone="neutral">No</Badge>;

  const columns: Column<RegistryIibb>[] = [
    {
      key: "periodo",
      label: "Período",
      render: (p) => <span className="font-mono tabular-nums">{p.periodo ?? "—"}</span>,
    },
    {
      key: "impuesto",
      label: "Impuesto",
      render: (p) => (
        <span className="font-mono text-xs">
          {(p.impuestoId && codeTax.get(p.impuestoId)) || "IIBB"}
        </span>
      ),
    },
    {
      key: "archivo",
      label: "Archivo",
      render: (p) => (
        <div className="min-w-0">
          <div className="truncate">{p.archivo || "Sin archivo"}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {p.organismo ?? "—"} · {p.nombre}
          </div>
        </div>
      ),
    },
    { key: "tramo", label: "Tramo", render: () => "Mensual" },
    { key: "version", label: "Versión", render: versionCelda },
    {
      key: "filasValidas",
      label: "Registros",
      render: (p) => <span className="font-mono tabular-nums">{n(p.filasValidas)}</span>,
    },
    {
      key: "createdAt",
      label: "Creación",
      render: (p) => <span className="text-xs whitespace-nowrap">{dateHour(p.createdAt)}</span>,
    },
    {
      key: "confirmado",
      label: "Presentado",
      render: (p) => siNo(p.estado === "Vigente" || p.estado === "Reemplazado"),
    },
  ];

  const txtDe = async (p: RegistryIibb) => {
    const id = toast.loading("Armando el TXT del padrón…");
    try {
      const content = await exportRegistryTxt(p, (k) =>
        toast.loading(`Armando el TXT del padrón… ${n(k)} CUITs`, { id }),
      );
      toast.dismiss(id);
      return content;
    } catch (e) {
      toast.error(userMessage(e), { id });
      throw e;
    }
  };
  const nameFile = (p: RegistryIibb) =>
    `padron-${(p.organismo ?? "iibb").toLowerCase()}-${p.periodo ?? "sin-periodo"}-v${versiones.get(p.id) ?? 0}`;

  const downloadTxt = async (p: RegistryIibb) => {
    if (p.filasValidas === 0) return toast.info("El padrón no tiene CUITs cargados.");
    const content = await txtDe(p).catch(() => null);
    if (content)
      downloadBlob(`${nameFile(p)}.txt`, new Blob([content], { type: "text/plain;charset=utf-8" }));
  };

  const downloadZip = async (p: RegistryIibb) => {
    if (p.filasValidas === 0 && p.filasError === 0) return toast.info("El padrón no tiene datos.");
    try {
      const files: { nombre: string; contenido: string }[] = [];
      if (p.filasValidas > 0) {
        const content = await txtDe(p);
        files.push({ nombre: `${nameFile(p)}.txt`, contenido: content });
      }
      if (p.filasError > 0) {
        const errs = await listErrorsRegistry(p.id);
        files.push({
          nombre: `${nameFile(p)}-errores.csv`,
          contenido:
            "\ufeffLínea;Motivo;Contenido\n" +
            errs
              .map((e) =>
                [e.linea, e.motivo, e.contenido]
                  .map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`)
                  .join(";"),
              )
              .join("\n"),
        });
      }
      downloadBlob(`${nameFile(p)}.zip`, createZip(files));
    } catch (e) {
      toast.error(userMessage(e));
    }
  };

  const actions = (p: RegistryIibb) => (
    <div className="flex items-center gap-3 text-xs font-semibold text-primary">
      <button type="button" className="hover:underline" onClick={() => setDetail(p)}>
        Ver
      </button>
      <button type="button" className="hover:underline" onClick={() => void downloadTxt(p)}>
        TXT
      </button>
      <button type="button" className="hover:underline" onClick={() => void downloadZip(p)}>
        ZIP
      </button>
    </div>
  );

  const actionsDetail = (p: RegistryIibb) => (
    <>
      {p.filasError > 0 && (
        <BtnOutline onClick={() => void downloadErrors(p)}>
          <Download size={14} /> Errores
        </BtnOutline>
      )}
      {canEdit && !["Vigente", "Reemplazado"].includes(p.estado) && (
        <BtnOutline
          className="text-red-600"
          onClick={() => {
            setDetail(null);
            void remove(p);
          }}
        >
          Eliminar
        </BtnOutline>
      )}
      {p.estado === "Borrador" && canEdit && (
        <BtnPrimary
          onClick={() => {
            setDetail(null);
            void confirm(p);
          }}
        >
          <CheckCircle2 size={14} /> Confirmar carga
        </BtnPrimary>
      )}
    </>
  );

  return (
    <>
      {q.isError && <p className="mb-3 text-sm text-red-600">{userMessage(q.error)}</p>}
      <DataTable
        columns={columns}
        data={limit ? (q.data ?? []).slice(0, limit) : (q.data ?? [])}
        loading={q.isLoading}
        keyExtractor={(p) => p.id}
        pageSize={limit ?? 10}
        showDownloadButton={false}
        showGlobalFilter={!limit}
        dateFilterColumns={[]}
        emptyMessage={empty}
        actions={actions}
      />
      {detail && (
        <RegistryDetail
          p={detail}
          onClose={() => setDetail(null)}
          acciones={actionsDetail(detail)}
        />
      )}
      {revisar && (
        <TaxModal
          title="Vista previa del padrón"
          subtitle={`${revisar.nombre} · ${revisar.organismo} · ${revisar.archivo}`}
          onClose={() => setRevisar(null)}
          footer={
            <>
              <BtnOutline onClick={() => setRevisar(null)}>Cerrar</BtnOutline>
              <BtnPrimary onClick={() => void confirm(revisar)}>
                <CheckCircle2 size={14} /> Confirmar carga
              </BtnPrimary>
            </>
          }
        >
          <SummaryRegistry p={revisar} />
        </TaxModal>
      )}
    </>
  );
}
