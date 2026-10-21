export interface Lapida {
  id: number;
  nombrePlanta: string;
  epitafio: string;
  fechaFallecimiento: string;
  fechaPublicacion: string;
  autor: string;
  categoriaId: number;
  causaMuerte: string;
  fotoUrl: string;
  coronasCount: number;
  usuarioId: string;
  /**
   * S1 de la insignia: la lápida volvió a dar señales de vida. El backend la
   * enciende cuando el dueño o un admin la editan, y `resucitadaEn` guarda la
   * fecha del primer rescate. Se muestra distinta en el cementerio.
   */
  resucitada?: boolean;
  resucitadaEn?: string;
  /**
   * Si **este** usuario ya coronó esta lápida. `coronasCount` es el total
   * global; esto es lo que el front necesita para alternar entre poner y quitar
   * con un click. `false` cuando no hay sesión: sin sesión no se puede coronar.
   */
  coronadaPorMi?: boolean;
  duenio?: { username: string; rol: string };
}
