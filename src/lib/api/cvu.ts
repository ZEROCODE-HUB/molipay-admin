/**
 * Capa de operacion de CVU compartida (admin + Enterprise).
 *
 * Dos helpers, mismo patron:
 *   - `asignarCvuParaNuevo`  -> flujo "Nuevo CVU" del modal: crea la
 *                                subcuenta con el CVU ya asignado.
 *   - `asignarCvuParaExistente` -> flujo del menu ⋮ sobre una subcuenta
 *                                  que existe pero esta sin CVU: hace update
 *                                  del campo `cbu`.
 *
 * Ambos comparten la decision de fondo:
 *   1. Llamar al backend Hono (que llama a BDC/COELSA).
 *   2. Si BDC responde OK: persistir el CVU real (vía CREATE o UPDATE segun
 *      el flujo).
 *   3. Si BDC rechaza con codigo permanente (alias_taken, cuit_invalid):
 *      mostrar toast, NO persistir. Devolver `kind: 'rechazado'` para
 *      que el caller no muestre "exito" si lo hizo por toaster.
 *   4. Si BDC falla por motivo operacional (server_error, timeout,
 *      not_configured, etc.): caer al CVU local con toast amarillo,
 *      persistir el local (la operacion no se pierde).
 *
 * La auditoria la hace el backend, en `cliente_transiciones`, con origen
 * 'asignacion_cvu_exito' o 'asignacion_cvu_fallo'. El cliente solo ve el
 * resultado.
 */

import { toast } from "sonner";
import { assignCvu as assignCvuViaBdc, BdcError, bdcErrorToToastMessage } from "./bdc";
import { generarCbu, generarAlias, createSubcuenta, updateSubcuenta } from "./subcuentas";
import type { SubcuentaTipo } from "./subcuentas";

/**
 * Union discriminada por `kind`. Es la forma robusta de tener 3 outcomes
 * y hacer que TypeScript angosto correctamente en cada branch.
 */
export type AsignarCvuResult =
  | { kind: "exito"; cvu: string; alias: string; stub: boolean }
  | { kind: "fallback"; cvu: string; alias: string; stub: true }
  | { kind: "rechazado"; alias: string; motivo: string };

/**
 * Datos minimos del cliente que ambos helpers consumen. Asi el caller no
 * duplica el shape.
 */
export type ClienteParaCvu = {
  id: string;
  legajo: string;
  correo: string;
  cuit: string;
  nombre: string;
  tipoPersona: "fisica" | "juridica";
};

/**
 * Lanza el flow BDC + audit + fallback. No persiste la subcuenta;
 * el caller decide si hace CREATE o UPDATE segun el flujo. Helper interno.
 *
 * Devuelve `AsignarCvuResult` puro (union discriminada en `rechazadoPorBdc`).
 * Esta función NO maneja toasts: el caller los hace. Eso evita duplicacion
 * entre `asignarCvuParaNuevo` y `asignarCvuParaExistente`.
 */
async function obtenerCvu(input: {
  cliente: ClienteParaCvu;
  alias?: string;
  tipo: SubcuentaTipo;
  origin: "admin" | "enterprise";
}): Promise<AsignarCvuResult> {
  const cuit = input.cliente.cuit.replace(/\D/g, "");
  const titular = input.cliente.nombre.trim();
  const aliasFinal = ((input.alias ?? "").trim() || generarAlias(input.cliente.correo));
  const idempotencyKey = crypto.randomUUID();

  try {
    const r = await assignCvuViaBdc({
      cuit,
      alias: aliasFinal,
      titularNombre: titular,
      tipo: input.tipo,
      idempotencyKey,
      legajo: input.cliente.legajo,
      origin: input.origin,
    });
    const res: AsignarCvuResult = r.stub
      ? { kind: "fallback", cvu: r.cvu, alias: aliasFinal, stub: true }
      : { kind: "exito", cvu: r.cvu, alias: aliasFinal, stub: false };
    return res;
  } catch (e) {
    if (e instanceof BdcError && (e.code === "alias_taken" || e.code === "cuit_invalid")) {
      const motivo = bdcErrorToToastMessage(e.code, e.message);
      const res: AsignarCvuResult = {
        kind: "rechazado",
        alias: aliasFinal,
        motivo,
      };
      return res;
    }
    const code = e instanceof BdcError ? e.code : "server_error";
    const fallbackCvu = generarCbu();
    toast.warning(
      `${bdcErrorToToastMessage(
        code,
        "Sin respuesta del backend de pagos.",
      )} Se asignó un CVU local de emergencia a ${input.cliente.correo}. Pendiente de reasignar contra BDC.`,
      { duration: 8000 },
    );
    const res: AsignarCvuResult = {
      kind: "fallback",
      cvu: fallbackCvu,
      alias: aliasFinal,
      stub: true,
    };
    return res;
  }
}

/**
 * Flujo "Nuevo CVU" del modal: crea la subcuenta desde cero, ya con el
 * CVU que devuelve BDC (o fallback local).
 *
 *   - Muestra toast de exito (con detalle de stub si es fallback).
 *   - Si BDC rechaza con codigo permanente: NO crea la subcuenta y muestra
 *     toast de error. Devuelve `rechazadoPorBdc` para que el caller
 *     decida si cierra el modal o mantiene el form para correcciones.
 */
export async function asignarCvuParaNuevo(input: {
  cliente: ClienteParaCvu;
  alias?: string;
  tipo: SubcuentaTipo;
  origin: "admin" | "enterprise";
}): Promise<AsignarCvuResult> {
  const result = await obtenerCvu(input);
  if (result.kind === "rechazado") {
    toast.error(result.motivo, { duration: 6000 });
    return result;
  }
  // Acá result.kind es "exito" o "fallback": en ambos hay cvu.
  const cbu = result.cvu;

  // Persistimos la subcuenta nueva con el CVU (real o fallback).
  const isJuridica = input.cliente.tipoPersona === "juridica";
  const nombre = isJuridica
    ? input.cliente.nombre
    : (input.cliente.nombre.split(" ")[0] ?? input.cliente.nombre);
  const apellido = isJuridica
    ? ""
    : input.cliente.nombre.split(" ").slice(1).join(" ") || "";

  try {
    await createSubcuenta(input.cliente.legajo, {
      nombre,
      apellido,
      email: input.cliente.correo,
      cbu,
      tipo: input.tipo,
      estado: "Activa",
    });
  } catch (createErr) {
    toast.error(
      `El CVU se generó pero no se pudo persistir la subcuenta: ${(createErr as Error).message}. Contacta a infra.`,
      { duration: 8000 },
    );
    throw createErr;
  }

  toast.success(
    result.kind === "fallback"
      ? `CVU local asignado a ${input.cliente.correo}. El backend está en stub (modo desarrollo); reemplazar credenciales para integración real.`
      : `CVU ${result.cvu} asignado a ${input.cliente.correo} vía BDC/COELSA.`,
  );
  return result;
}

/**
 * Flujo del menu ⋮ sobre una subcuenta existente sin CVU: hace UPDATE
 * del campo `cbu` con el CVU devuelto por BDC (o fallback local).
 *
 * Misma lógica de toasts que `asignarCvuParaNuevo`.
 */
export async function asignarCvuParaExistente(input: {
  cliente: ClienteParaCvu;
  subcuentaId: string;
  tipo: SubcuentaTipo;
  origin: "admin" | "enterprise";
}): Promise<AsignarCvuResult> {
  const result = await obtenerCvu({
    cliente: input.cliente,
    tipo: input.tipo,
    origin: input.origin,
  });
  if (result.kind === "rechazado") {
    toast.error(result.motivo, { duration: 6000 });
    return result;
  }
  const cbu = result.cvu;

  try {
    await updateSubcuenta(input.cliente.legajo, input.subcuentaId, {
      cbu,
    });
  } catch (updateErr) {
    toast.error(
      `El CVU se generó pero no se pudo persistir el update: ${(updateErr as Error).message}. Contacta a infra.`,
      { duration: 8000 },
    );
    throw updateErr;
  }

  toast.success(
    result.kind === "fallback"
      ? `CVU local asignado a ${input.cliente.correo}. Pendiente de reasignar contra BDC.`
      : `CVU ${result.cvu} asignado a ${input.cliente.correo} vía BDC/COELSA.`,
  );
  return result;
}
