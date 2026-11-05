export type Draft = {
  id?: string;
  legajo: string;
  correo: string;
  /** Texto para no perder lo que se tipea; vacío = usa el general. */
  persona: string;
  empresa: string;
};
