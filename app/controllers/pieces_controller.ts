import Piece from '#models/piece'
import { HttpContext } from '@adonisjs/core/http'
import { createPieceValidator } from '#validators/piece'
import { simpleFilter } from 'adonisjs-filters'

export default class PiecesController {
  async getAll(ctx: HttpContext) {
    const organizationId = ctx.auth.user?.organizationId

    let baseQuery = Piece.query()
      .if(organizationId, (query) => query.where('organization_id', organizationId!))
      .preload('projects')
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
    const organizationId = ctx.auth.user?.organizationId

    if (data.id === undefined) {
      return await Piece.create({ ...data, organizationId })
    }

    const piece = await Piece.query()
      .where('id', data.id)
      .if(organizationId, (query) => query.where('organization_id', organizationId!))
      .firstOrFail()

    piece.merge(data)
    await piece.save()
    return piece
  }

  async delete({ params, response, auth }: HttpContext) {
    const organizationId = auth.user?.organizationId

    let piece = await Piece.query()
      .where('id', params.id)
      .if(organizationId, (query) => query.where('organization_id', organizationId!))
      .first()

    await piece?.delete()
    return response.send('piece deleted')
  }
}