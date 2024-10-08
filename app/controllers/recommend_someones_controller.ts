// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { createRecommendedValidator } from '#validators/recommend_someone'
import Recommended from '#models/recommended'
import Registration from '#models/registration'
import { simpleFilter } from 'adonisjs-filters'

export default class RecommendSomeonesController {
  async create(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createRecommendedValidator)
    return await Recommended.create(data)
  }

  async getAll(ctx: HttpContext) {
    let baseQuery = Recommended.query().preload('instruments')

    return await simpleFilter(
      ctx,
      baseQuery,
      ['first_name', 'last_name', 'email', 'messenger', 'phone', 'project_id'],
      [{ relationColumns: ['family', 'name'], relationName: 'instruments' }]
    )
  }

  async getOne({ params }: HttpContext) {
    const data = await Registration.query().where('id', params.id)
    return data
  }

  async delete({ params, response }: HttpContext) {
    let person = await Recommended.find(params.id)
    person?.delete()
    return response.send('recommended person deleted')
  }
}
