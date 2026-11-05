import { useState } from "react";
import { Plus,Edit3,Trash2 } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { FormDialog } from "@/shared/ui/form-dialog";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { ActionsDropdown,type ActionItem } from "@/shared/ui/actions-dropdown";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { Badge } from "@/shared/ui/badge";

const KINDS = [
  "Todos",
  "Login",
  "Registro",
  "Deposito",
  "Retiro",
  "Transferencia interna",
  "Comprar",
] as const;

type Block = {
  id: number;
  tipo: string;
  usuario: string;
  correo: string;
  fecha: string;
};

let seq = 4;

const initial: Block[] = [
  {
    id: 1,
    tipo: "Deposito",
    usuario: "Todos",
    correo: "—",
    fecha: "2026-07-21 10:14",
  },
  {
    id: 2,
    tipo: "Login",
    usuario: "ana.martinez@cliente.com",
    correo: "ana.martinez@cliente.com",
    fecha: "2026-07-22 16:40",
  },
  {
    id: 3,
    tipo: "Retiro",
    usuario: "carlos.lopez@cliente.com",
    correo: "carlos.lopez@cliente.com",
    fecha: "2026-07-23 09:05",
  },
  {
    id: 4,
    tipo: "Todos",
    usuario: "Todos",
    correo: "—",
    fecha: "2026-07-24 08:30",
  },
];

type FormState = {
  tipo: string;
  aplicaA: "Todos" | "Usuario";
  email: string;
};

const emptyForm: FormState = { tipo: "Todos", aplicaA: "Todos", email: "" };

export function SupportLockPage() {
  const [data, setData] = useState(initial);
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<Block | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirm, setConfirm] = useState<Block | null>(null);

  const openNew = () => {
    setForm(emptyForm);
    setShowNew(true);
  };

  const openEdit = (b: Block) => {
    setForm({
      tipo: b.tipo,
      aplicaA: b.usuario === "Todos" ? "Todos" : "Usuario",
      email: b.usuario === "Todos" ? "" : b.usuario,
    });
    setEditTarget(b);
  };

  const persist = () => {
    const esAll = form.aplicaA === "Todos";
    const user = esAll ? "Todos" : form.email.trim();
    const email = esAll ? "—" : form.email.trim();
    const now = new Date().toISOString().slice(0, 16).replace("T", " ");

    if (!esAll && !form.email.trim()) return;

    if (editTarget) {
      setData((prev) =>
        prev.map((b) =>
          b.id === editTarget.id ? { ...b, tipo: form.tipo, usuario: user, correo: email } : b,
        ),
      );
    } else {
      setData((prev) => [
        { id: ++seq, tipo: form.tipo, usuario: user, correo: email, fecha: now },
        ...prev,
      ]);
    }
    setShowNew(false);
    setEditTarget(null);
  };

  const getActions = (b: Block): ActionItem[] => [
    { label: "Editar", icon: Edit3, onClick: () => openEdit(b) },
    {
      label: "Borrar",
      icon: Trash2,
      variant: "danger",
      onClick: () => setConfirm(b),
    },
  ];

  const columns: Column<Block>[] = [
    {
      key: "tipo",
      label: "Tipo de bloqueo",
      sortable: true,
      filterable: "enum",
      filterOptions: [...KINDS],
      render: (b) => <Badge tone="danger">{b.tipo}</Badge>,
    },
    {
      key: "usuario",
      label: "Usuario",
      sortable: true,
      filterable: true,
      render: (b) => b.usuario,
    },
    { key: "correo", label: "Correo", sortable: true, filterable: true, render: (b) => b.correo },
    {
      key: "fecha",
      label: "Fecha del bloqueo",
      sortable: true,
      filterable: "date",
      render: (b) => <span className="font-mono tabular-nums">{b.fecha}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Bloqueo de funciones"
        description="Gestioná los bloqueos de funcionalidades por usuario o globales"
        action={
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            <Plus size={14} /> Nuevo bloqueo
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(b) => b.id}
        pageSize={10}
        actions={(b) => <ActionsDropdown actions={getActions(b)} />}
      />

      <FormDialog
        open={showNew || !!editTarget}
        onClose={() => {
          setShowNew(false);
          setEditTarget(null);
        }}
        title={editTarget ? "Editar bloqueo" : "Nuevo bloqueo"}
        description={
          editTarget ? "Modificá los datos del bloqueo" : "Configurá un nuevo bloqueo de función"
        }
        onSubmit={persist}
        submitLabel={editTarget ? "Guardar cambios" : "Crear bloqueo"}
      >
        <div>
          <Label>Tipo de bloqueo</Label>
          <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            {KINDS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>A quién se aplica</Label>
          <Select
            value={form.aplicaA}
            onChange={(e) => setForm({ ...form, aplicaA: e.target.value as FormState["aplicaA"] })}
          >
            <option value="Todos">Todos</option>
            <option value="Usuario">Usuario</option>
          </Select>
        </div>

        {form.aplicaA === "Usuario" && (
          <div>
            <Label>Email del usuario</Label>
            <Input
              type="email"
              placeholder="usuario@cliente.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Borrar bloqueo"
        message={`¿Estás seguro de borrar el bloqueo "${confirm?.tipo}"${
          confirm?.usuario !== "Todos" ? ` de ${confirm?.usuario}` : ""
        }?`}
        confirmLabel="Borrar"
        variant="danger"
        onConfirm={() => {
          if (confirm) setData((prev) => prev.filter((b) => b.id !== confirm.id));
          setConfirm(null);
        }}
      />
    </>
  );
}
