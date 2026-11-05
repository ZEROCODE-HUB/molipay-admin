import { type BatchCredit } from "@/infrastructure/supabase/legacy/types";

// Carga del archivo de liquidacion de Payway.
//
// La validacion y la importacion las hace la base:
//   1. liquidacion_previsualizar: valida cada renglon (formato, cuadre
//      bruto + costo + impuestos = neto, marca, establecimiento -> comercio,
//      archivo repetido) sin escribir nada.
//   2. liquidacion_confirmar: cada renglon con importe crea un lote de
//      acreditacion Pendiente y vincula la proyeccion (lote Programado) del
//      comercio y la bandera. Lo que no se puede asignar va a Excepciones.
// El neto a acreditar se calcula despues, al conciliar, en la base.

export type ResultCargaCsv = {
  aplicados: number;
  sinMatch: number;
};

export type Props = {
  open: boolean;
  /** Si viene, se muestra como contexto (el archivo puede traer otros lotes). */
  lote?: BatchCredit | null;
  onClose: () => void;
  onCargado: (result: ResultCargaCsv) => void;
};
