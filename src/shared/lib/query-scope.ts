/**
 * Prefijos de query keys. Todo dato privado va bajo el usuario de la sesion:
 * nunca se mezcla la cache de dos usuarios (ademas se vacia al cerrar sesion).
 */
export const privateScope = (userId: string) => ["private", userId] as const;
export const publicScope = ["public"] as const;
