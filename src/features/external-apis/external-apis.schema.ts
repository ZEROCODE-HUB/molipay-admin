import { z } from "zod";
import { requiredText } from "@/shared/validation/primitives";
import { ENDPOINT_GROUPS,ENDPOINT_STATUSES,HTTP_METHODS } from "./external-apis.types";

export const reasonSchema = z.object({ reason: requiredText("Ingresá el motivo.") });

export const endpointSchema = z.object({
  name: requiredText("Ingresá el nombre."),
  path: requiredText("Ingresá el path.").refine(
    (p) => p.startsWith("/"),
    "El path tiene que empezar con /.",
  ),
  method: z.enum(HTTP_METHODS),
  description: z.string().trim(),
  group: z.enum(ENDPOINT_GROUPS),
  status: z.enum(ENDPOINT_STATUSES),
  rec: z.boolean(),
});
