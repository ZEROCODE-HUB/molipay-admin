import { z } from "zod";

/**
 * Validaciones universales (mismo formato en cualquier feature). Las reglas de
 * negocio (montos minimos, limites, politicas propias) van en el *.schema.ts de cada feature.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Ingresá tu correo electrónico.")
  .email("Ingresá un correo electrónico válido.");

export const requiredText = (message: string) => z.string().trim().min(1, message);
