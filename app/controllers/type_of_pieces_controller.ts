import TypeOfPiece from '#models/type_of_piece'
import { HttpContext } from '@adonisjs/core/http'
import { createTypeOfPieceValidator } from '#validators/type_of_piece'
import { simpleFilter } from 'adonisjs-filters'

export default class TypeOfPiecesController {
  async getAll(ctx: HttpContext) {
    let baseQuery = TypeOfPiece.query()

    return await simpleFilter(ctx, baseQuery, ['name'], [], {
      filtered: true,
      paginated: true,
      ordered: true,
    })
  }

  async createOrUpdate(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createTypeOfPieceValidator)

    if (data.id === undefined) {
      return await TypeOfPiece.create(data)
    }

    const type = await TypeOfPiece.firstOrCreate({ id: data.id }, data)

    if (type.$isLocal) {
      return type
    }

    type.merge(data)
    await type.save()
    return type
  }

  async delete({ params, response }: HttpContext) {
    let type = await TypeOfPiece.find(params.id)
    type?.delete()
    return response.send('Type deleted')
  }
}
