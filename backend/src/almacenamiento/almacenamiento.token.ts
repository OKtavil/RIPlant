/**
 * Token de inyección del almacenamiento de fotos. Se usa un token explícito en
 * vez de la clase concreta para que los controladores y servicios dependan de
 * la interfaz: cambiar a S3/R2 es cambiar el provider de `AlmacenamientoModule`.
 */
export const ALMACENAMIENTO = Symbol('AlmacenamientoService');
