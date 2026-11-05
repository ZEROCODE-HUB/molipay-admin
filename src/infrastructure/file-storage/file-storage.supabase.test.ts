import { describe,expect,it,vi } from "vitest";

const bucketApi = {
  upload: vi.fn(),
  remove: vi.fn(),
  createSignedUrl: vi.fn(),
  download: vi.fn(),
  getPublicUrl: vi.fn(),
};
const from = vi.fn(() => bucketApi);

vi.mock("@/infrastructure/supabase/client", () => ({
  requireSupabase: () => ({ storage: { from } }),
}));

const { createSupabaseFileStorage } = await import("./file-storage.supabase");
const { FileStorageError } = await import("./file-storage");

describe("createSupabaseFileStorage", () => {
  const storage = createSupabaseFileStorage("docs");

  it("usa el bucket indicado y devuelve la URL firmada", async () => {
    bucketApi.createSignedUrl.mockResolvedValueOnce({
      data: { signedUrl: "https://x/firmada" },
      error: null,
    });
    await expect(storage.getSignedUrl("a/b.pdf", 60)).resolves.toBe("https://x/firmada");
    expect(from).toHaveBeenCalledWith("docs");
    expect(bucketApi.createSignedUrl).toHaveBeenCalledWith("a/b.pdf", 60);
  });

  it("convierte el error del proveedor en FileStorageError con la operacion y el path", async () => {
    bucketApi.upload.mockResolvedValueOnce({ data: null, error: { message: "Bucket not found" } });
    const error = await storage.upload("a/b.pdf", new Blob(["x"])).catch((e) => e);
    expect(error).toBeInstanceOf(FileStorageError);
    expect(error).toMatchObject({
      message: "Bucket not found",
      operation: "upload",
      path: "a/b.pdf",
    });
  });

  it("una URL firmada vacia tambien es un error", async () => {
    bucketApi.createSignedUrl.mockResolvedValueOnce({ data: null, error: null });
    await expect(storage.getSignedUrl("x", 60)).rejects.toBeInstanceOf(FileStorageError);
  });
});
