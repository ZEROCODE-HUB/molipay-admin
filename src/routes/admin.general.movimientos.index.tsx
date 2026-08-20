import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, FilterX, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { MovimientoDetail, estadoBadge, type Movimiento } from "@/components/movimiento-detail";
import { LegajoCell, LEGAJO_TOOLTIP } from "@/components/legajo-label";
import { FormDialog } from "@/components/form-dialog";
import { Badge } from "@/components/portal-shell";
import {
  auditarLegajos,
  fuentesLegajoDesdeMovimientos,
  type InconsistenciaLegajo,
} from "@/data/clientes";
import { desgloseDemo, type Desglose } from "@/lib/aranceles";
import { z } from "zod";

export const Route = createFileRoute("/admin/general/movimientos/")({
  validateSearch: z.object({ legajo: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Todos los movimientos — Movimientos — Admin Molly" },
      { name: "description", content: "Historial completo de movimientos de la plataforma." },
    ],
  }),
  component: TodosPage,
});

// Cada movimiento está vinculado al cliente (empresa/persona que contrató MoliPay)
// por su `clienteId` (FK) y muestra el `legajo` del cliente (LPF-#### / LPJ-####).
const CLIENTE_POR_USUARIO: Record<string, { clienteId: string; legajo: string }> = {
  "juan.perez@email.com": { clienteId: "c-0001", legajo: "LPF-0001" },
  "maria.lopez@email.com": { clienteId: "c-0002", legajo: "LPF-0002" },
  "carlos.martinez@email.com": { clienteId: "c-0021", legajo: "LPF-0021" },
  "ana.garcia@email.com": { clienteId: "c-0022", legajo: "LPF-0022" },
  "pedro.rodriguez@email.com": { clienteId: "c-0023", legajo: "LPF-0023" },
  "lucia.mendoza@email.com": { clienteId: "c-0024", legajo: "LPF-0024" },
  "gabriel.rios@email.com": { clienteId: "c-0025", legajo: "LPF-0025" },
  "valentina.castro@email.com": { clienteId: "c-0026", legajo: "LPF-0026" },
  "diego.fernandez@email.com": { clienteId: "c-0027", legajo: "LPF-0027" },
  "lucas.rivas@email.com": { clienteId: "c-0028", legajo: "LPF-0028" },
  "marcos.peralta@email.com": { clienteId: "c-0029", legajo: "LPF-0029" },
  "agustin.vila@email.com": { clienteId: "c-0030", legajo: "LPF-0030" },
  "matias.luna@email.com": { clienteId: "c-0031", legajo: "LPF-0031" },
  "carolina.ibanez@email.com": { clienteId: "c-0032", legajo: "LPF-0032" },
};

type MovBase = Omit<Movimiento, "clienteId" | "legajo" | "desglose">;

const base: MovBase[] = [
  {
    id: "TXN-001",
    tipo: "Depósito",
    cvu: "0000003100087654321012",
    usuario: "juan.perez@email.com",
    nombreOrigen: "Juan Carlos Pérez",
    nombreDestino: "Moli SA",
    cuit: "20-12345678-9",
    monto: "$ 150.000,00",
    fecha: "15/01/2025 10:32",
    estado: "APROBADO",
  },
  {
    id: "TXN-002",
    tipo: "Retiro",
    cvu: "0000003100087654321023",
    usuario: "maria.lopez@email.com",
    nombreOrigen: "María Elena López",
    nombreDestino: "Banco Provincia CC",
    cuit: "27-23456789-0",
    monto: "$ 45.200,00",
    fecha: "15/01/2025 11:05",
    estado: "EN PROGRESO",
  },
  {
    id: "TXN-003",
    tipo: "Comisión",
    cvu: "0000003100087654321034",
    usuario: "carlos.martinez@email.com",
    nombreOrigen: "Carlos Alberto Martínez",
    nombreDestino: "Moli SA",
    cuit: "20-34567890-1",
    monto: "$ 12.500,00",
    fecha: "14/01/2025 09:15",
    estado: "APROBADO",
  },
  {
    id: "TXN-004",
    tipo: "Depósito",
    cvu: "0000003100087654321045",
    usuario: "ana.garcia@email.com",
    nombreOrigen: "Ana Sofía García",
    nombreDestino: "Moli SA",
    cuit: "27-45678901-2",
    monto: "$ 320.000,00",
    fecha: "14/01/2025 14:22",
    estado: "EN PROGRESO",
  },
  {
    id: "TXN-005",
    tipo: "Retiro",
    cvu: "0000003100087654321056",
    usuario: "pedro.rodriguez@email.com",
    nombreOrigen: "Pedro Antonio Rodríguez",
    nombreDestino: "Banco Nación CA",
    cuit: "20-56789012-3",
    monto: "$ 78.900,00",
    fecha: "14/01/2025 16:48",
    estado: "RECHAZADO",
  },
  {
    id: "TXN-006",
    tipo: "Impuesto",
    cvu: "0000003100087654321067",
    usuario: "lucia.mendoza@email.com",
    nombreOrigen: "Lucía Belén Mendoza",
    nombreDestino: "AFIP",
    cuit: "27-67890123-4",
    monto: "$ 8.250,00",
    fecha: "13/01/2025 08:30",
    estado: "APROBADO",
  },
  {
    id: "TXN-007",
    tipo: "Pago con tarjeta",
    cvu: "0000003100087654321078",
    usuario: "gabriel.rios@email.com",
    nombreOrigen: "Gabriel Esteban Ríos",
    nombreDestino: "Mercado Pago",
    cuit: "20-78901234-5",
    monto: "$ 22.400,00",
    fecha: "13/01/2025 10:00",
    estado: "APROBADO",
  },
  {
    id: "TXN-008",
    tipo: "Pago PCT",
    cvu: "0000003100087654321089",
    usuario: "valentina.castro@email.com",
    nombreOrigen: "Valentina Castro",
    nombreDestino: "Supermercado El Colono",
    cuit: "30-89012345-6",
    monto: "$ 3.750,00",
    fecha: "13/01/2025 12:15",
    estado: "EN PROGRESO",
  },
  {
    id: "TXN-009",
    tipo: "Cobro PCT",
    cvu: "0000003100087654321090",
    usuario: "diego.fernandez@email.com",
    nombreOrigen: "Diego Martín Fernández",
    nombreDestino: "Kiosco 24hs",
    cuit: "27-90123456-7",
    monto: "$ 1.200,00",
    fecha: "12/01/2025 18:45",
    estado: "APROBADO",
  },
  {
    id: "TXN-010",
    tipo: "Depósito",
    cvu: "0000003100087654321012",
    usuario: "juan.perez@email.com",
    nombreOrigen: "Juan Carlos Pérez",
    nombreDestino: "Moli SA",
    cuit: "20-12345678-9",
    monto: "$ 500.000,00",
    fecha: "12/01/2025 09:00",
    estado: "BLOQUEADO",
  },
  {
    id: "TXN-011",
    tipo: "Retiro",
    cvu: "0000003100087654321056",
    usuario: "lucia.mendoza@email.com",
    nombreOrigen: "Lucía Belén Mendoza",
    nombreDestino: "Banco Galicia CC",
    cuit: "27-67890123-4",
    monto: "$ 15.600,00",
    fecha: "11/01/2025 15:30",
    estado: "BLOQUEADO",
  },
  {
    id: "TXN-012",
    tipo: "Comisión",
    cvu: "0000003100087654321034",
    usuario: "carlos.martinez@email.com",
    nombreOrigen: "Carlos Alberto Martínez",
    nombreDestino: "Moli SA",
    cuit: "20-34567890-1",
    monto: "$ 5.000,00",
    fecha: "11/01/2025 11:20",
    estado: "APROBADO",
  },
  {
    id: "TXN-013",
    tipo: "Pago con tarjeta",
    cvu: "0000003100087654321045",
    usuario: "ana.garcia@email.com",
    nombreOrigen: "Ana Sofía García",
    nombreDestino: "Netflix Argentina",
    cuit: "30-01234567-8",
    monto: "$ 12.499,00",
    fecha: "10/01/2025 20:15",
    estado: "CREADO",
  },
  {
    id: "TXN-014",
    tipo: "Impuesto",
    cvu: "0000003100087654321056",
    usuario: "pedro.rodriguez@email.com",
    nombreOrigen: "Pedro Antonio Rodríguez",
    nombreDestino: "ARBA",
    cuit: "20-56789012-3",
    monto: "$ 3.200,00",
    fecha: "10/01/2025 08:00",
    estado: "EN PROGRESO",
  },
  {
    id: "TXN-015",
    tipo: "Cobro PCT",
    cvu: "0000003100087654321090",
    usuario: "valentina.castro@email.com",
    nombreOrigen: "Valentina Castro",
    nombreDestino: "Farmacia Central",
    cuit: "30-33445566-7",
    monto: "$ 4.500,00",
    fecha: "12/01/2025 20:10",
    estado: "REEMBOLSADO",
  },
  {
    id: "TXN-016",
    tipo: "Pago con tarjeta",
    cvu: "0000003100087654321081",
    usuario: "lucas.rivas@email.com",
    nombreOrigen: "Lucas Ezequiel Rivas",
    nombreDestino: "Spotify",
    cuit: "30-44556677-8",
    monto: "$ 8.900,00",
    fecha: "10/01/2025 11:30",
    estado: "ABIERTO",
  },
  {
    id: "TXN-017",
    tipo: "Pago con tarjeta",
    cvu: "0000003100087654321082",
    usuario: "marcos.peralta@email.com",
    nombreOrigen: "Marcos Andrés Peralta",
    nombreDestino: "Disney+",
    cuit: "30-55667788-9",
    monto: "$ 5.600,00",
    fecha: "08/01/2025 19:00",
    estado: "EXPIRADO",
  },
  {
    id: "TXN-018",
    tipo: "Pago PCT",
    cvu: "0000003100087654321083",
    usuario: "agustin.vila@email.com",
    nombreOrigen: "Agustín Vila",
    nombreDestino: "Verdulería Barrio",
    cuit: "30-11223344-7",
    monto: "$ 2.100,00",
    fecha: "09/01/2025 09:25",
    estado: "RECHAZADO",
  },
  {
    id: "TXN-028",
    tipo: "Pago PCT",
    cvu: "0000003100087654321089",
    usuario: "matias.luna@email.com",
    nombreOrigen: "Matías Luna",
    nombreDestino: "Panadería La Esquina",
    cuit: "30-22334455-6",
    monto: "$ 1.450,00",
    fecha: "10/01/2025 10:05",
    estado: "REEMBOLSADO",
  },
  {
    id: "TXN-031",
    tipo: "Pago de servicio",
    cvu: "0000003100087654321044",
    usuario: "carolina.ibanez@email.com",
    nombreOrigen: "Carolina Beatriz Ibáñez",
    nombreDestino: "AYSA",
    cuit: "30-66778899-0",
    monto: "$ 4.120,00",
    fecha: "09/01/2025 16:20",
    estado: "APROBADO",
  },
];

// Legajos históricos cargados con el esquema anterior (identificador genérico).
// Deben aparecer en la auditoría de datos existentes como inconsistencias.
const legajosHistoricos: Movimiento[] = [
  {
    clienteId: "legacy-1",
    legajo: "MOV-041",
    id: "TXN-041",
    tipo: "Pago PCT",
    cvu: "0000003100087654321091",
    usuario: "operador.historico@email.com",
    nombreOrigen: "Operador Histórico",
    nombreDestino: "Comercio Legacy",
    cuit: "30-00000000-0",
    monto: "$ 1.900,00",
    fecha: "08/01/2025 12:00",
    estado: "APROBADO",
  },
  {
    clienteId: "legacy-2",
    legajo: "COM-0999",
    id: "TXN-042",
    tipo: "Depósito",
    cvu: "0000003100087654321092",
    usuario: "comercio.legacy@email.com",
    nombreOrigen: "Comercio Legacy",
    nombreDestino: "Moli SA",
    cuit: "30-11111111-1",
    monto: "$ 900.000,00",
    fecha: "07/01/2025 09:30",
    estado: "APROBADO",
  },
];

const parseMonto = (s: string): number =>
  Number(
    s
      .replace(/[^\d,]/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  ) || 0;

const movimientos: Movimiento[] = base.map((m) => {
  const cli = CLIENTE_POR_USUARIO[m.usuario];
  const clienteId = cli?.clienteId ?? m.id;
  const legajo = cli?.legajo ?? "SIN-LEGAJO";
  const desglose: Desglose | undefined =
    m.tipo === "Comisión" ? desgloseDemo(parseMonto(m.monto)) : undefined;
  return { ...m, clienteId, legajo, desglose };
});

const allTransactions: Movimiento[] = [...movimientos, ...legajosHistoricos];

const toneInconsistencia: Record<InconsistenciaLegajo["tipo"], "danger" | "warn" | "neutral"> = {
  formato: "danger",
  prefijo_inconsistente: "danger",
  duplicado: "warn",
  sin_cliente: "warn",
};

function TodosPage() {
  const { legajo } = Route.useSearch();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<Movimiento | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const inconsistencias = useMemo(
    () => auditarLegajos(fuentesLegajoDesdeMovimientos(allTransactions)),
    [],
  );

  const getActions = (row: Movimiento): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetail(row) },
    {
      label: "Ver movimientos del cliente",
      icon: FilterX,
      onClick: () => navigate({ to: "/admin/general/movimientos", search: { legajo: row.legajo } }),
    },
  ];

  return (
    <>
      <PageHeader
        title="Todos los movimientos"
        description="Historial completo de transacciones de la plataforma. Filtrá por legajo para ver el histórico completo del cliente."
      />

      {inconsistencias.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-amber-800">
            <ShieldAlert size={16} />
            <span>
              <strong>Auditoría de legajos:</strong> se detectaron {inconsistencias.length}{" "}
              registro(s) con inconsistencias en los legajos cargados.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAuditOpen(true)}
            className="text-xs font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700"
          >
            Ver detalle
          </button>
        </div>
      )}

      {legajo && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          Mostrando movimientos del cliente con legajo{" "}
          <span className="font-mono font-semibold tabular-nums">{legajo}</span> (identificador
          interno del cliente).{" "}
          <button
            type="button"
            onClick={() => navigate({ to: "/admin/general/movimientos", search: {} })}
            className="ml-1 text-xs font-semibold text-primary underline underline-offset-2"
          >
            Limpiar filtro
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={allTransactions}
        keyExtractor={(r) => r.id}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
        initialQuery={legajo}
      />
      {detail && <MovimientoDetail m={detail} onClose={() => setDetail(null)} />}

      <FormDialog
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        title="Auditoría de legajos"
        description="Inconsistencias detectadas en los legajos cargados en la base de datos actual."
        onSubmit={() => setAuditOpen(false)}
        submitLabel="Cerrar"
        size="lg"
      >
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {inconsistencias.map((inc, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm"
            >
              <Badge tone={toneInconsistencia[inc.tipo]}>
                {inc.tipo.replace("_", " ").toUpperCase()}
              </Badge>
              <div className="min-w-0">
                <div className="font-mono font-semibold tabular-nums">{inc.legajo}</div>
                <div className="text-xs text-muted-foreground">{inc.entidad}</div>
                <div className="text-xs mt-1">{inc.detalle}</div>
              </div>
            </div>
          ))}
        </div>
      </FormDialog>
    </>
  );
}

const columns: Column<Movimiento>[] = [
  {
    key: "legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    render: (r) => <LegajoCell legajo={r.legajo} />,
  },
  {
    key: "id",
    label: "ID",
    filterable: true,
    render: (r) => <span className="font-mono tabular-nums">{r.id}</span>,
  },
  {
    key: "tipo",
    label: "Tipo de movimiento",
    filterable: "enum",
    filterOptions: [
      "Depósito",
      "Retiro",
      "Comisión",
      "Impuesto",
      "Pago con tarjeta",
      "Pago PCT",
      "Cobro PCT",
      "Pago de servicio",
    ],
    render: (r) => r.tipo,
  },
  {
    key: "cvu",
    label: "CVU",
    filterable: true,
    render: (r) => <span className="font-mono tabular-nums">{r.cvu}</span>,
  },
  { key: "usuario", label: "Usuario", filterable: true, render: (r) => r.usuario },
  {
    key: "nombreOrigen",
    label: "Nombre empresa/persona",
    filterable: true,
    render: (r) => r.nombreOrigen,
  },
  {
    key: "nombreDestino",
    label: "Nombre destino",
    filterable: true,
    render: (r) => r.nombreDestino,
  },
  {
    key: "cuit",
    label: "CUIT",
    filterable: true,
    render: (r) => <span className="font-mono tabular-nums">{r.cuit}</span>,
  },
  {
    key: "monto",
    label: "Monto",
    render: (r) => <span className="font-mono tabular-nums">{r.monto}</span>,
  },
  {
    key: "fecha",
    label: "Fecha",
    filterable: "date",
    render: (r) => <span className="font-mono tabular-nums">{r.fecha}</span>,
  },
  {
    key: "estado",
    label: "Estado",
    filterable: "enum",
    filterOptions: [
      "APROBADO",
      "EN PROGRESO",
      "RECHAZADO",
      "BLOQUEADO",
      "CREADO",
      "ABIERTO",
      "EXPIRADO",
      "REEMBOLSADO",
    ],
    render: (row) => estadoBadge(row.estado),
  },
];
