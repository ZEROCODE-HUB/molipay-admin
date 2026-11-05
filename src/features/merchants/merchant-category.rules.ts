export const PAGE_SIZE = 25;

export function statusBadgeTone(status: "activo" | "inactivo"): "success" | "neutral" {
  return status === "activo" ? "success" : "neutral";
}
