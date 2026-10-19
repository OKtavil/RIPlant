export type Rol = 'usuario' | 'admin';

/** Usuario tal como lo ve el dominio y la API. Nunca expone `passwordHash`. */
export interface Usuario {
  id: string;
  username: string;
  rol: Rol;
}
