// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from '@adonisjs/core/http'
import { createRecommendedValidator } from '#validators/recommend_someone'
import Recommended from '#models/recommended'
import Registration from '#models/registration'

export default class RecommendSomeonesController {
  async create(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createRecommendedValidator)
    return await Recommended.create(data)
  }

  async getAll() {
    return await Recommended.query()
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
