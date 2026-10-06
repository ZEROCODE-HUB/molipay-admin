import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Save, ShieldAlert, Plus, Eye, Edit3 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { BtnPrimary } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/general/alertas/parametros-bloqueos")({
  head: () => ({ meta: [{ title: "Parámetros de bloqueos — Admin Panel" }] }),
  component: Page,
});

type UsuarioParam = {
  legajo: string;
  usuario: string;
  persona: string;
  empresa: string;
};

const initialUsuarios: UsuarioParam[] = [
  { legajo: "LPF-27678901234", usuario: "jperez@empresa.com", persona: "15", empresa: "50" },
  { legajo: "LPF-20789012345", usuario: "mgarcia@corp.com", persona: "10", empresa: "40" },
  { legajo: "LPF-27890123456", usuario: "clopez@firm.com", persona: "12", empresa: "45" },
];

function UsuarioParamFields({
  param,
  onChange,
}: {
  param: UsuarioParam;
  onChange: (p: UsuarioParam) => void;
}) {
  const set = (patch: Partial<UsuarioParam>) => onChange({ ...param, ...patch });
  const inputCls =
    "w-full h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Legajo</label>
        <input
          value={param.legajo}
          onChange={(e) => set({ legajo: e.target.value })}
          className={inputCls}
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">
          Usuario (correo)
        </label>
        <input
          value={param.usuario}
          onChange={(e) => set({ usuario: e.target.value })}
          className={inputCls}
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">
          Salarios mínimos por persona
        </label>
        <input
          type="number"
          value={param.persona}
          onChange={(e) => set({ persona: e.target.value })}
          className={inputCls}
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">
          Salarios mínimos por empresa
        </label>
        <input
          type="number"
          value={param.empresa}
          onChange={(e) => set({ empresa: e.target.value })}
          className={inputCls}
        />
      </div>
    </div>
  );
}

function Page() {
  const [params, setParams] = useState({
    salarios_minimos_persona: "15",
    salarios_minimos_empresa: "50",
  });
  const [usuarios, setUsuarios] = useState(initialUsuarios);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<UsuarioParam>({
    legajo: "",
    usuario: "",
    persona: "",
    empresa: "",
  });
  const [viewing, setViewing] = useState<UsuarioParam | null>(null);
  const [editing, setEditing] = useState<UsuarioParam | null>(null);

  const getActions = (r: UsuarioParam): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setViewing({ ...r }) },
    { label: "Editar", icon: Edit3, onClick: () => setEditing({ ...r }) },
  ];

  const columns: Column<UsuarioParam>[] = [
    {
      key: "legajo",
      label: "Legajo",
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums text-xs">{r.legajo}</span>,
    },
    { key: "usuario", label: "Usuario (correo)", filterable: true, render: (r) => r.usuario },
    {
      key: "persona",
      label: "Cantidad de salarios mínimos depositados por persona",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.persona}</span>,
    },
    {
      key: "empresa",
      label: "Cantidad de salarios mínimos depositados por empresa",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums">{r.empresa}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Parámetros de bloqueos"
        description="Umbrales que activan bloqueo automático de cuenta hasta revisión de compliance"
      />

      <div className="bg-moli-red-light border border-moli-red/20 rounded-lg p-4 mb-6 flex gap-3 max-w-2xl">
        <ShieldAlert size={18} className="text-moli-red shrink-0 mt-0.5" />
        <div className="text-sm text-moli-red-dark">
          <strong>Importante:</strong> Un <strong>bloqueo</strong> suspende la cuenta
          automáticamente al cumplirse el umbral. La cuenta queda bloqueada hasta que compliance la
          revise y la reactive manualmente.
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">
          Parámetros generales de bloqueos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Cantidad de salarios mínimos depositados por persona
            </label>
            <input
              type="number"
              value={params.salarios_minimos_persona}
              onChange={(e) =>
                setParams((p) => ({ ...p, salarios_minimos_persona: e.target.value }))
              }
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Si una persona física supera este acumulado de depósitos, la cuenta se bloquea
              automáticamente.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Cantidad de salarios mínimos depositados por empresa
            </label>
            <input
              type="number"
              value={params.salarios_minimos_empresa}
              onChange={(e) =>
                setParams((p) => ({ ...p, salarios_minimos_empresa: e.target.value }))
              }
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Si una persona jurídica supera este acumulado de depósitos, la cuenta se bloquea
              automáticamente.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button className="inline-flex items-center gap-2 h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
            <Save size={14} /> Guardar configuración
          </button>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">
              Parámetros de usuarios
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Umbrales de depósitos configurados individualmente por usuario
            </p>
          </div>
          <BtnPrimary
            onClick={() => {
              setDraft({ legajo: "", usuario: "", persona: "", empresa: "" });
              setAdding(true);
            }}
          >
            <Plus size={14} /> Agregar nuevos parámetros de usuario
          </BtnPrimary>
        </div>
        <DataTable
          columns={columns}
          data={usuarios}
          keyExtractor={(r) => r.legajo}
          actions={(r) => <ActionsDropdown actions={getActions(r)} />}
        />
      </div>

      {adding && (
        <FormDialog
          open={adding}
          onClose={() => setAdding(false)}
          title="Agregar nuevos parámetros de usuario"
          description="Configure umbrales de depósitos para un usuario"
          onSubmit={() => {
            setUsuarios((prev) => [...prev, draft]);
            setAdding(false);
          }}
          submitLabel="Agregar"
        >
          <UsuarioParamFields param={draft} onChange={setDraft} />
        </FormDialog>
      )}

      {viewing && (
        <FormDialog
          open={!!viewing}
          onClose={() => setViewing(null)}
          title="Detalle de parámetros de usuario"
          description={`Parámetros de ${viewing.usuario}`}
          onSubmit={() => setViewing(null)}
          submitLabel="Cerrar"
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Legajo:</span>{" "}
              <span className="font-mono tabular-nums font-medium">{viewing.legajo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Usuario:</span>{" "}
              <span className="font-medium">{viewing.usuario}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Salarios mínimos por persona:</span>{" "}
              <span className="font-mono tabular-nums font-medium">{viewing.persona}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Salarios mínimos por empresa:</span>{" "}
              <span className="font-mono tabular-nums font-medium">{viewing.empresa}</span>
            </div>
          </div>
        </FormDialog>
      )}

      {editing && (
        <FormDialog
          open={!!editing}
          onClose={() => setEditing(null)}
          title="Editar parámetros de usuario"
          description={`Editando parámetros de ${editing.usuario}`}
          onSubmit={() => {
            setUsuarios((prev) => prev.map((u) => (u.legajo === editing.legajo ? editing : u)));
            setEditing(null);
          }}
          submitLabel="Guardar cambios"
        >
          <UsuarioParamFields param={editing} onChange={setEditing} />
        </FormDialog>
      )}
    </>
  );
}
