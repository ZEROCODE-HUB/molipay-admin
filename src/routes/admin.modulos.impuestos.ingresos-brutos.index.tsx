import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge, Input, Label, BtnPrimary } from "@/components/portal-shell";
import { FileDropzone } from "@/components/file-dropzone";
import { padronesIniciales, type Padron, type PadronEstado } from "@/data/impuestos";

const estadoTone: Record<PadronEstado, "success" | "warn" | "danger" | "neutral"> = {
  Cargando: "neutral",
  Procesando: "warn",
  Finalizado: "success",
  Error: "danger",
};

export const Route = createFileRoute("/admin/modulos/impuestos/ingresos-brutos/")({
  head: () => ({ meta: [{ title: "Gestión de Padrones — Admin — Moli" }] }),
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

  return (
    <>
      <PageHeader
        title="Gestión de Padrones"
        description="Cargá un padrón para un impuesto determinado y seguí el estado de procesamiento en tiempo real."
      />

      <div className="bg-card border rounded-lg p-5 space-y-4 max-w-2xl mb-6">
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

      <DataTable columns={columns} data={data} keyExtractor={(r) => r.id} pageSize={10} />
    </>
  );
}
