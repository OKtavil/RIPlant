import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AlmacenamientoService } from '../almacenamiento/almacenamiento.interface';
import { ALMACENAMIENTO } from '../almacenamiento/almacenamiento.token';
import { ComentarioDocument, ComentarioDocumentModel } from '../comentarios/comentario.schema';
import { UsuarioDocumentModel } from '../usuarios/usuario.schema';
import { CoronaDocument, CoronaDocumentModel } from './corona.schema';
import { CreateLapidaDto } from './create-lapida.dto';
import { Lapida } from './lapida.interface';
import { LapidaDocument, LapidaDocumentModel } from './lapida.schema';

/**
 * Usuario reservado para las lápidas huérfanas (D-008). Nunca puede iniciar
 * sesión y no autoriza nada. Las lápidas sin dueño se le entregan aquí.
 */
const USUARIO_ZOMBIE = 'zombie';
const USUARIO_JARDINERA = 'jardinera';

type DuenioInfo = { username: string; rol: string } | undefined;

@Injectable()
export class LapidasService {
  private readonly logger = new Logger(LapidasService.name);

  constructor(
    @InjectModel(LapidaDocumentModel.name)
    private readonly lapidaModel: Model<LapidaDocument>,
    @InjectModel(UsuarioDocumentModel.name)
    private readonly usuarioModel: Model<any>,
    @InjectModel(CoronaDocumentModel.name)
    private readonly coronaModel: Model<CoronaDocument>,
    @InjectModel(ComentarioDocumentModel.name)
    private readonly comentarioModel: Model<ComentarioDocument>,
    @Inject(ALMACENAMIENTO)
    private readonly almacenamiento: AlmacenamientoService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.esperarIndicesDeCorona();
    await this.sembrarUsuarioZombie();
    await this.migrarHuerfanasAlZombie();
    await this.sembrarDatos();
  }

  /**
   * Espera a que el índice único de `coronas` esté construido **antes** de que
   * la aplicación acepte escrituras.
   *
   * **Por qué (bug real, no teórico).** `autoIndex` de Mongoose es `true` por
   * defecto, pero construye los índices **en segundo plano**: la conexión queda
   * lista y la app empieza a recibir requests mientras el índice todavía se
   * está creando. `giveCorona` documenta que la unicidad la garantiza el índice
   * —no una consulta previa, que tiene carrera entre leer y escribir— y esa
   * afirmación **solo es cierta si el índice ya existe**.
   *
   * Se manifiesta de verdad: en una base **nueva**, dos `POST /lapidas/:id/corona`
   * del mismo usuario pueden llegar antes de que el índice esté listo. La
   * segunda inserción no da `11000` y se guarda una corona duplicada. No es
   * hipotético: es lo que hacía fallar `lapidas.e2e-spec.ts` de forma
   * determinista cuando las cinco suites e2e corrían en paralelo (medido: al
   * momento del primer `POST` existían `_id` y `lapidaId`, pero todavía **no**
   * el compuesto `{lapidaId, usuarioId}`).
   *
   * `Model.init()` espera a que terminen de construirse los índices de ese
   * modelo; a diferencia de `syncIndexes()`, no compara ni borra índices
   * existentes, así que no toca nada de la base en cada arranque.
   */
  private async esperarIndicesDeCorona(): Promise<void> {
    try {
      await this.coronaModel.init();
    } catch (error) {
      // Si el índice no se puede construir (por ejemplo, ya hay duplicados
      // históricos que lo violan), no se tumba el arranque: se avisa fuerte y
      // la app sigue. Antes esta situación pasaba **en silencio**, que es peor:
      // la invariante quedaba rota sin que nadie se enterara.
      this.logger.error(
        'No se pudo construir el índice único de coronas: la unicidad "una corona por usuario y lápida" NO está garantizada',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async sembrarUsuarioZombie(): Promise<void> {
    // Siembra idempotente, mismo patrón que el admin.
    await this.usuarioModel.updateOne(
      { username: USUARIO_ZOMBIE },
      {
        $set: { rol: 'zombie' },
        $setOnInsert: {
          username: USUARIO_ZOMBIE,
          passwordHash: await this.hashIntratable(),
          creadoEn: new Date(),
        },
      },
      { upsert: true },
    );

    await this.usuarioModel.updateOne(
      { username: USUARIO_JARDINERA },
      {
        $set: { rol: 'usuario' },
        $setOnInsert: {
          username: USUARIO_JARDINERA,
          passwordHash: await this.hashIntratable(),
          creadoEn: new Date(),
        },
      },
      { upsert: true },
    );
  }

  private async hashIntratable(): Promise<string> {
    const { hashPassword } = require('../usuarios/password');
    return hashPassword(randomHex());
  }

  private async migrarHuerfanasAlZombie(): Promise<void> {
    const zombie = await this.usuarioModel.findOne({ username: USUARIO_ZOMBIE }).lean();
    if (!zombie) return;
    const zombieId = String((zombie as any)._id);

    // Lápidas sin usuarioId o con usuarioId que ya no existe → van al zombie.
    const huérfanas = await this.lapidaModel
      .find({
        $or: [
          { usuarioId: { $exists: false } },
          { usuarioId: null },
          { usuarioId: '' },
        ],
      })
      .select('usuarioId')
      .lean();

    if (huérfanas.length > 0) {
      await this.lapidaModel.updateMany(
        { _id: { $in: (huérfanas as any[]).map((l: any) => l._id) } },
        { $set: { usuarioId: zombieId } },
      );
    }
  }

  private async sembrarDatos(): Promise<void> {
    const admin = await this.usuarioModel.findOne({ username: 'admin' }).lean();
    const jardinera = await this.usuarioModel
      .findOne({ username: USUARIO_JARDINERA })
      .lean();
    const zombie = await this.usuarioModel.findOne({ username: USUARIO_ZOMBIE }).lean();

    const adminId = admin ? String((admin as any)._id) : undefined;
    const jardineraId = jardinera ? String((jardinera as any)._id) : undefined;
    const zombieId = zombie ? String((zombie as any)._id) : undefined;

    const sembrar = [
      {
        id: 1,
        nombrePlanta: 'Cactusus Maximus',
        epitafio: 'Vivió con sed, murió con dignidad.',
        fechaFallecimiento: '2024-05-14',
        fechaPublicacion: '2024-05-15',
        autor: 'Rosa Verde',
        usuarioId: adminId || jardineraId || zombieId,
        categoriaId: 1,
        causaMuerte: 'Exceso de cariño',
        fotoUrl: '',
        coronasCount: 12,
      },
      {
        id: 2,
        nombrePlanta: 'Fernanda',
        epitafio: 'Aquí yace quien nunca recibió suficiente luz.',
        fechaFallecimiento: '2024-06-02',
        fechaPublicacion: '2024-06-03',
        autor: 'Tito Maceta',
        usuarioId: jardineraId || adminId || zombieId,
        categoriaId: 2,
        causaMuerte: 'Falta de sol',
        fotoUrl: '',
        coronasCount: 8,
      },
      {
        id: 3,
        nombrePlanta: 'Margarita Rebelde',
        epitafio: 'Se negó a crecer en maceta.',
        fechaFallecimiento: '2024-07-01',
        fechaPublicacion: '2024-07-02',
        autor: 'Jardinera',
        usuarioId: jardineraId || adminId || zombieId,
        categoriaId: 1,
        causaMuerte: 'Viento furioso',
        fotoUrl: '',
        coronasCount: 5,
      },
      {
        id: 4,
        nombrePlanta: 'Brote Triste',
        epitafio: 'Prometía mucho, dio poco.',
        fechaFallecimiento: '2024-08-10',
        fechaPublicacion: '2024-08-11',
        autor: 'Rosa Verde',
        usuarioId: adminId || zombieId,
        categoriaId: 3,
        causaMuerte: 'Olvido',
        fotoUrl: '',
        coronasCount: 3,
      },
      {
        id: 5,
        nombrePlanta: 'Tomatera Melancólica',
        epitafio: 'Soñaba con ser gazpacho.',
        fechaFallecimiento: '2024-09-05',
        fechaPublicacion: '2024-09-06',
        autor: 'Tito Maceta',
        usuarioId: jardineraId || zombieId,
        categoriaId: 4,
        causaMuerte: 'Helada prematura',
        fotoUrl: '',
        coronasCount: 15,
      },
      {
        id: 6,
        nombrePlanta: 'Helecho Nostálgico',
        epitafio: 'Extrañaba el bosque.',
        fechaFallecimiento: '2024-10-01',
        fechaPublicacion: '2024-10-02',
        autor: 'Jardinera',
        usuarioId: jardineraId || zombieId,
        categoriaId: 2,
        causaMuerte: 'Calor excesivo',
        fotoUrl: '',
        coronasCount: 0,
      },
      {
        id: 7,
        nombrePlanta: 'Perejil Desaparecido',
        epitafio: 'Nadie sabe dónde fue.',
        fechaFallecimiento: '2024-11-12',
        fechaPublicacion: '2024-11-13',
        autor: 'Desconocido',
        usuarioId: zombieId,
        categoriaId: 1,
        causaMuerte: 'Misterio',
        fotoUrl: '',
        coronasCount: 2,
      },
      {
        id: 8,
        nombrePlanta: 'Cilantro Olvidado',
        epitafio: 'Un héroe anónimo.',
        fechaFallecimiento: '2024-12-03',
        fechaPublicacion: '2024-12-04',
        autor: 'Anónimo',
        usuarioId: zombieId,
        categoriaId: 3,
        causaMuerte: '',
        fotoUrl: '',
        coronasCount: 1,
      },
      {
        id: 9,
        nombrePlanta: 'Orégano Valiente',
        epitafio: 'Murió aromático.',
        fechaFallecimiento: '2025-01-08',
        fechaPublicacion: '2025-01-09',
        autor: 'Rosa Verde',
        usuarioId: adminId || jardineraId || zombieId,
        categoriaId: 5,
        causaMuerte: 'Ataque de babosas',
        fotoUrl: '',
        coronasCount: 7,
      },
      {
        id: 10,
        nombrePlanta: 'Albahaca Soñadora',
        epitafio: 'Quería ser pesto.',
        fechaFallecimiento: '2025-02-14',
        fechaPublicacion: '2025-02-15',
        autor: 'Jardinera',
        usuarioId: jardineraId || zombieId,
        categoriaId: 6,
        causaMuerte: 'Día de San Valentín trágico',
        fotoUrl: '',
        coronasCount: 9,
      },
    ];

    try {
      for (const l of sembrar) {
        if (!l.usuarioId) continue;
        await this.lapidaModel.updateOne(
          { id: l.id },
          { $setOnInsert: { ...l } },
          { upsert: true },
        );
      }
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  }

  async findAll(): Promise<ReadonlyArray<Lapida>> {
    const lapidas = await this.lapidaModel
      .find()
      .sort({ fechaPublicacion: -1 })
      .lean();
    return this.enriquecerConDuenio(lapidas);
  }

  async findOne(id: number): Promise<Lapida> {
    const lapida = await this.lapidaModel.findOne({ id }).lean();
    if (!lapida) throw new NotFoundException('Lápida no encontrada');
    const [enriquecida] = await this.enriquecerConDuenio([lapida]);
    return enriquecida;
  }

  async create(dto: CreateLapidaDto, sesion: { usuario: { id: string; username: string } }): Promise<Lapida> {
    const ultimo = await this.lapidaModel.findOne().sort({ id: -1 }).lean();
    const lapida = await this.lapidaModel.create({
      id: (ultimo?.id ?? 0) + 1,
      nombrePlanta: dto.nombrePlanta,
      epitafio: dto.epitafio,
      fechaFallecimiento: dto.fechaFallecimiento,
      fechaPublicacion: new Date().toISOString().slice(0, 10),
      autor: sesion.usuario.username,
      usuarioId: sesion.usuario.id,
      categoriaId: dto.categoriaId,
      causaMuerte: dto.causaMuerte ?? '',
      // S8: la foto solo entra por POST /lapidas/:id/foto; el cuerpo se ignora.
      fotoUrl: '',
      coronasCount: 0,
    });
    return lapida.toObject();
  }

  async update(id: number, dto: CreateLapidaDto): Promise<Lapida> {
    const lapida = await this.lapidaModel
      .findOneAndUpdate(
        { id },
        {
          nombrePlanta: dto.nombrePlanta,
          epitafio: dto.epitafio,
          fechaFallecimiento: dto.fechaFallecimiento,
          categoriaId: dto.categoriaId,
          causaMuerte: dto.causaMuerte ?? '',
          // S8: actualizar la lápida no toca la foto; para eso está el endpoint.
        },
        { new: true, runValidators: true },
      )
      .lean();
    if (!lapida) throw new NotFoundException('Lápida no encontrada');
    return lapida;
  }

  /**
   * S8: guarda los bytes de la foto con el almacenamiento configurado y
   * persiste la ruta pública en `fotoUrl`. La foto anterior se borra después
   * de persistir la nueva, best-effort: si el borrado falla, la lápida ya
   * apunta al archivo correcto y queda un huérfano en disco, que es el modo de
   * falla inocuo.
   */
  async asignarFoto(id: number, buffer: Buffer): Promise<Lapida> {
    const lapida = await this.lapidaModel.findOne({ id }).lean();
    if (!lapida) throw new NotFoundException('Lápida no encontrada');

    const fotoAnterior = (lapida as { fotoUrl?: string }).fotoUrl;
    const imagen = await this.almacenamiento.guardar(buffer);

    const actualizada = await this.lapidaModel
      .findOneAndUpdate(
        { id },
        { fotoUrl: imagen.rutaPublica },
        { new: true, runValidators: true },
      )
      .lean();

    if (fotoAnterior && fotoAnterior !== imagen.rutaPublica) {
      await this.almacenamiento.borrar(fotoAnterior);
    }

    return actualizada as Lapida;
  }

  async remove(id: number): Promise<Lapida> {
    const lapida = await this.lapidaModel.findOneAndDelete({ id }).lean();
    if (!lapida) throw new NotFoundException('Lápida no encontrada');
    // S6: borrar una lápida borra también sus comentarios. Sin esta cascada
    // quedan documentos huérfanos que reaparecerían en cualquier lápida que
    // reutilice ese id — los ids de lápida se asignan como máximo + 1, así que
    // borrar la última y crear otra repite el número.
    await this.comentarioModel.deleteMany({ lapidaId: id });
    // S8: la foto también se va con la lápida, best-effort.
    await this.almacenamiento.borrar((lapida as { fotoUrl?: string }).fotoUrl);
    return lapida;
  }

  /**
   * Da una corona. **Idempotente**: si este usuario ya coronó esta lápida, no
   * inserta de nuevo y devuelve el estado actual en vez de un `409`.
   *
   * Por qué idempotente y no `409` (decisión del usuario): el front alterna
   * entre poner y quitar corona con un click, así que un doble click o un
   * reintento del cliente HTTP es un caso *esperable*, no excepcional. Con
   * `409`, el segundo request mostraba un error por algo que el usuario no hizo
   * mal.
   *
   * La unicidad la garantiza el índice compuesto `lapidaId + usuarioId`, no una
   * consulta previa: una consulta previa tiene una carrera entre leer y
   * escribir y el índice no. El código 11000 es la señal de "ya estaba", que
   * ahora se traduce a un `200` con el estado actual.
   *
   * Primero se registra la corona y recién después se incrementa
   * `coronasCount`, para que el contador nunca se adelante al registro que lo
   * justifica.
   *
   * Nota: las coronas dadas antes de que existiera esta colección no tienen
   * dueño registrado, así que `coronasCount` puede ser mayor que la cantidad de
   * documentos en `coronas`. Es una inconsistencia conocida y no se reconstruye.
   */
  async giveCorona(
    id: number,
    sesion: { usuario: { id: string; username: string } },
  ): Promise<{ lapida: Lapida; creada: boolean }> {
    const lapida = await this.lapidaModel.findOne({ id }).lean();
    if (!lapida) throw new NotFoundException('Lápida no encontrada');

    try {
      await this.coronaModel.create({
        lapidaId: id,
        usuarioId: sesion.usuario.id,
        creadaEn: new Date(),
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        // Ya tenía corona: no se inserta ni se incrementa. Se devuelve el
        // estado actual, que es lo que el front necesita para pintar.
        return {
          lapida: await this.conEstadoDeCorona(id, sesion.usuario.id),
          creada: false,
        };
      }
      throw error;
    }

    const coronada = await this.lapidaModel
      .findOneAndUpdate({ id }, { $inc: { coronasCount: 1 } }, { new: true })
      .lean();
    return {
      lapida: await this.marcarCoronadaPorMi(
        coronada as Lapida,
        sesion.usuario.id,
      ),
      creada: true,
    };
  }

  /**
   * Quita la corona de este usuario. **Idempotente**: si no la tenía, no toca
   * `coronasCount` y devuelve el estado actual.
   *
   * El filtro incluye `usuarioId`, así que un usuario solo puede borrar **su**
   * corona por construcción: no hace falta un middleware de dueño, que además
   * sería incorrecto (la corona es de quien la puso, no del dueño de la lápida).
   *
   * Se usa `deleteOne` y no `findOneAndDelete(...).lean()` porque con `_id`
   * como string, `findOneAndDelete` borra pero devuelve `null`: no habría forma
   * de saber si borró algo. `deletedCount` sí lo dice, y de eso depende no bajar
   * el contador de más — dos clicks rápidos sobre una corona inexistente lo
   * dejarían en negativo.
   */
  async removeCorona(
    id: number,
    sesion: { usuario: { id: string; username: string } },
  ): Promise<Lapida> {
    const lapida = await this.lapidaModel.findOne({ id }).lean();
    if (!lapida) throw new NotFoundException('Lápida no encontrada');

    const { deletedCount } = await this.coronaModel.deleteOne({
      lapidaId: id,
      usuarioId: sesion.usuario.id,
    });

    if (deletedCount === 0) {
      // No tenía corona: el contador no se toca.
      return this.marcarCoronadaPorMi(lapida as Lapida);
    }

    const sinCorona = await this.lapidaModel
      .findOneAndUpdate({ id }, { $inc: { coronasCount: -1 } }, { new: true })
      .lean();
    return this.marcarCoronadaPorMi(sinCorona as Lapida);
  }

  /** Agrega `coronadaPorMi` para que el front sepa si pintar la corona. */
  private async marcarCoronadaPorMi(
    lapida: Lapida,
    usuarioId?: string,
  ): Promise<Lapida> {
    if (!usuarioId) return { ...lapida, coronadaPorMi: false };
    const existe = await this.coronaModel.exists({
      lapidaId: lapida.id,
      usuarioId,
    });
    return { ...lapida, coronadaPorMi: Boolean(existe) };
  }

  /** La lápida con `coronadaPorMi` resuelto para este usuario. */
  private async conEstadoDeCorona(
    id: number,
    usuarioId: string,
  ): Promise<Lapida> {
    const lapida = await this.lapidaModel.findOne({ id }).lean();
    if (!lapida) throw new NotFoundException('Lápida no encontrada');
    return this.marcarCoronadaPorMi(lapida as Lapida, usuarioId);
  }

  async findById(id: number): Promise<LapidaDocument | null> {
    return this.lapidaModel.findOne({ id });
  }

  async findAsesinos(): Promise<Array<{ username: string; muertes: number }>> {
    const lapidas = await this.lapidaModel.find().lean();
    const zombie = await this.usuarioModel.findOne({ username: USUARIO_ZOMBIE }).lean();
    const zombieId = zombie ? String((zombie as any)._id) : undefined;

    const conteo = new Map<string, number>();
    for (const l of lapidas as any[]) {
      if (zombieId && String(l.usuarioId) === zombieId) continue;
      const uid = String(l.usuarioId);
      if (!uid) continue;
      conteo.set(uid, (conteo.get(uid) ?? 0) + 1);
    }

    const usuarios = await this.usuarioModel
      .find({ _id: { $in: Array.from(conteo.keys()).map((id) => new Types.ObjectId(id)) } })
      .lean();

    const porId = new Map<string, string>();
    for (const u of usuarios as any[]) porId.set(String(u._id), (u as any).username);

    const resultado = Array.from(conteo.entries())
      .map(([id, muertes]) => ({ username: porId.get(id) ?? 'Desconocido', muertes }))
      .sort((a, b) => b.muertes - a.muertes);
    return resultado.slice(0, 10);
  }

  private async enriquecerConDuenio(lapidas: any[]): Promise<ReadonlyArray<Lapida>> {
    const ids = Array.from(
      new Set(
        lapidas
          .map((l) => l.usuarioId)
          .filter(Boolean)
          .map((id) => String(id))
          .filter((id) => /^[0-9a-fA-F]{24}$/.test(id)),
      ),
    );
    if (ids.length === 0) return lapidas;

    const usuarios = await this.usuarioModel
      .find({ _id: { $in: ids.map((id) => new Types.ObjectId(id)) } })
      .select('username rol')
      .lean();

    const mapa = new Map<string, DuenioInfo>();
    for (const u of usuarios as any[]) {
      mapa.set(String(u._id), { username: u.username, rol: u.rol });
    }

    return lapidas.map((l) => ({
      ...l,
      duenio: mapa.get(String(l.usuarioId)),
    }));
  }
}

function randomHex(): string {
  const chars = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 64; i++) s += chars[Math.floor(Math.random() * 16)];
  return '$2b$10$' + s.slice(0, 22) + '.' + s.slice(22, 53);
}
