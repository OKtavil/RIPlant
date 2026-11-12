import { LapidaSchema } from './lapida.schema';

/**
 * Contrato de índices del esquema. No valida contra Mongo: lee las
 * declaraciones que Mongoose va a construir, que es la fuente de verdad del
 * contrato (las construye `autoIndex` al arrancar).
 */
describe('LapidaDocumentModel (índices)', () => {
  it('indexa fechaPublicacion, que es el orden del cementerio', () => {
    // `LapidasService.findAll` ordena por `fechaPublicacion` descendente en
    // **cada** carga del cementerio. Sin índice, Mongo resuelve ese orden en
    // memoria después de leer la colección entera (D002). Un índice ascendente
    // sirve para el orden descendente porque Mongo lo recorre al revés.
    const indice = LapidaSchema.indexes().find(([campos]) => 'fechaPublicacion' in campos);

    expect(indice).toBeDefined();
  });
});
