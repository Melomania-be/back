import { HttpContext } from '@adonisjs/core/http'
import { createRecommendedValidator } from '#validators/recommend_someone'
import Recommended from '#models/recommended'
import Registration from '#models/registration'
import { simpleFilter } from 'adonisjs-filters'

export default class RecommendSomeonesController {

  // Action PUBLIQUE (Le formulaire de recommandation)
  async create({ request }: HttpContext) {
    const data = await request.validateUsing(createRecommendedValidator)
    return await Recommended.create(data)
  }

  async getAll(ctx: HttpContext) {
    await (ctx.bouncer as any).authorize('adminRights')
    let baseQuery = Recommended.query().preload('instruments')

    return await simpleFilter(
      ctx,
      baseQuery,
      ['first_name', 'last_name', 'email', 'messenger', 'phone', 'project_id'],
      [{ relationColumns: ['family', 'name'], relationName: 'instruments' }]
    )
  }

  async getOne({ params, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    // Avertissement : Le code original interrogeait Registration ici. Je le conserve tel quel.
    return await Registration.query().where('id', params.id)
  }

  async delete({ params, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    let person = await Recommended.find(params.id)
    person?.delete()
    return response.send('recommended person deleted')
  }
}