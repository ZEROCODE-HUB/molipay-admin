import { getRouteApi } from "@tanstack/react-router";
import { z } from "zod";

export const route = getRouteApi("/admin/comercios/link-pago/ejecucion");

export const searchSchema = z.object({
  ejecucion: z.string().optional(),
  vista: z.enum(["historial"]).optional(),
});
