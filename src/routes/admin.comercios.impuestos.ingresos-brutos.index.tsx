import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Eye, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge, Input, Label, BtnPrimary, BtnOutline } from "@/components/portal-shell";
import { FileDropzone } from "@/components/file-dropzone";
import { WizardModal } from "@/components/wizard-modal";
import { KpiCard } from "@/components/kpi-card";
import { padronesIniciales, type Padron, type PadronEstado } from "@/data/impuestos";

const estadoTone: Record<PadronEstado, "success" | "warn" | "danger" | "neutral"> = {
  Cargando: "neutral",
  Procesando: "warn",
  Finalizado: "success",
  Error: "danger",
};

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

export const Route = createFileRoute("/admin/comercios/impuestos/ingresos-brutos/")({
  head: () => ({ meta: [{ title: "Ingresos Brutos — Admin — Moli" }] }),
  component: Page,
});

function Page() {
  const [data, setData] = useState<Padron[]>(padronesIniciales);
  const [impuesto, setImpuesto] = useState("");
  const [nombre, setNombre] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [impuestos] = useState(["Ganancias", "Ingresos Brutos", "Débito/Crédito (Sellos)"]);
  const timers = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  const [showWizard, setShowWizard] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [aplicado, setAplicado] = useState(false);

  useEffect(() => {
    const t = timers.current;
    return () => {
      Object.values(t).forEach((id) => clearInterval(id));
    };
  }, []);

  const cargar = () => {
    if (!impuesto || !nombre.trim() || !file) {
      setError("Completá impuesto, nombre del padrón y seleccioná un archivo.");
      return;
    }
    setError(null);
    const id = Math.max(0, ...data.map((d) => d.id)) + 1;
    setData((prev) => [
      ...prev,
      {
        id,
        impuesto,
        nombre: nombre.trim(),
        archivo: file.name,
        estado: "Procesando",
        progreso: 0,
      },
    ]);
    timers.current[id] = setInterval(() => {
      setData((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const prog = p.progreso + 20;
          if (prog >= 100) {
            clearInterval(timers.current[id]);
            delete timers.current[id];
            return { ...p, progreso: 100, estado: "Finalizado" };
          }
          return { ...p, progreso: prog };
        }),
      );
    }, 350);
    setImpuesto("");
    setNombre("");
    setFile(null);
  };

  const openWizard = (preview: boolean) => {
    setGenerated(preview);
    setShowWizard(true);
  };

  const columns: Column<Padron>[] = [
    { key: "id", label: "ID", render: (r) => <span className="font-mono text-xs">#{r.id}</span> },
    {
      key: "impuesto",
      label: "Impuesto",
      sortable: true,
      filterable: true,
      render: (r) => r.impuesto,
    },
    {
      key: "nombre",
      label: "Nombre del padrón",
      sortable: true,
      filterable: true,
      render: (r) => r.nombre,
    },
    {
      key: "archivo",
      label: "Archivo",
      render: (r) => <span className="font-mono text-xs">{r.archivo}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Cargando", "Procesando", "Finalizado", "Error"],
      render: (r) => <Badge tone={estadoTone[r.estado]}>{r.estado}</Badge>,
    },
    {
      key: "progreso",
      label: "Procesamiento",
      render: (r) => (
        <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${r.progreso}%` }}
          />
        </div>
      ),
    },
  ];

  const columnsCreados: Column<ImpuestoCreado>[] = [
    {
      key: "cuit",
      label: "CUIT",
      render: (r) => <span className="font-mono tabular-nums text-xs">{r.cuit}</span>,
    },
    { key: "impuesto", label: "Impuesto", render: (r) => r.impuesto },
    {
      key: "tasa",
      label: "Tasa",
      render: (r) => <span className="font-mono tabular-nums">{r.tasa}</span>,
    },
    { key: "usuario", label: "Usuario", render: (r) => r.usuario },
  ];

  const columnsDesactivados: Column<ImpuestoDesactivado>[] = [
    {
      key: "cuit",
      label: "CUIT",
      render: (r) => <span className="font-mono tabular-nums text-xs">{r.cuit}</span>,
    },
    { key: "impuesto", label: "Impuesto", render: (r) => r.impuesto },
    {
      key: "tasa",
      label: "Tasa",
      render: (r) => <span className="font-mono tabular-nums">{r.tasa}</span>,
    },
    { key: "usuario", label: "Usuario", render: (r) => r.usuario },
    { key: "motivo", label: "Motivo", render: (r) => r.motivo },
  ];

  const columnsOmitidos: Column<Omitido>[] = [
    {
      key: "cuit",
      label: "CUIT",
      render: (r) => <span className="font-mono tabular-nums text-xs">{r.cuit}</span>,
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
            <BtnPrimary onClick={() => setGenerated(true)}>Generar preview</BtnPrimary>
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
        title="Ingresos Brutos"
        description="Gestión de padrones y normalización retroactiva de asignaciones de impuestos."
      />

      <div className="grid gap-6">
        <section className="bg-card border rounded-lg overflow-hidden">
          <header className="px-5 py-4 border-b">
            <h3 className="font-display font-semibold text-base">Gestión de Padrones</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Cargá un padrón para un impuesto determinado y seguí el estado de procesamiento en
              tiempo real.
            </p>
          </header>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Impuesto</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  value={impuesto}
                  onChange={(e) => setImpuesto(e.target.value)}
                >
                  <option value="">Seleccionar…</option>
                  {impuestos.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Nombre del padrón</Label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Padrón CABA Q3"
                />
              </div>
            </div>
            <div>
              <Label>Archivo</Label>
              <FileDropzone onFile={setFile} accept=".xlsx,.xls,.csv" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end">
              <BtnPrimary onClick={cargar}>Cargar padrón</BtnPrimary>
            </div>
          </div>
          <div className="px-5 pb-5">
            <DataTable columns={columns} data={data} keyExtractor={(r) => r.id} pageSize={10} />
          </div>
        </section>

        <section className="bg-card border rounded-lg p-5 space-y-4">
          <div>
            <h3 className="font-display font-semibold text-base">Normalización retroactiva</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Revisión histórica de las asignaciones de impuestos. Generá un preview y revisá el
              impacto antes de aplicar los cambios definitivos.
            </p>
          </div>

          {aplicado && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-sm text-emerald-800 dark:text-emerald-300">
              La normalización fue aplicada correctamente.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <BtnOutline onClick={() => openWizard(false)}>
              <Eye size={16} /> Ver preview
            </BtnOutline>
            <BtnPrimary onClick={() => openWizard(true)}>
              <PlayCircle size={16} /> Aplicar
            </BtnPrimary>
          </div>
        </section>
      </div>

      <WizardModal
        open={showWizard}
        onClose={() => setShowWizard(false)}
        title="Normalización retroactiva"
        steps={steps}
        finishLabel="Aplicar normalización"
        finishDisabled={!generated}
        onFinish={() => {
          setAplicado(true);
          setShowWizard(false);
        }}
      />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}
