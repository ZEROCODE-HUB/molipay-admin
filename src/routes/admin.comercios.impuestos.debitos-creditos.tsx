import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, PlayCircle, Power, PowerOff, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { WizardModal } from "@/components/wizard-modal";
import { KpiCard } from "@/components/kpi-card";
import { Badge, Input, Label, BtnPrimary, BtnOutline } from "@/components/portal-shell";
import {
  excepcionesIniciales,
  type Excepcion,
  type DireccionExcepcion,
  type Estatus,
  type TipoExcepcion,
} from "@/data/impuestos";

export const Route = createFileRoute("/admin/comercios/impuestos/debitos-creditos")({
  head: () => ({ meta: [{ title: "Débitos y créditos — Admin — Moli" }] }),
  component: Page,
});

function Page() {
  const [data, setData] = useState<Excepcion[]>(excepcionesIniciales);
  const [showAlta, setShowAlta] = useState(false);
  const [alta, setAlta] = useState({
    cuit: "",
    tipo: "Alta manual" as TipoExcepcion,
    direccion: "Ambos" as DireccionExcepcion,
    motivo: "",
    desde: "",
    hasta: "",
  });
  const [showSinRetro, setShowSinRetro] = useState(false);
  const [srForm, setSrForm] = useState({ cuit: "", desde: "", hasta: "" });
  const [srGenerated, setSrGenerated] = useState(false);
  const [confirm, setConfirm] = useState<{ ex: Excepcion; activar: boolean } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const hoy = () => new Date().toISOString().slice(0, 10);

  const altaValida = alta.cuit.trim() !== "" && alta.motivo.trim() !== "";

  const guardarAlta = () => {
    if (!altaValida) return;
    const id = Math.max(0, ...data.map((d) => d.id)) + 1;
    const nueva: Excepcion = {
      id,
      usuario: `u${alta.cuit.replace(/\D/g, "").slice(-6)}`,
      cuit: alta.cuit.trim(),
      tipo: alta.tipo,
      direccion: alta.direccion,
      motivo: alta.motivo.trim(),
      vigenciaDesde: alta.desde || hoy(),
      vigenciaHasta: alta.hasta,
      estado: "Activo",
      fechaCreacion: hoy(),
      autorizacion: `AUT-${String(1000 + id).padStart(4, "0")}`,
    };
    setData((prev) => [nueva, ...prev]);
    setShowAlta(false);
    setBanner(`Alta manual creada correctamente (${nueva.autorizacion}).`);
    setAlta({
      cuit: "",
      tipo: "Alta manual",
      direccion: "Ambos",
      motivo: "",
      desde: "",
      hasta: "",
    });
  };

  const getActions = (ex: Excepcion): ActionItem[] => [
    {
      label: "Activar",
      icon: Power,
      onClick: () => setConfirm({ ex, activar: true }),
    },
    {
      label: "Desactivar",
      icon: PowerOff,
      variant: "danger",
      onClick: () => setConfirm({ ex, activar: false }),
    },
  ];

  const columns: Column<Excepcion>[] = [
    {
      key: "usuario",
      label: "Usuario",
      sortable: true,
      filterable: true,
      render: (r) => r.usuario,
    },
    {
      key: "cuit",
      label: "CUIT",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums text-xs">{r.cuit}</span>,
    },
    {
      key: "direccion",
      label: "Dirección / Tipo",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Entrantes", "Salientes", "Ambos"],
      render: (r) => (
        <div className="flex flex-col">
          <span>{r.direccion}</span>
          <span className="text-xs text-muted-foreground">{r.tipo}</span>
        </div>
      ),
    },
    { key: "motivo", label: "Motivo", sortable: true, filterable: true, render: (r) => r.motivo },
    {
      key: "vigencia",
      label: "Vigencia",
      sortable: true,
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-mono tabular-nums text-xs">{r.vigenciaDesde || "—"}</span>
          <span className="text-xs text-muted-foreground">→ {r.vigenciaHasta || "Abierta"}</span>
        </div>
      ),
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Activo", "Inactivo"],
      render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "neutral"}>{r.estado}</Badge>,
    },
    {
      key: "fechaCreacion",
      label: "Fechas",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.fechaCreacion}</span>,
    },
    {
      key: "autorizacion",
      label: "Autorización",
      render: (r) => <span className="font-mono tabular-nums text-xs">{r.autorizacion}</span>,
    },
  ];

  const srSteps = [
    {
      label: "Configurar",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cargá el CUIT y el rango de fechas del proceso. Esta operación{" "}
            <strong>no tiene efecto retroactivo</strong>: no se reaplicarán cargos previos a la
            fecha de vigencia.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <Label>CUIT</Label>
              <Input
                value={srForm.cuit}
                onChange={(e) => setSrForm({ ...srForm, cuit: e.target.value })}
                placeholder="20-12345678-9"
              />
            </div>
            <div>
              <Label>Fecha desde</Label>
              <Input
                type="date"
                value={srForm.desde}
                onChange={(e) => setSrForm({ ...srForm, desde: e.target.value })}
              />
            </div>
            <div>
              <Label>Fecha hasta</Label>
              <Input
                type="date"
                value={srForm.hasta}
                onChange={(e) => setSrForm({ ...srForm, hasta: e.target.value })}
              />
            </div>
          </div>
          {!srGenerated ? (
            <BtnPrimary onClick={() => setSrGenerated(true)}>Generar preview</BtnPrimary>
          ) : (
            <p className="text-sm font-medium text-emerald-600">
              Preview generado. Usá “Siguiente” para revisar el impacto.
            </p>
          )}
        </div>
      ),
    },
    {
      label: "Revisar impacto",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KpiCard label="Asociaciones analizadas" value={320} />
            <KpiCard label="Cargos históricos revisados" value={1450} />
            <KpiCard label="Impacto esperado" value="8 usuarios / 12 cargos" />
          </div>
          <p className="text-sm text-muted-foreground">
            Este proceso <strong>no persiste cambios</strong> hasta ejecutar la operación
            definitiva.
          </p>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Débitos y créditos"
        description="Excepciones a retenciones y procesos sin efecto retroactivo."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <section className="bg-card border rounded-lg p-5 space-y-4">
          <div>
            <h3 className="font-display font-semibold text-base">Alta manual de excepciones</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Cargá una excepción a las retenciones indicando CUIT, dirección, tipo, motivo y
              vigencia.
            </p>
          </div>
          <BtnPrimary onClick={() => setShowAlta(true)}>
            <Plus size={16} /> Iniciar alta manual
          </BtnPrimary>
        </section>

        <section className="bg-card border rounded-lg p-5 space-y-4">
          <div>
            <h3 className="font-display font-semibold text-base">Sin retroactivo</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ejecutá un proceso sin efecto retroactivo cargando CUIT y fechas, con preview del
              impacto previo a confirmar.
            </p>
          </div>
          <BtnOutline
            onClick={() => {
              setSrGenerated(false);
              setShowSinRetro(true);
            }}
          >
            <PlayCircle size={16} /> Ejecutar sin retroactivo
          </BtnOutline>
        </section>
      </div>

      {banner && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 size={16} /> {banner}
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        pageSize={10}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />

      {showAlta && (
        <FormDialog
          open
          onClose={() => setShowAlta(false)}
          title="Alta manual de excepción"
          description="Definí CUIT, dirección, tipo, motivo y vigencia."
          onSubmit={guardarAlta}
          submitLabel="Crear excepción"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>CUIT</Label>
              <Input
                value={alta.cuit}
                onChange={(e) => setAlta({ ...alta, cuit: e.target.value })}
                placeholder="20-12345678-9"
              />
            </div>
            <div>
              <Label>Dirección</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                value={alta.direccion}
                onChange={(e) =>
                  setAlta({ ...alta, direccion: e.target.value as DireccionExcepcion })
                }
              >
                <option value="Entrantes">Entrantes</option>
                <option value="Salientes">Salientes</option>
                <option value="Ambos">Ambos</option>
              </select>
            </div>
            <div>
              <Label>Tipo</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                value={alta.tipo}
                onChange={(e) => setAlta({ ...alta, tipo: e.target.value as TipoExcepcion })}
              >
                <option value="Alta manual">Alta manual</option>
                <option value="Convenio multilateral">Convenio multilateral</option>
                <option value="Exención">Exención</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label>Motivo</Label>
              <Input
                value={alta.motivo}
                onChange={(e) => setAlta({ ...alta, motivo: e.target.value })}
              />
            </div>
            <div>
              <Label>Vigencia desde</Label>
              <Input
                type="date"
                value={alta.desde}
                onChange={(e) => setAlta({ ...alta, desde: e.target.value })}
              />
            </div>
            <div>
              <Label>Vigencia hasta</Label>
              <Input
                type="date"
                value={alta.hasta}
                onChange={(e) => setAlta({ ...alta, hasta: e.target.value })}
              />
            </div>
          </div>
          {altaValida && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-sm text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 size={16} /> Datos validados correctamente.
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Si no se completa “desde” se usa la fecha actual. Si no se completa “hasta”, la
            excepción queda abierta.
          </p>
        </FormDialog>
      )}

      <WizardModal
        open={showSinRetro}
        onClose={() => setShowSinRetro(false)}
        title="Sin retroactivo"
        steps={srSteps}
        finishLabel="Ejecutar proceso definitivo"
        finishDisabled={!srGenerated}
        onFinish={() => {
          setBanner("Proceso sin retroactivo ejecutado correctamente.");
          setShowSinRetro(false);
          setSrForm({ cuit: "", desde: "", hasta: "" });
        }}
      />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.activar ? "Activar excepción" : "Desactivar excepción"}
        message={`¿Estás seguro de ${confirm?.activar ? "activar" : "desactivar"} la excepción de ${confirm?.ex.usuario}?`}
        confirmLabel={confirm?.activar ? "Activar" : "Desactivar"}
        variant={confirm?.activar ? "default" : "danger"}
        onConfirm={() => {
          if (confirm) {
            const estado: Estatus = confirm.activar ? "Activo" : "Inactivo";
            setData((prev) => prev.map((ex) => (ex.id === confirm.ex.id ? { ...ex, estado } : ex)));
            setBanner(
              `Excepción de ${confirm.ex.usuario} ${confirm.activar ? "activada" : "desactivada"} correctamente.`,
            );
          }
          setConfirm(null);
        }}
      />
    </>
  );
}
