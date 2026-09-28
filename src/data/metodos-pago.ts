export type Cuota = {
  key: number;
  numero: string;
  ten: string;
  coeficiente: string;
};

export type MetodoPago = {
  id: number;
  nombre: string;
  tipo: string;
  estado: "Activo" | "Inactivo";
  cuotas: Cuota[];
  diasHabiles: number;
};

export const TIPOS = [
  "Tarjeta de débito",
  "Tarjeta prepago",
  "Tarjeta de crédito",
  "Pago Fácil",
  "Rapipago",
];

export const metodosPagoIniciales: MetodoPago[] = [
  {
    id: 1,
    nombre: "Visa Débito",
    tipo: "Tarjeta de débito",
    estado: "Activo",
    cuotas: [{ key: 1, numero: "1", ten: "0", coeficiente: "1" }],
    diasHabiles: 1,
  },
  {
    id: 2,
    nombre: "Visa Prepaga",
    tipo: "Tarjeta prepago",
    estado: "Activo",
    cuotas: [{ key: 1, numero: "1", ten: "0", coeficiente: "1" }],
    diasHabiles: 1,
  },
  {
    id: 3,
    nombre: "Mastercard Prepaga",
    tipo: "Tarjeta prepago",
    estado: "Inactivo",
    cuotas: [{ key: 1, numero: "1", ten: "0", coeficiente: "1" }],
    diasHabiles: 1,
  },
  {
    id: 4,
    nombre: "Visa Crédito",
    tipo: "Tarjeta de crédito",
    estado: "Activo",
    cuotas: [
      { key: 1, numero: "1", ten: "0", coeficiente: "1" },
      { key: 2, numero: "2", ten: "0.5", coeficiente: "1.02" },
      { key: 3, numero: "3", ten: "0.8", coeficiente: "1.04" },
      { key: 4, numero: "4", ten: "1.1", coeficiente: "1.06" },
      { key: 5, numero: "5", ten: "1.4", coeficiente: "1.08" },
      { key: 6, numero: "6", ten: "1.7", coeficiente: "1.1" },
    ],
    diasHabiles: 20,
  },
  {
    id: 5,
    nombre: "Mastercard Crédito",
    tipo: "Tarjeta de crédito",
    estado: "Activo",
    cuotas: [
      { key: 1, numero: "1", ten: "0", coeficiente: "1" },
      { key: 2, numero: "2", ten: "0.6", coeficiente: "1.03" },
      { key: 3, numero: "3", ten: "0.9", coeficiente: "1.05" },
    ],
    diasHabiles: 20,
  },
  {
    id: 6,
    nombre: "Mastercard Débito",
    tipo: "Tarjeta de débito",
    estado: "Inactivo",
    cuotas: [{ key: 1, numero: "1", ten: "0", coeficiente: "1" }],
    diasHabiles: 1,
  },
  {
    id: 7,
    nombre: "Pago Fácil",
    tipo: "Pago Fácil",
    estado: "Activo",
    cuotas: [{ key: 1, numero: "1", ten: "0", coeficiente: "1" }],
    diasHabiles: 1,
  },
  {
    id: 8,
    nombre: "Rapipago",
    tipo: "Rapipago",
    estado: "Inactivo",
    cuotas: [{ key: 1, numero: "1", ten: "0", coeficiente: "1" }],
    diasHabiles: 1,
  },
];
