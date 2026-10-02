import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
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
import { listBanderas, createBandera, updateBandera, deleteBandera, listCuotasByBandera, createBanderaCuota, updateBanderaCuota, deleteBanderaCuota, type Bandera, type BanderaCuota } from "@/lib/api/banderas";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/comercios/gestion/metodos-pago")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Métodos de pago — Gestión — Admin — Moli" },
      { name: "description", content: "Gestión de métodos de pago para comercios." },
    ],
  }),
});

const TIPOS_METODO = [
  "Tarjeta de crédito",
  "Tarjeta de débito",
  "Tarjeta prepago",
  "Pago Fácil",
  "Rapipago",
];

const ESTADOS = ["Activo", "Inactivo"];

type MetodoPagoForm = {
  id?: string;
  nombre: string;
  tipo: string;
  diasHabiles: number;
  estado: string;
  cuotas: Array<{ key: number; numero: string; ten: string; coeficiente: string }>;
};

function MetodoPagoModal({
  metodo,
  onClose,
  onSave,
  onDelete,
}: {
  metodo: Bandera | null;
  onClose: () => void;
  onSave: (m: MetodoPagoForm) => void;
  onDelete?: () => void;
}) {
  const [nombre, setNombre] = useState(metodo?.nombre ?? "");
  const [tipo, setTipo] = useState(metodo?.tipo ?? TIPOS_METODO[0]);
  const [diasHabiles, setDiasHabiles] = useState(metodo?.diasHabilesAcreditacion ?? 1);
  const [estado, setEstado] = useState(metodo?.estado ?? "Activo");
  const [cuotas, setCuotas] = useState<MetodoPagoForm["cuotas"]>([]);
  const [loadingCuotas, setLoadingCuotas] = useState(false);
  const keyRef = useRef(1);

  useEffect(() => {
    if (metodo) {
      setLoadingCuotas(true);
      listCuotasByBandera(metodo.id)
        .then((cq) => {
          setCuotas(cq.map((c, i) => ({
            key: i + 1,
            numero: String(c.cuotas),
            ten: String(c.ten),
            coeficiente: String(c.coeficiente),
          })));
        })
        .finally(() => setLoadingCuotas(false));
    }
  }, [metodo]);

  const addCuota = () => {
    setCuotas((prev) => [
      ...prev,
      { key: keyRef.current++, numero: String(prev.length + 1), ten: "0", coeficiente: "1" },
    ]);
  };

  const updateCuota = (key: number, field: string, value: string) =>
    setCuotas((prev) => prev.map((c) => (c.key === key ? { ...c, [field]: value } : c)));

  const removeCuota = (key: number) => setCuotas((prev) => prev.filter((c) => c.key !== key));

  const guardar = () => {
    if (nombre.trim() === "") {
      toast.error("El nombre es requerido");
      return;
    }
    onSave({
      id: metodo?.id,
      nombre: nombre.trim(),
      tipo,
      diasHabiles,
      estado,
      cuotas,
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
              {metodo ? `Configuración del método de pago "${metodo.nombre}".` : "Complete los datos del nuevo método de pago."}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-4">
              <div>
                <Label htmlFor="mp-id">ID</Label>
                <Input id="mp-id" value={metodo?.id ?? "—"} readOnly className="bg-muted" />
              </div>
              <div>
                <Label htmlFor="mp-nombre">Nombre</Label>
                <Input id="mp-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Visa Débito" />
              </div>
              <div>
                <Label htmlFor="mp-tipo">Tipo</Label>
                <select
                  id="mp-tipo"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  {TIPOS_METODO.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="mp-dias">Días hábiles acreditación</Label>
                <Input id="mp-dias" type="number" min={1} value={diasHabiles} onChange={(e) => setDiasHabiles(Number(e.target.value))} />
              </div>
            </div>
            {metodo && (
              <div className="mt-4">
                <Label htmlFor="mp-estado">Estado</Label>
                <select
                  id="mp-estado"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Cuotas
            </h4>
            {loadingCuotas ? (
              <div className="text-center py-4 text-muted-foreground">Cargando cuotas...</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        <th className="px-3 py-2.5 font-display font-semibold text-foreground">N° de cuota</th>
                        <th className="px-3 py-2.5 font-display font-semibold text-foreground">TEN (%)</th>
                        <th className="px-3 py-2.5 font-display font-semibold text-foreground">Coeficiente</th>
                        <th className="px-3 py-2.5 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {cuotas.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                            Sin cuotas cargadas para este método de pago.
                          </td>
                        </tr>
                      ) : (
                        cuotas.map((c) => (
                          <tr key={c.key} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              <Input aria-label="Número de cuota" value={c.numero} onChange={(e) => updateCuota(c.key, "numero", e.target.value)} className="w-20 h-9" />
                            </td>
                            <td className="px-3 py-2">
                              <Input aria-label="TEN" value={c.ten} onChange={(e) => updateCuota(c.key, "ten", e.target.value)} className="w-28 h-9" />
                            </td>
                            <td className="px-3 py-2">
                              <Input aria-label="Coeficiente" value={c.coeficiente} onChange={(e) => updateCuota(c.key, "coeficiente", e.target.value)} className="w-28 h-9" />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button type="button" onClick={() => removeCuota(c.key)} className="p-1.5 text-red-600 hover:bg-muted rounded-md" title="Eliminar cuota">
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={addCuota} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                  <Plus size={14} /> Agregar cuota
                </button>
              </>
            )}
          </Card>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-between gap-2">
          <div>
            {metodo && onDelete && (
              <BtnOutline type="button" onClick={onDelete} className="text-red-600 hover:bg-red-50">
                Eliminar
              </BtnOutline>
            )}
          </div>
          <div className="flex gap-2">
            <BtnOutline type="button" onClick={onClose}>Cancelar</BtnOutline>
            <BtnPrimary type="button" onClick={guardar}>{metodo ? "Guardar" : "Crear método de pago"}</BtnPrimary>
          </div>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const [data, setData] = useState<Bandera[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ metodo: Bandera | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Bandera | null>(null);

  useEffect(() => {
    listBanderas()
      .then(setData)
      .catch(() => toast.error("Error cargando métodos de pago"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (m: MetodoPagoForm) => {
    try {
      if (m.id) {
        const updated = await updateBandera(m.id, {
          nombre: m.nombre,
          tipo: m.tipo,
          diasHabilesAcreditacion: m.diasHabiles,
          estado: m.estado as "Activo" | "Inactivo",
        });
        setData((prev) => prev.map((d) => (d.id === m.id ? updated : d)));
        toast.success("Método de pago actualizado");
      } else {
        const created = await createBandera({
          nombre: m.nombre,
          tipo: m.tipo,
          diasHabilesAcreditacion: m.diasHabiles,
        });
        setData((prev) => [...prev, created]);
        toast.success("Método de pago creado");
      }
      setModal(null);
    } catch {
      toast.error("Error al guardar método de pago");
    }
  };

  const handleDelete = async (b: Bandera) => {
    try {
      await deleteBandera(b.id);
      setData((prev) => prev.filter((d) => d.id !== b.id));
      setConfirmDelete(null);
      setModal(null);
      toast.success("Método de pago eliminado");
    } catch {
      toast.error("Error al eliminar método de pago");
    }
  };

  const getActions = (r: Bandera): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setModal({ metodo: r }) },
    { label: "Editar", icon: Edit3, onClick: () => setModal({ metodo: r }) },
  ];

  const columns: Column<Bandera>[] = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.id.slice(0, 8)}</span>,
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
      filterOptions: TIPOS_METODO,
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
    {
      key: "diasHabiles",
      label: "Días háb.",
      sortable: true,
      render: (r) => <span className="font-mono">{r.diasHabilesAcreditacion}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Métodos de pago"
        description="Gestión de métodos de pago disponibles para comercios."
        action={
          <BtnPrimary type="button" onClick={() => setModal({ metodo: null })}>
            <Plus size={14} /> Crear método de pago
          </BtnPrimary>
        }
      />
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Cargando métodos de pago...</div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(r) => r.id}
          pageSize={10}
          actions={(r) => <ActionsDropdown actions={getActions(r)} />}
        />
      )}
      {modal && (
        <MetodoPagoModal
          metodo={modal.metodo}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={modal.metodo ? () => setConfirmDelete(modal.metodo) : undefined}
        />
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-card rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="font-display text-lg font-semibold">¿Eliminar método de pago?</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Esta acción no se puede deshacer. Se eliminarán también las cuotas asociadas.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <BtnOutline onClick={() => setConfirmDelete(null)}>Cancelar</BtnOutline>
              <BtnPrimary onClick={() => handleDelete(confirmDelete)} className="bg-red-600 hover:bg-red-700">Eliminar</BtnPrimary>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
