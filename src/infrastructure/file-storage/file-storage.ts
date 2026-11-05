/**
 * Contrato de almacenamiento de archivos: lo que la app necesita, sin atarse a
 * un proveedor. La implementacion actual es Supabase Storage
 * (file-storage.supabase.ts); se elige en app/dependencies.ts.
 */

export type UploadOptions = {
  contentType?: string;
  upsert?: boolean;
  cacheControl?: string;
};

export interface FileStorage {
  upload(path: string, file: File | Blob, options?: UploadOptions): Promise<void>;
  remove(paths: string[]): Promise<void>;
  getSignedUrl(path: string, expiresInSeconds: number): Promise<string>;
  download(path: string): Promise<Blob>;
  /** Solo sirve si el bucket es publico. */
  getPublicUrl(path: string): string;
}

export type FileStorageOperation = "upload" | "remove" | "signed-url" | "download";

/** Error de almacenamiento. `message` trae el detalle del proveedor (para logs, no para el usuario). */
export class FileStorageError extends Error {
  constructor(
    message: string,
    readonly operation: FileStorageOperation,
    readonly path: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "FileStorageError";
  }
}
