export type Rol = {
  id: string;
  nombre: string;
};

export const ROLES_DISPONIBLES: Rol[] = [
  { id: "1", nombre: "Admin" },
  { id: "2", nombre: "Compliance" },
  { id: "3", nombre: "Management" },
  { id: "4", nombre: "Accounting" },
  { id: "5", nombre: "Reader" },
  { id: "6", nombre: "User" },
];

export const ROLES_NOMBRES = ROLES_DISPONIBLES.map((r) => r.nombre);
