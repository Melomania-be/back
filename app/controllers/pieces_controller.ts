import Piece from '#models/piece'
import Folder from '#models/folder'
import Composer from '#models/composer'
import TypeOfPiece from '#models/type_of_piece'
import { HttpContext } from '@adonisjs/core/http'
import { createPieceValidator } from '#validators/piece'
import { simpleFilter, Filter, RelationFilter } from '#services/simple_filter'

export default class PiecesController {
  async getAll(ctx: HttpContext) {
    let baseQuery = Piece.query()
      .preload('sections')
      .preload('typeOfPiece')
      .preload('composer')
      .preload('folder')

    return await simpleFilter(
      ctx,
      Piece,
      baseQuery,
      new Filter(Piece, ['name', 'opus', 'year_of_composition', 'composer_id', 'arranger']),
      [
        new RelationFilter('typeOfPiece', TypeOfPiece, ['name']),
        new RelationFilter('composer', Composer, [
          'short_name',
          'long_name',
          'birth_date',
          'death_date',
          'country',
          'main_style',
        ]),
        new RelationFilter('folder', Folder, ['name']),
      ],
      {
        filtered: true,
        paginated: false,
        ordered: true,
      }
    )
  }

  async createOrUpdate(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createPieceValidator)

    if (data.id === undefined) {
      return await Piece.create(data)
    }

    const piece = await Piece.firstOrCreate({ id: data.id }, data)

    if (piece.$isLocal) {
      return piece
    }

    piece.merge(data)
    await piece.save()
    return piece
  }

  async delete({ params, response }: HttpContext) {
    let piece = await Piece.find(params.id)
    piece?.delete()
    return response.send('piece deleted')
  }
}
