/** Escapa los comodines de LIKE/ILIKE (% y _) en un texto de busqueda. */
export function escapeLike(search: string): string {
  return search.trim().replace(/[%_]/g, "\\$&");
}
