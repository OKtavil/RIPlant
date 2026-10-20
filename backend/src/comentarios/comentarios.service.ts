import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LapidaDocument, LapidaDocumentModel } from '../lapidas/lapida.schema';
import { Comentario } from './comentario.interface';
import {
  ComentarioDocument,
  ComentarioDocumentModel,
} from './comentario.schema';
import { CreateComentarioDto } from './create-comentario.dto';

/** El `_id` de Mongo expuesto al cliente como `id`. */
function aComentario(doc: {
  _id: unknown;
  lapidaId: number;
  usuarioId: string;
  autor: string;
  texto: string;
  creadoEn: Date;
}): Comentario {
  const { _id, ...resto } = doc;
  return { id: String(_id), ...resto };
}

@Injectable()
export class ComentariosService {
  constructor(
    @InjectModel(ComentarioDocumentModel.name)
    private readonly comentarioModel: Model<ComentarioDocument>,
    @InjectModel(LapidaDocumentModel.name)
    private readonly lapidaModel: Model<LapidaDocument>,
  ) {}

  /**
   * `GET /lapidas/:id/comentarios`: público y en orden de fecha ascendente.
   * Una lápida que no existe da 404 en vez de una lista vacía, que mentiría
   * sobre el estado del recurso.
   */
  async listar(lapidaId: number): Promise<Comentario[]> {
    await this.exigirLapida(lapidaId);
    const comentarios = await this.comentarioModel
      .find({ lapidaId })
      .sort({ creadoEn: 1 })
      .lean();
    return comentarios.map(aComentario);
  }

  /**
   * `POST /lapidas/:id/comentarios`. El `autor` y el `usuarioId` salen de la
   * sesión y no del cuerpo (S6): lo único que el cliente puede decidir es el
   * texto. Dejar que mande el autor sería firmar un comentario con el nombre
   * de otro.
   */
  async crear(
    lapidaId: number,
    sesion: { usuario: { id: string; username: string } },
    dto: CreateComentarioDto,
  ): Promise<Comentario> {
    await this.exigirLapida(lapidaId);
    const creado = await this.comentarioModel.create({
      lapidaId,
      usuarioId: sesion.usuario.id,
      autor: sesion.usuario.username,
      texto: dto.texto,
      creadoEn: new Date(),
    });
    return aComentario(creado.toObject());
  }

  /**
   * `DELETE /comentarios/:id`: solo admin, vía `AdminMiddleware`. El autor no
   * borra el suyo (D5), así que acá no se compara ningún `usuarioId` contra la
   * sesión: quien llega hasta acá ya es admin.
   *
   * Usa `deleteOne` y no `findOneAndDelete` a propósito. Con el `_id` como
   * string, `findOneAndDelete(...).lean()` **borra el documento y devuelve
   * `null`**, así que confiar en el retorno borra el comentario y responde 404
   * igual. `deletedCount` es el único resultado que dice la verdad.
   */
  async borrar(id: string): Promise<{ id: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Id de comentario inválido');
    }
    const { deletedCount } = await this.comentarioModel.deleteOne({ _id: id });
    if (deletedCount === 0) {
      throw new NotFoundException('Comentario no encontrado');
    }
    return { id };
  }

  private async exigirLapida(lapidaId: number): Promise<void> {
    const lapida = await this.lapidaModel.findOne({ id: lapidaId }).lean();
    if (!lapida) throw new NotFoundException('Lápida no encontrada');
  }
}
