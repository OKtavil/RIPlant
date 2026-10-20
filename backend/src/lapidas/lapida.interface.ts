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
  duenio?: { username: string; rol: string };
}
