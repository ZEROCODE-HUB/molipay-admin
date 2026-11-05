export const PAGE_SIZES = [10, 20, 50];

export function tone(e: string): "success" | "neutral" | "warn" | "danger" {
  if (e === "Pagado") return "success";
  if (e === "Activado") return "success";
  if (e === "Desactivado") return "neutral";
  if (e === "Contracargo") return "danger";
  if (e === "Expirado" || e === "Cancelado") return "neutral";
  if (e === "Rechazado" || e === "Eliminado" || e === "Suspendido") return "danger";
  return "warn"; // Pendiente de aprobación
}

export function fmtMoney(n: number | null | undefined) {
  if (n == null) return "—";
  return `$ ${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
