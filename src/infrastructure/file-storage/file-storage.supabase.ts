import { requireSupabase } from "@/infrastructure/supabase/client";
import { FileStorageError,type FileStorage } from "./file-storage";

/** Supabase Storage para un bucket. El cliente se pide en cada operacion (puede no estar configurado). */
export function createSupabaseFileStorage(bucket: string): FileStorage {
  const from = () => requireSupabase().storage.from(bucket);

  return {
    async upload(path, file, options = {}) {
      const { error } = await from().upload(path, file, options);
      if (error) throw new FileStorageError(error.message, "upload", path, { cause: error });
    },
    async remove(paths) {
      const { error } = await from().remove(paths);
      if (error)
        throw new FileStorageError(error.message, "remove", paths.join(", "), { cause: error });
    },
    async getSignedUrl(path, expiresInSeconds) {
      const { data, error } = await from().createSignedUrl(path, expiresInSeconds);
      if (error || !data?.signedUrl) {
        throw new FileStorageError(error?.message ?? "sin URL", "signed-url", path, {
          cause: error,
        });
      }
      return data.signedUrl;
    },
    async download(path) {
      const { data, error } = await from().download(path);
      if (error || !data)
        throw new FileStorageError(error?.message ?? "sin datos", "download", path, {
          cause: error,
        });
      return data;
    },
    getPublicUrl(path) {
      return from().getPublicUrl(path).data.publicUrl;
    },
  };
}
