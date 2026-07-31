import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { WizardModal } from "@/components/wizard-modal";
import { KpiCard } from "@/components/kpi-card";
import { DataTable, type Column } from "@/components/data-table";
import { Badge, BtnPrimary } from "@/components/portal-shell";

type PreviewKPIs = {
  usuariosAnalizados: number;
  impuestosRevisados: number;
  impuestosCreados: number;
  impuestosDesactivados: number;
  cargosAjustados: number;
  registrosOmitidos: number;
  errores: number;
  diferencias: string;
};

type ImpuestoCreado = { cuit: string; impuesto: string; tasa: string; usuario: string };
type ImpuestoDesactivado = {
  cuit: string;
  impuesto: string;
  tasa: string;
  usuario: string;
  motivo: string;
};
type Omitido = { cuit: string; motivo: string; usuario: string };

const kpisMock: PreviewKPIs = {
  usuariosAnalizados: 1240,
  impuestosRevisados: 58,
  impuestosCreados: 12,
  impuestosDesactivados: 3,
  cargosAjustados: 940,
  registrosOmitidos: 7,
  errores: 1,
  diferencias: "$ 12.450",
};

const creadosMock: ImpuestoCreado[] = [
  { cuit: "20-12345678-9", impuesto: "Ingresos Brutos", tasa: "4%", usuario: "jperez" },
  { cuit: "27-87654321-0", impuesto: "Ganancias", tasa: "35%", usuario: "cgomez" },
  { cuit: "23-11223344-5", impuesto: "Ingresos Brutos", tasa: "3.6%", usuario: "lcastro" },
];

const desactivadosMock: ImpuestoDesactivado[] = [
  {
    cuit: "30-99888777-6",
    impuesto: "Débito/Crédito (Sellos)",
    tasa: "0,6%",
    usuario: "comercio_x",
    motivo: "Cierre de actividad",
  },
  {
    cuit: "33-44556677-8",
    impuesto: "Ingresos Brutos",
    tasa: "4%",
    usuario: "comercio_y",
    motivo: "Exento definitivo",
  },
];

const omitidosMock: Omitido[] = [
  { cuit: "20-22223333-4", motivo: "CUIT inexistente", usuario: "usuario_a" },
  { cuit: "27-55556666-7", motivo: "Sin coincidencia de padrón", usuario: "usuario_b" },
  { cuit: "23-88889999-0", motivo: "Ya posee impuesto activo", usuario: "usuario_c" },
];

export const Route = createFileRoute("/admin/modulos/impuestos/ingresos-brutos/normalizacion")({
  head: () => ({ meta: [{ title: "Normalización Retroactiva — Admin — Moli" }] }),
  component: Page,
});

function Page() {
  const [show, setShow] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [aplicado, setAplicado] = useState(false);

  const generar = () => setGenerated(true);

  const columnsCreados: Column<ImpuestoCreado>[] = [
    {
      key: "cuit",
      label: "CUIT",
      render: (r) => <span className="font-mono text-xs">{r.cuit}</span>,
    },
    { key: "impuesto", label: "Impuesto", render: (r) => r.impuesto },
    { key: "tasa", label: "Tasa", render: (r) => r.tasa },
    { key: "usuario", label: "Usuario", render: (r) => r.usuario },
  ];

  const columnsDesactivados: Column<ImpuestoDesactivado>[] = [
    {
      key: "cuit",
      label: "CUIT",
      render: (r) => <span className="font-mono text-xs">{r.cuit}</span>,
    },
    { key: "impuesto", label: "Impuesto", render: (r) => r.impuesto },
    { key: "tasa", label: "Tasa", render: (r) => r.tasa },
    { key: "usuario", label: "Usuario", render: (r) => r.usuario },
    { key: "motivo", label: "Motivo", render: (r) => r.motivo },
  ];

  const columnsOmitidos: Column<Omitido>[] = [
    {
      key: "cuit",
      label: "CUIT",
      render: (r) => <span className="font-mono text-xs">{r.cuit}</span>,
    },
    { key: "motivo", label: "Motivo", render: (r) => r.motivo },
    { key: "usuario", label: "Usuario", render: (r) => r.usuario },
  ];

  const steps = [
    {
      label: "Generar preview",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esta revisión histórica evalúa las asignaciones de impuestos antes de aplicar cambios.
            No se modifica ningún dato hasta confirmar la aplicación.
          </p>
          {!generated ? (
            <BtnPrimary onClick={generar}>Generar preview</BtnPrimary>
          ) : (
            <p className="text-sm font-medium text-emerald-600">
              Preview generado. Usá “Siguiente” para revisar los resultados.
            </p>
          )}
        </div>
      ),
    },
    {
      label: "Revisar",
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Usuarios analizados" value={kpisMock.usuariosAnalizados} />
            <KpiCard label="Impuestos revisados" value={kpisMock.impuestosRevisados} />
            <KpiCard label="Impuestos creados" value={kpisMock.impuestosCreados} />
            <KpiCard label="Impuestos desactivados" value={kpisMock.impuestosDesactivados} />
            <KpiCard label="Cargos ajustados" value={kpisMock.cargosAjustados} />
            <KpiCard label="Registros omitidos" value={kpisMock.registrosOmitidos} />
            <KpiCard label="Errores" value={kpisMock.errores} />
            <KpiCard label="Diferencias" value={kpisMock.diferencias} />
          </div>

          <Section title="Impuestos creados">
            <DataTable
              columns={columnsCreados}
              data={creadosMock}
              keyExtractor={(r) => r.cuit}
              pageSize={5}
            />
          </Section>
          <Section title="Impuestos desactivados">
            <DataTable
              columns={columnsDesactivados}
              data={desactivadosMock}
              keyExtractor={(r) => r.cuit}
              pageSize={5}
            />
          </Section>
          <Section title="Omitidos">
            <DataTable
              columns={columnsOmitidos}
              data={omitidosMock}
              keyExtractor={(r) => r.cuit}
              pageSize={5}
            />
          </Section>
        </div>
      ),
    },
    {
      label: "Confirmar",
      content: (
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Al aplicar se ejecutarán {kpisMock.impuestosCreados} altas,{" "}
            {kpisMock.impuestosDesactivados} bajas y {kpisMock.cargosAjustados} ajustes de cargos.
          </p>
          <Badge tone={aplicado ? "success" : "warn"}>
            {aplicado ? "Aplicado" : "Pendiente de aplicación"}
          </Badge>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Normalización Retroactiva"
        description="Ejecutá una revisión histórica antes de aplicar cambios en las asignaciones de impuestos."
      />

      {aplicado && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-sm text-emerald-800 dark:text-emerald-300">
          La normalización fue aplicada correctamente.
        </div>
      )}

      <button
        onClick={() => {
          setGenerated(false);
          setShow(true);
        }}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
      >
        Generar preview de normalización
      </button>

      <WizardModal
        open={show}
        onClose={() => setShow(false)}
        title="Normalización Retroactiva"
        steps={steps}
        finishLabel="Aplicar normalización"
        finishDisabled={!generated}
        onFinish={() => {
          setAplicado(true);
          setShow(false);
        }}
      />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}
