/**
 * Raiz de composicion: el UNICO lugar que elige que implementacion usa cada
 * contrato. Cambiar de proveedor (p. ej. Supabase Storage -> S3) se hace aca.
 * Un export con nombre por dependencia: cada modulo importa solo lo suyo.
 */
import { createSupabaseAuthClient } from "@/infrastructure/auth/auth-client.supabase";
import { createSupabaseFileStorage } from "@/infrastructure/file-storage/file-storage.supabase";
import { createSupabaseBackofficeUsersRepository } from "@/features/backoffice-users/backoffice-users.supabase";
import { createSupabaseRbacRepository } from "@/features/rbac/rbac.supabase";

export const authClient = createSupabaseAuthClient();

// --- Almacenamiento de archivos (buckets) ------------------------------------
export const customerDocumentsBucket =
  (import.meta.env.VITE_STORAGE_BUCKET as string | undefined) ?? "kyc";
export const customerDocumentsStorage = createSupabaseFileStorage(customerDocumentsBucket);
export const alertAttachmentsStorage = createSupabaseFileStorage("alert-attachments");
export const reconciliationFilesStorage = createSupabaseFileStorage("conciliaciones");
export const taxExemptionCertificatesStorage = createSupabaseFileStorage(
  "tax-exemption-certificates",
);
export const chargebackDocumentsStorage = createSupabaseFileStorage("contracargos-docs");

// --- Repositorios por dominio ----------------------------------------------------
export const rbacRepository = createSupabaseRbacRepository();
export const backofficeUsersRepository = createSupabaseBackofficeUsersRepository();
