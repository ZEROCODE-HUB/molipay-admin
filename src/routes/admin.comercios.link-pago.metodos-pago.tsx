import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { CheckCircle, Edit3, Eye, Plus, Trash2, X, XCircle } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import {
  PageHeader,
  Badge,
  BtnOutline,
  BtnPrimary,
  Card,
  Input,
  Label,
} from "@/components/portal-shell";

export const Route = createFileRoute("/admin/comercios/link-pago/metodos-pago")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Métodos de pago — Link de pago — Admin — Moli" },
      { name: "description", content: "Gestión de métodos de pago para link de pago." },
    ],
  }),
});

type Cuota = {
  key: number;
  numero: string;
  ten: string;
  tna: string;
  coeficiente: string;
};

type MetodoPago = {
  id: number;
  nombre: string;
  tipo: string;
  estado: "Activo" | "Inactivo";
  cuotas: Cuota[];
};

const TIPOS = [
  "Tarjeta de débito",
  "Tarjeta prepago",
  "Tarjeta de crédito",
  "Pago Fácil",
  "Rapipago",
];

const ESTADOS = ["Activo", "Inactivo"];

const dataInicial: MetodoPago[] = [
  {
    id: 1,
    nombre: "Visa Débito",
    tipo: "Tarjeta de débito",
    estado: "Activo",
    cuotas: [{ key: 1, numero: "1", ten: "0", tna: "0", coeficiente: "1" }],
  },
  {
    id: 2,
    nombre: "Visa Prepaga",
    tipo: "Tarjeta prepago",
    estado: "Activo",
    cuotas: [{ key: 1, numero: "1", ten: "0", tna: "0", coeficiente: "1" }],
  },
  {
    id: 3,
    nombre: "Mastercard Prepaga",
    tipo: "Tarjeta prepago",
    estado: "Inactivo",
    cuotas: [{ key: 1, numero: "1", ten: "0", tna: "0", coeficiente: "1" }],
  },
  {
    id: 4,
    nombre: "Visa Crédito",
    tipo: "Tarjeta de crédito",
    estado: "Activo",
    cuotas: [
      { key: 1, numero: "1", ten: "0", tna: "0", coeficiente: "1" },
      { key: 2, numero: "2", ten: "0.5", tna: "6", coeficiente: "1.02" },
      { key: 3, numero: "3", ten: "0.8", tna: "9.6", coeficiente: "1.04" },
      { key: 4, numero: "4", ten: "1.1", tna: "13.2", coeficiente: "1.06" },
      { key: 5, numero: "5", ten: "1.4", tna: "16.8", coeficiente: "1.08" },
      { key: 6, numero: "6", ten: "1.7", tna: "20.4", coeficiente: "1.1" },
    ],
  },
  {
    id: 5,
    nombre: "Mastercard Crédito",
    tipo: "Tarjeta de crédito",
    estado: "Activo",
    cuotas: [
      { key: 1, numero: "1", ten: "0", tna: "0", coeficiente: "1" },
      { key: 2, numero: "2", ten: "0.6", tna: "7.2", coeficiente: "1.03" },
      { key: 3, numero: "3", ten: "0.9", tna: "10.8", coeficiente: "1.05" },
    ],
  },
  {
    id: 6,
    nombre: "Mastercard Débito",
    tipo: "Tarjeta de débito",
    estado: "Inactivo",
    cuotas: [{ key: 1, numero: "1", ten: "0", tna: "0", coeficiente: "1" }],
  },
  {
    id: 7,
    nombre: "Pago Fácil",
    tipo: "Pago Fácil",
    estado: "Activo",
    cuotas: [{ key: 1, numero: "1", ten: "0", tna: "0", coeficiente: "1" }],
  },
  {
    id: 8,
    nombre: "Rapipago",
    tipo: "Rapipago",
    estado: "Inactivo",
    cuotas: [{ key: 1, numero: "1", ten: "0", tna: "0", coeficiente: "1" }],
  },
];

function MetodoPagoModal({
  metodo,
  nextId,
  onClose,
  onSave,
}: {
  metodo: MetodoPago | null;
  nextId: number;
  onClose: () => void;
  onSave: (m: MetodoPago) => void;
}) {
  const [nombre, setNombre] = useState(metodo?.nombre ?? "");
  const [tipo, setTipo] = useState(metodo?.tipo ?? TIPOS[0]);
  const [cuotas, setCuotas] = useState<Cuota[]>(
    () => metodo?.cuotas.map((c, i) => ({ ...c, key: i + 1 })) ?? [],
  );
  const keyRef = useRef(cuotas.length + 1);

  const addCuota = () => {
    setCuotas((prev) => [
      ...prev,
      {
        key: keyRef.current++,
        numero: String(prev.length + 1),
        ten: "",
        tna: "",
        coeficiente: "",
      },
    ]);
  };

  const updateCuota = (key: number, field: keyof Cuota, value: string) =>
    setCuotas((prev) => prev.map((c) => (c.key === key ? { ...c, [field]: value } : c)));

  const removeCuota = (key: number) => setCuotas((prev) => prev.filter((c) => c.key !== key));

  const guardar = () => {
    if (nombre.trim() === "") return;
    onSave({
      id: metodo?.id ?? nextId,
      nombre: nombre.trim(),
      tipo,
      estado: metodo?.estado ?? "Activo",
      cuotas: cuotas.map((c) => ({
        key: c.key,
        numero: c.numero,
        ten: c.ten,
        tna: c.tna,
        coeficiente: c.coeficiente,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display text-lg font-semibold">
              {metodo ? "Editar método de pago" : "Crear método de pago"}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {metodo
                ? `Configuración del método de pago "${metodo.nombre}".`
                : "Complete los datos del nuevo método de pago."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Información general
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
              <div>
                <Label htmlFor="mp-id">ID</Label>
                <Input
                  id="mp-id"
                  value={String(metodo?.id ?? nextId)}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="mp-nombre">Nombre</Label>
                <Input
                  id="mp-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Visa Débito"
                />
              </div>
              <div>
                <Label htmlFor="mp-tipo">Tipo</Label>
                <select
                  id="mp-tipo"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Cuotas
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2.5 font-display font-semibold text-foreground">
                      N° de cuota
                    </th>
                    <th className="px-3 py-2.5 font-display font-semibold text-foreground">
                      TEN (%)
                    </th>
                    <th className="px-3 py-2.5 font-display font-semibold text-foreground">
                      TNA (%)
                    </th>
                    <th className="px-3 py-2.5 font-display font-semibold text-foreground">
                      Coeficiente
                    </th>
                    <th className="px-3 py-2.5 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {cuotas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                        Sin cuotas cargadas para este método de pago.
                      </td>
                    </tr>
                  ) : (
                    cuotas.map((c) => (
                      <tr key={c.key} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <Input
                            aria-label="Número de cuota"
                            value={c.numero}
                            onChange={(e) => updateCuota(c.key, "numero", e.target.value)}
                            className="w-20 h-9"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            aria-label="TEN"
                            value={c.ten}
                            onChange={(e) => updateCuota(c.key, "ten", e.target.value)}
                            className="w-28 h-9"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            aria-label="TNA"
                            value={c.tna}
                            onChange={(e) => updateCuota(c.key, "tna", e.target.value)}
                            className="w-28 h-9"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            aria-label="Coeficiente"
                            value={c.coeficiente}
                            onChange={(e) => updateCuota(c.key, "coeficiente", e.target.value)}
                            className="w-28 h-9"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeCuota(c.key)}
                            className="p-1.5 text-red-600 hover:bg-muted rounded-md"
                            title="Eliminar cuota"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={addCuota}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <Plus size={14} /> Agregar cuota
            </button>
          </Card>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-end gap-2">
          <BtnOutline type="button" onClick={onClose}>
            Cancelar
          </BtnOutline>
          <BtnPrimary type="button" onClick={guardar}>
            {metodo ? "Guardar" : "Crear método de pago"}
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const [data, setData] = useState<MetodoPago[]>(dataInicial);
  const [modal, setModal] = useState<{ metodo: MetodoPago | null } | null>(null);

  const toggleEstado = (id: number) =>
    setData((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, estado: d.estado === "Activo" ? "Inactivo" : "Activo" } : d,
      ),
    );

  const getActions = (r: MetodoPago): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setModal({ metodo: r }) },
    { label: "Editar", icon: Edit3, onClick: () => setModal({ metodo: r }) },
    r.estado === "Activo"
      ? {
          label: "Desactivar",
          icon: XCircle,
          variant: "danger",
          onClick: () => toggleEstado(r.id),
        }
      : { label: "Activar", icon: CheckCircle, onClick: () => toggleEstado(r.id) },
  ];

  const columns: Column<MetodoPago>[] = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.id}</span>,
    },
    {
      key: "nombre",
      label: "Nombre",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-semibold">{r.nombre}</span>,
    },
    {
      key: "tipo",
      label: "Tipo",
      sortable: true,
      filterable: "enum",
      filterOptions: TIPOS,
      render: (r) => r.tipo,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      filterable: "enum",
      filterOptions: ESTADOS,
      render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "neutral"}>{r.estado}</Badge>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Métodos de pago"
        description="Gestión de métodos de pago disponibles para link de pago."
        action={
          <BtnPrimary type="button" onClick={() => setModal({ metodo: null })}>
            <Plus size={14} /> Crear método de pago
          </BtnPrimary>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        pageSize={10}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />
      {modal && (
        <MetodoPagoModal
          metodo={modal.metodo}
          nextId={Math.max(0, ...data.map((d) => d.id)) + 1}
          onClose={() => setModal(null)}
          onSave={(m) => {
            setData((prev) =>
              modal.metodo ? prev.map((d) => (d.id === m.id ? m : d)) : [...prev, m],
            );
            setModal(null);
          }}
        />
      )}
    </>
  );
}
