import Composer from '#models/composer'
import { HttpContext } from '@adonisjs/core/http'
import { createComposerValidator } from '#validators/composer'
import { simpleFilter } from 'adonisjs-filters'

export default class ComposersController {
  async getAll(ctx: HttpContext) {
    const organizationId = ctx.auth.user?.organizationId

    let baseQuery = Composer.query().if(organizationId, (query) =>
      query.where('organization_id', organizationId!)
    )

    let res = await simpleFilter(
      ctx,
      baseQuery,
      ['short_name', 'long_name', 'birth_date', 'death_date', 'country', 'main_style'],
      [],
      {
        filtered: true,
        paginated: true,
        ordered: true,
      }
    )
    console.log(res)
    return res
  }

  async createOrUpdate(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createComposerValidator)
    const organizationId = ctx.auth.user?.organizationId

    if (data.id === undefined) {
      return await Composer.create({ ...data, organizationId })
    }

    const composer = await Composer.query()
      .where('id', data.id)
      .if(organizationId, (query) => query.where('organization_id', organizationId!))
      .firstOrFail()

    composer.merge(data)
    await composer.save()
    return composer
  }

  async delete({ params, response, auth }: HttpContext) {
    const organizationId = auth.user?.organizationId
    const composerId = params.id

    const composer = await Composer.query()
      .where('id', composerId)
      .if(organizationId, (query) => query.where('organization_id', organizationId!))
      .firstOrFail()

    await composer.delete()
    return response.status(204)
  }

  async getPieces({ params, response, auth }: HttpContext) {
    const organizationId = auth.user?.organizationId

    const composer = await Composer.query()
      .where('id', params.id)
      .if(organizationId, (query) => query.where('organization_id', organizationId!))
      .preload('pieces')
      .first()

    if (!composer) {
      return response.status(404).send('Composer not found')
    }

    return response.json(composer.pieces)
  }
}