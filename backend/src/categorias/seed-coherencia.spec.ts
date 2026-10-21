import { CategoriasService } from './categorias.service';
import { LapidasService } from '../lapidas/lapidas.service';

/**
 * Las dos seeds son la fuente de los datos de desarrollo y se escribieron por
 * separado, así que pueden desincronizarse sin que ningún test lo note: el seed
 * de lápidas referencia `categoriaId` por número, y si la categoría no existe,
 * el filtro del front recibe un id crudo y la lápida queda huérfana.
 *
 * Ya pasó dos veces. Primero el seed de lápidas pasó a referenciar los ids 3 a 6
 * cuando solo existían 2 categorías. Después las categorías se renombraron de
 * causas de muerte a tipos de planta, y el mapeo lápida → tipo quedó sin ningún
 * sentido (un helecho clasificado como cactus).
 *
 * Este test lee lo que cada seed **declara**, que es exactamente el dato que se
 * desincroniza, sin tocar la base.
 */
describe('Coherencia entre el seed de categorías y el de lápidas', () => {
  const ID_USUARIO = '6ad6c0b98e97ab31963b41e0';

  /** Categorías declaradas, tal como quedan en la base: id → nombre. */
  const categoriasSembradas = async (): Promise<Map<number, string>> => {
    const model = { bulkWrite: jest.fn().mockResolvedValue({}) };
    const service = new CategoriasService(model as never);
    await service.onModuleInit();
    const [operaciones] = model.bulkWrite.mock.calls[0] as [any[]];
    const mapa = new Map<number, string>();
    for (const op of operaciones) {
      mapa.set(op.updateOne.filter.id, op.updateOne.update.$set.nombre);
    }
    return mapa;
  };

  /** Lápidas declaradas por el seed: nombre de planta → categoriaId. */
  const lapidasSembradas = async (): Promise<
    Array<{ nombre: string; categoriaId: number }>
  > => {
    // Mocks calcados del uso real (verificado ejecutando el seed): usuarios se
    // consulta con `.lean()` cuatro veces (zombie, admin, jardinera, zombie) y
    // el modelo de coronas se inicializa para esperar su índice único.
    const usuarioModel = {
      findOne: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue({ _id: ID_USUARIO }),
      })),
      updateOne: jest.fn().mockResolvedValue({}),
    };
    const lapidaModel = {
      updateOne: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
      find: jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      })),
    };
    const coronaModel = { init: jest.fn().mockResolvedValue(undefined) };

    const service = new LapidasService(
      lapidaModel as never,
      usuarioModel as never,
      coronaModel as never,
      {} as never,
      {} as never,
    );
    await service.onModuleInit();

    return lapidaModel.updateOne.mock.calls
      .map(([, update]: [unknown, { $setOnInsert?: any }]) => update?.$setOnInsert)
      .filter((doc: any) => doc?.nombrePlanta)
      .map((doc: any) => ({
        nombre: doc.nombrePlanta,
        categoriaId: doc.categoriaId,
      }));
  };

  it('no referencia ninguna categoría que el seed de categorías no cree', async () => {
    const categorias = await categoriasSembradas();
    const lapidas = await lapidasSembradas();

    expect(lapidas.length).toBeGreaterThan(0);
    const huerfanas = lapidas.filter((l) => !categorias.has(l.categoriaId));
    expect(huerfanas).toEqual([]);
  });

  /**
   * El error que este test atrapa: al renombrar las categorías a tipos de planta,
   * los `categoriaId` de las lápidas quedaron del vocabulario viejo, así que el
   * mapeo apuntaba a tipos al azar (un cactus en `Helechos`, una albahaca en
   * `Árboles`). Un id existente no alcanza: el tipo tiene que concordar.
   */
  it('clasifica cada planta sembrada en un tipo que le corresponde', async () => {
    const categorias = await categoriasSembradas();
    const lapidas = await lapidasSembradas();

    // Tipo esperado por planta. Es la afirmación del seed, escrita a mano a
    // propósito: un test que derivara el tipo del nombre de la planta estaría
    // repitiendo la lógica que quiere verificar.
    const tipoEsperado: Record<string, string> = {
      'Cactusus Maximus': 'Cactus',
      Fernanda: 'Helechos',
      'Echeveria Rebelde': 'Suculentas',
      'Helecho Brote Triste': 'Helechos',
      'Tomatera Melancólica': 'Aromáticas',
      'Helecho Nostálgico': 'Helechos',
      'Jazmín Desaparecido': 'Trepadoras',
      'Cilantro Olvidado': 'Aromáticas',
      'Orégano Valiente': 'Aromáticas',
      'Roble Soñador': 'Árboles',
    };

    for (const lapida of lapidas) {
      const esperado = tipoEsperado[lapida.nombre];
      expect(esperado).toBeDefined();
      expect(categorias.get(lapida.categoriaId)).toBe(esperado);
    }
  });

  /**
   * Un tipo sin ninguna lápida deja el filtro del front con una opción que
   * siempre devuelve vacío: parece un bug y es un dato que falta.
   */
  it('usa todos los tipos sembrados, para que ningún filtro quede vacío', async () => {
    const categorias = await categoriasSembradas();
    const lapidas = await lapidasSembradas();
    const usadas = new Set(lapidas.map((l) => l.categoriaId));

    const sinUsar = [...categorias.entries()]
      .filter(([id]) => !usadas.has(id))
      .map(([, nombre]) => nombre);

    expect(sinUsar).toEqual([]);
  });
});
