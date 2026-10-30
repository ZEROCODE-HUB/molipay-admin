import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Store, XCircle } from "lucide-react";
import { PageHeader, Badge, BtnOutline, Card } from "@/components/portal-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { DataTable, type Column } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { ComercioPicker, Monto, fecha, errMsg } from "@/components/acreditaciones/comunes";
import { useCan } from "@/lib/permissions";
import { QK_ACRED, TIPO_EXCEPCION_LABEL, listExcepciones, resolverExcepciones, type Excepcion } from "@/lib/api/acreditaciones";

export const Route = createFileRoute("/admin/comercios/link-pago/excepciones")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Excepciones de importación — Links de Pago — Admin — Moli" },
      { name: "description", content: "Renglones del archivo de Payway que no se pudieron asignar o no cuadran." },
    ],
  }),
});

type Accion = "asignar" | "no_corresponde" | "aceptar";

/** Antiguedad en dias habiles (lunes a viernes). */
function diasHabiles(desdeIso: string) {
  const d = new Date(desdeIso);
  const hoy = new Date();
  let n = 0;
  while (d < hoy) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w !== 0 && w !== 6 && d <= hoy) n++;
  }
  return n;
}

function Page() {
  const { can } = useCan();
  const puede = can("modificar", "comercios");
  const qc = useQueryClient();
  const [estado, setEstado] = useState<"abierta" | "resuelta" | "descartada" | "todas">("abierta");
  const [tipo, setTipo] = useState("");
  const [sel, setSel] = useState<Set<string | number>>(new Set());
  const [dialogo, setDialogo] = useState<{ accion: Accion; ids: string[] } | null>(null);

  const q = useQuery({ queryKey: [...QK_ACRED, "excepciones", estado], queryFn: () => listExcepciones({ estado }) });

  const rows = useMemo(
    () => (q.data ?? []).filter((r) => (!tipo || r.tipo === tipo) && (estado === "todas" || r.clase === "aviso" || r.excepcion_estado === estado)),
    [q.data, tipo, estado],
  );
  const key = (r: Excepcion) => `${r.clase}:${r.id}`;
  const seleccion = rows.filter((r) => sel.has(key(r)));
  const tiposSel = new Set(seleccion.map((r) => r.tipo));
  const mismoTipo = tiposSel.size <= 1;

  const abiertas = (q.data ?? []).filter((r) => r.clase === "excepcion" && r.excepcion_estado === "abierta");
  const resumenPorTipo = useMemo(() => {
    const m = new Map<string, { n: number; neto: number }>();
    for (const r of abiertas) {
      const g = m.get(r.tipo) ?? { n: 0, neto: 0 };
      g.n++;
      g.neto += Number(r.total_neto);
      m.set(r.tipo, g);
    }
    return [...m.entries()];
  }, [abiertas]);

  const toggle = (id: string | number) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSel((s) => {
      const visibles = rows.filter((r) => esAccionable(r)).map(key);
      const todos = visibles.every((k) => s.has(k));
      return todos ? new Set() : new Set(visibles);
    });

  const abrir = (accion: Accion, ids: string[]) => setDialogo({ accion, ids });

  const columnas: Column<Excepcion>[] = [
    { key: "fecha", label: "Fecha", render: (r) => <span className="font-mono text-xs">{fecha(r.fecha)}</span> },
    { key: "marca", label: "Bandera", render: (r) => r.marca },
    { key: "establecimiento", label: "Establecimiento", render: (r) => <span className="font-mono text-xs">{r.establecimiento}</span> },
    { key: "total_neto", label: "Neto", render: (r) => <Monto v={r.total_neto} strong /> },
    {
      key: "tipo",
      label: "Tipo de excepción",
      hint: "Establecimiento sin comercio / comercio inactivo: el renglón no se importó. Diferencia con ventas: se importó, pero lo pagado no coincide con las ventas registradas.",
      render: (r) => (
        <div className="leading-tight">
          <Badge tone={r.clase === "aviso" ? "neutral" : "warn"}>{TIPO_EXCEPCION_LABEL[r.tipo] ?? r.tipo}</Badge>
          {r.motivo_excepcion && <div className="text-[10px] text-muted-foreground mt-0.5">{r.motivo_excepcion}</div>}
        </div>
      ),
    },
    { key: "importacion", label: "Importación", render: (r) => <span className="text-xs">{r.importacion?.archivo_nombre ?? "—"}</span> },
    { key: "antiguedad", label: "Antigüedad", hint: "Días hábiles desde la fecha de pago.", render: (r) => <span className="font-mono text-xs">{diasHabiles(r.fecha)} d</span> },
    {
      key: "estado",
      label: "Estado",
      render: (r) =>
        r.clase === "aviso" ? (
          <Badge tone="neutral">Aviso</Badge>
        ) : r.excepcion_estado === "abierta" ? (
          <Badge tone="warn">Abierta</Badge>
        ) : r.excepcion_estado === "resuelta" ? (
          <span title={r.resolucion_motivo ?? undefined}>
            <Badge tone="success">Resuelta</Badge>
          </span>
        ) : (
          <span title={r.resolucion_motivo ?? undefined}>
            <Badge tone="neutral">Descartada</Badge>
          </span>
        ),
    },
  ];

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Excepciones de importación"
        description="Renglones del archivo de Payway que no se pudieron asignar a un comercio o que no cuadran con las ventas. No se acredita nada a ciegas."
        action={
          <Link to="/admin/comercios/link-pago/liquidaciones" className="text-sm font-semibold text-primary hover:underline">
            Cargar liquidaciones
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Excepciones abiertas</div>
          <div className="text-lg font-semibold mt-1">{abiertas.length}</div>
          <div className="text-[11px] text-muted-foreground">
            <Monto v={abiertas.reduce((a, r) => a + Number(r.total_neto), 0)} /> sin asignar
          </div>
        </Card>
        {resumenPorTipo.map(([t, g]) => (
          <Card key={t} className="p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{TIPO_EXCEPCION_LABEL[t] ?? t}</div>
            <div className="text-lg font-semibold mt-1">{g.n}</div>
            <div className="text-[11px] text-muted-foreground">
              <Monto v={g.neto} />
            </div>
          </Card>
        ))}
      </div>

      {q.isError ? (
        <Card className="text-sm text-red-700">{errMsg(q.error)}</Card>
      ) : (
        <DataTable
          columns={columnas}
          data={rows}
          keyExtractor={key}
          loading={q.isLoading}
          pageSize={20}
          showDownloadButton={false}
          selection={puede ? { selected: sel, onToggle: toggle, onToggleAll: toggleAll } : undefined}
          emptyMessage="No hay excepciones con este filtro."
          extraFilters={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={estado}
                onChange={(e) => {
                  setEstado(e.target.value as typeof estado);
                  setSel(new Set());
                }}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="abierta">Abiertas</option>
                <option value="resuelta">Resueltas</option>
                <option value="descartada">Descartadas</option>
                <option value="todas">Todas</option>
              </select>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                <option value="">Todos los tipos</option>
                <option value="excepcion_sin_establecimiento">Establecimiento sin comercio</option>
                <option value="excepcion_comercio_inactivo">Comercio inactivo</option>
                <option value="diferencia_ventas">Diferencia con ventas</option>
              </select>
            </div>
          }
          actions={(r) =>
            !puede || !esAccionable(r) ? null : (
              <div className="flex gap-1">
                {r.clase === "excepcion" ? (
                  <>
                    <BtnOutline className="h-8 text-xs px-2" onClick={() => abrir("asignar", [r.id])}>
                      <Store size={13} /> Asignar
                    </BtnOutline>
                    <BtnOutline className="h-8 text-xs px-2" onClick={() => abrir("no_corresponde", [r.id])}>
                      <XCircle size={13} /> No corresponde
                    </BtnOutline>
                  </>
                ) : (
                  <BtnOutline className="h-8 text-xs px-2" onClick={() => abrir("aceptar", [r.id])}>
                    <CheckCircle2 size={13} /> Aceptar diferencia
                  </BtnOutline>
                )}
              </div>
            )
          }
        />
      )}

      {seleccion.length > 0 && (
        <div className="sticky bottom-3 mt-3 z-10">
          <Card className="p-3 flex flex-wrap items-center justify-between gap-2 shadow-lg">
            <div className="text-sm">
              <span className="font-semibold">{seleccion.length}</span> seleccionada(s) ·{" "}
              <Monto v={seleccion.reduce((a, r) => a + Number(r.total_neto), 0)} />
              {!mismoTipo && <span className="ml-2 text-xs text-red-700">Solo se resuelven juntas excepciones del mismo tipo.</span>}
            </div>
            <div className="flex gap-2">
              {seleccion.every((r) => r.clase === "excepcion") ? (
                <>
                  <BtnOutline disabled={!mismoTipo} onClick={() => abrir("asignar", seleccion.map((r) => r.id))}>
                    Asignar comercio
                  </BtnOutline>
                  <BtnOutline disabled={!mismoTipo} onClick={() => abrir("no_corresponde", seleccion.map((r) => r.id))}>
                    No corresponde
                  </BtnOutline>
                </>
              ) : seleccion.every((r) => r.clase === "aviso") ? (
                <BtnOutline onClick={() => abrir("aceptar", seleccion.map((r) => r.id))}>Aceptar diferencias</BtnOutline>
              ) : (
                <span className="text-xs text-muted-foreground">Mezcla de excepciones y avisos: elegí un solo tipo.</span>
              )}
              <BtnOutline onClick={() => setSel(new Set())}>Limpiar</BtnOutline>
            </div>
          </Card>
        </div>
      )}

      <ResolverDialog
        dialogo={dialogo}
        onClose={() => setDialogo(null)}
        onHecho={() => {
          setDialogo(null);
          setSel(new Set());
          qc.invalidateQueries({ queryKey: QK_ACRED });
        }}
      />
    </PermissionGuard>
  );
}

function esAccionable(r: Excepcion) {
  return r.clase === "aviso" ? r.advertencias.includes("diferencia_ventas") : r.excepcion_estado === "abierta";
}

function ResolverDialog({ dialogo, onClose, onHecho }: { dialogo: { accion: Accion; ids: string[] } | null; onClose: () => void; onHecho: () => void }) {
  const [comercio, setComercio] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const accion = dialogo?.accion;
  const titulo = accion === "asignar" ? "Asignar comercio" : accion === "no_corresponde" ? "Marcar como «No corresponde a MoliPay»" : "Aceptar diferencia con las ventas";

  const enviar = async () => {
    if (!dialogo) return;
    if (accion === "asignar" && !comercio) {
      toast.error("Elegí el comercio.");
      return;
    }
    if (accion !== "asignar" && motivo.trim().length < 3) {
      toast.error("El motivo es obligatorio.");
      return;
    }
    setEnviando(true);
    try {
      const r = await resolverExcepciones({ ids: dialogo.ids, accion: dialogo.accion, comercioId: comercio || null, motivo: motivo.trim() || null });
      toast.success(
        accion === "asignar" ? `${r.resueltos} renglón(es) asignado(s). Se crearon ${r.lotes_creados.length} lote(s) Pendiente.` : `${r.resueltos} renglón(es) resuelto(s).`,
      );
      setComercio("");
      setMotivo("");
      onHecho();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <FormDialog
      open={!!dialogo}
      onClose={onClose}
      title={titulo}
      description={`${dialogo?.ids.length ?? 0} renglón(es) seleccionado(s).`}
      onSubmit={() => void enviar()}
      submitLabel="Confirmar"
      isSubmitting={enviando}
    >
      <div className="space-y-3">
        {accion === "asignar" && (
          <>
            <ComercioPicker value={comercio} onChange={(id) => setComercio(id)} allowEmpty={false} />
            <p className="text-[11px] text-muted-foreground">
              El establecimiento queda guardado en la ficha del comercio: la próxima importación lo reconoce sola.
            </p>
          </>
        )}
        <div>
          <label className="text-xs font-semibold mb-1.5 block">Motivo {accion === "asignar" ? "(opcional)" : "(obligatorio)"}</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder={accion === "aceptar" ? "Ej.: devolución neteada en el día, confirmada con Payway" : ""}
          />
        </div>
      </div>
    </FormDialog>
  );
}
