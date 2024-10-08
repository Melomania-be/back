import Piece from '#models/piece'
import { HttpContext } from '@adonisjs/core/http'
import { createPieceValidator } from '#validators/piece'
import { simpleFilter } from 'adonisjs-filters'

export default class PiecesController {
  async getAll(ctx: HttpContext) {
    let baseQuery = Piece.query()
      .preload('sections')
      .preload('typeOfPiece')
      .preload('composer')
      .preload('folder')

    const filter = await simpleFilter(
      ctx,
      baseQuery,
      ['name', 'opus', 'year_of_composition', 'composer_id', 'arranger'],
      [{ relationColumns: ['long_name'], relationName: 'composer' }]
    )

    return await filter
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
