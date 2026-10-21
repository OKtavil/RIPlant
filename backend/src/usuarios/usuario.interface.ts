export type Rol = 'usuario' | 'admin' | 'zombie';

/**
 * Un logro del usuario. Hoy solo existe `superviviente-zombie`.
 *
 * `lapidaId` y `obtenidaEn` no son decoración: sin ellos, la UI no puede decir
 * *cuándo* se obtuvo el logro ni *qué* lápida lo disparó, y el perfil tendría
 * que mostrar la insignia sin contexto.
 */
export interface InsigniaUsuario {
  /** Identificador estable del logro, p. ej. `superviviente-zombie`. */
  codigo: string;
  /** Qué lápida lo disparó. */
  lapidaId: number;
  /** Fecha ISO del primer rescate que lo otorgó. */
  obtenidaEn: string;
}

/** Usuario tal como lo ve el dominio y la API. Nunca expone `passwordHash`. */
export interface Usuario {
  id: string;
  username: string;
  rol: Rol;
  /**
   * Logros obtenidos. Siempre presente, `[]` cuando no tiene ninguno: el front
   * no tiene que defenderse de `undefined`.
   */
  insignias: InsigniaUsuario[];
}
