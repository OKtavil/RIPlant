import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UsuarioDocumentModel } from '../usuarios/usuario.schema';
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
  constructor(
    @InjectModel(LapidaDocumentModel.name)
    private readonly lapidaModel: Model<LapidaDocument>,
    @InjectModel(UsuarioDocumentModel.name)
    private readonly usuarioModel: Model<any>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.sembrarUsuarioZombie();
    await this.migrarHuerfanasAlZombie();
    await this.sembrarDatos();
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
      fotoUrl: dto.fotoUrl || '',
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
          fotoUrl: dto.fotoUrl ?? '',
        },
        { new: true, runValidators: true },
      )
      .lean();
    if (!lapida) throw new NotFoundException('Lápida no encontrada');
    return lapida;
  }

  async remove(id: number): Promise<Lapida> {
    const lapida = await this.lapidaModel.findOneAndDelete({ id }).lean();
    if (!lapida) throw new NotFoundException('Lápida no encontrada');
    return lapida;
  }

  async giveCorona(id: number): Promise<Lapida> {
    const lapida = await this.lapidaModel
      .findOneAndUpdate({ id }, { $inc: { coronasCount: 1 } }, { new: true })
      .lean();
    if (!lapida) throw new NotFoundException('Lápida no encontrada');
    return lapida;
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
