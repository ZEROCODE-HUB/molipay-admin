export type JuridicaMock = {
  legajo: string;
  correo: string;
  razonSocial: string;
  tipo: "SA" | "SRL";
  estado: string;
  fechaRegistro: string;
  subcuentas: number;
  cuit: string;
};

/**
 * Personas jurídicas de referencia (la lista de usuario es mock; la ficha de
 * detalle resuelve contra este catálogo cuando el backend no tiene la fila).
 */
export const JURIDICAS_MOCK: JuridicaMock[] = [
  {
    legajo: "LPJ-30112233445",
    correo: "info@constructoraalpha.com",
    razonSocial: "Constructora Alpha SA",
    tipo: "SA",
    estado: "Activado",
    fechaRegistro: "10/01/2024",
    subcuentas: 5,
    cuit: "30-11223344-5",
  },
  {
    legajo: "LPJ-30223344556",
    correo: "admin@comercializadorabeta.com",
    razonSocial: "Comercializadora Beta SRL",
    tipo: "SRL",
    estado: "Registrado",
    fechaRegistro: "22/02/2024",
    subcuentas: 2,
    cuit: "30-22334455-6",
  },
  {
    legajo: "LPJ-30334455667",
    correo: "contacto@serviciosgamma.com",
    razonSocial: "Servicios Gamma SA",
    tipo: "SA",
    estado: "Pre-activado",
    fechaRegistro: "14/03/2024",
    subcuentas: 3,
    cuit: "30-33445566-7",
  },
  {
    legajo: "LPJ-30445566778",
    correo: "ventas@distribuidoradelta.com",
    razonSocial: "Distribuidora Delta SRL",
    tipo: "SRL",
    estado: "En progreso",
    fechaRegistro: "05/04/2024",
    subcuentas: 1,
    cuit: "30-44556677-8",
  },
  {
    legajo: "LPJ-30556677889",
    correo: "info@logisticaepsilon.com",
    razonSocial: "Logística Epsilon SA",
    tipo: "SA",
    estado: "Pendiente de verificación de email",
    fechaRegistro: "19/05/2024",
    subcuentas: 0,
    cuit: "30-55667788-9",
  },
  {
    legajo: "LPJ-30667788990",
    correo: "admin@techzeta.com",
    razonSocial: "Tech Zeta SRL",
    tipo: "SRL",
    estado: "Activado",
    fechaRegistro: "01/06/2024",
    subcuentas: 7,
    cuit: "30-66778899-0",
  },
  {
    legajo: "LPJ-30778899001",
    correo: "contacto@alimentoseta.com",
    razonSocial: "Alimentos Eta SA",
    tipo: "SA",
    estado: "Pendiente de aprobación",
    fechaRegistro: "28/07/2024",
    subcuentas: 0,
    cuit: "30-77889900-1",
  },
  {
    legajo: "LPJ-30889900112",
    correo: "info@industriatheta.com",
    razonSocial: "Industria Theta SRL",
    tipo: "SRL",
    estado: "Activado",
    fechaRegistro: "15/08/2024",
    subcuentas: 4,
    cuit: "30-88990011-2",
  },
  {
    legajo: "LPJ-30990011223",
    correo: "gerencia@comercioiota.com",
    razonSocial: "Comercio Iota SA",
    tipo: "SA",
    estado: "En progreso",
    fechaRegistro: "03/09/2024",
    subcuentas: 1,
    cuit: "30-99001122-3",
  },
  {
    legajo: "LPJ-30001122334",
    correo: "admin@transporteskappa.com",
    razonSocial: "Transportes Kappa SRL",
    tipo: "SRL",
    estado: "Registrado",
    fechaRegistro: "20/10/2024",
    subcuentas: 0,
    cuit: "30-00112233-4",
  },
];

export function findJuridicaMock(legajo: string): JuridicaMock | undefined {
  const norm = legajo.trim().toUpperCase();
  return JURIDICAS_MOCK.find((j) => j.legajo.toUpperCase() === norm);
}
