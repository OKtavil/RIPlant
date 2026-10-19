import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateLapidaDto } from './create-lapida.dto';
import { Lapida } from './lapida.interface';
import { LapidaDocument, LapidaDocumentModel } from './lapida.schema';

@Injectable()
export class LapidasService {
  constructor(
    @InjectModel(LapidaDocumentModel.name)
    private readonly lapidaModel: Model<LapidaDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.lapidaModel.bulkWrite([
        {
          updateOne: {
            filter: { id: 1 },
            update: {
              $setOnInsert: {
                id: 1,
                nombrePlanta: 'Cactusus Maximus',
                epitafio: 'Vivió con sed, murió con dignidad.',
                fechaFallecimiento: '2024-05-14',
                fechaPublicacion: '2024-05-15',
                autor: 'Rosa Verde',
                categoriaId: 1,
                causaMuerte: 'Exceso de cariño',
                fotoUrl: '',
                coronasCount: 12,
              },
            },
            upsert: true,
          },
        },
        {
          updateOne: {
            filter: { id: 2 },
            update: {
              $setOnInsert: {
                id: 2,
                nombrePlanta: 'Fernanda',
                epitafio: 'Aquí yace quien nunca recibió suficiente luz.',
                fechaFallecimiento: '2024-06-02',
                fechaPublicacion: '2024-06-03',
                autor: 'Tito Maceta',
                categoriaId: 2,
                causaMuerte: 'Falta de sol',
                fotoUrl: '',
                coronasCount: 8,
              },
            },
            upsert: true,
          },
        },
      ]);
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  }

  async findAll(): Promise<ReadonlyArray<Lapida>> {
    return this.lapidaModel.find().sort({ fechaPublicacion: -1 }).lean();
  }

  async findOne(id: number): Promise<Lapida> {
    const lapida = await this.lapidaModel.findOne({ id }).lean();
    if (!lapida) throw new NotFoundException('Lápida no encontrada');
    return lapida;
  }

  async create(dto: CreateLapidaDto): Promise<Lapida> {
    const ultimo = await this.lapidaModel.findOne().sort({ id: -1 }).lean();
    const lapida = await this.lapidaModel.create({
      ...dto,
      id: (ultimo?.id ?? 0) + 1,
      autor: dto.autor || 'Jardinero anónimo',
      fotoUrl: dto.fotoUrl || '',
      fechaPublicacion: new Date().toISOString().slice(0, 10),
      coronasCount: 0,
    });
    return lapida.toObject();
  }

  async update(id: number, dto: CreateLapidaDto): Promise<Lapida> {
    const lapida = await this.lapidaModel.findOneAndUpdate(
      { id },
      { ...dto, autor: dto.autor || 'Jardinero anónimo', fotoUrl: dto.fotoUrl || '' },
      { new: true, runValidators: true },
    ).lean();
    if (!lapida) throw new NotFoundException('Lápida no encontrada');
    return lapida;
  }

  async remove(id: number): Promise<Lapida> {
    const lapida = await this.lapidaModel.findOneAndDelete({ id }).lean();
    if (!lapida) throw new NotFoundException('Lápida no encontrada');
    return lapida;
  }

  async giveCorona(id: number): Promise<Lapida> {
    const lapida = await this.lapidaModel.findOneAndUpdate(
      { id },
      { $inc: { coronasCount: 1 } },
      { new: true },
    ).lean();
    if (!lapida) throw new NotFoundException('Lápida no encontrada');
    return lapida;
  }
}
