/**
 * Documentos locales asignados a clientes de demostración.
 *
 * Las imágenes viven en `/public/imagenes` (servidas estáticamente por Vite) y
 * se muestran en la solapa "Documentos" de la ficha del cliente. Esto cubre el
 * requerimiento de asignar fotos a legajos específicos sin depender de la carga
 * por URL del backend.
 */
export type ImagenAsignada = {
  label: string;
  url: string;
};

export const IMAGENES_ASIGNADAS: Record<string, ImagenAsignada[]> = {
  // Persona natural: Valentina Fernandez
  "LPF-20000009179": [
    { label: "Documento frente", url: "/imagenes/natural-frente.jfif" },
    { label: "Documento dorso", url: "/imagenes/natural-dorso.jfif" },
    { label: "Selfie verificatoria", url: "/imagenes/natural-selfie.jfif" },
  ],
  // Persona jurídica: Constructora Alpha SA
  "LPJ-30112233445": [
    { label: "Documento constitutivo", url: "/imagenes/juridica-1.jfif" },
    { label: "Estatuto social", url: "/imagenes/juridica-2.jfif" },
    { label: "Inscripción AFIP", url: "/imagenes/juridica-3.jfif" },
  ],
};

export function imagenesParaLegajo(legajo: string): ImagenAsignada[] {
  return IMAGENES_ASIGNADAS[legajo.trim().toUpperCase()] ?? [];
}
