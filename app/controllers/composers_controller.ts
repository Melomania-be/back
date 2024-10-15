// import type { HttpContext } from '@adonisjs/core/http'

import Composer from '#models/composer'
import { HttpContext } from '@adonisjs/core/http'
import { createComposerValidator } from '#validators/composer'
import { simpleFilter } from 'adonisjs-filters'

export default class ComposersController {
  async getAll(ctx: HttpContext) {
    let baseQuery = Composer.query()

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

    if (data.id === undefined) {
      return await Composer.create(data)
    }

    const composer = await Composer.firstOrCreate({ id: data.id }, data)

    if (composer.$isLocal) {
      return composer
    }

    composer.merge(data)
    await composer.save()
    return composer
  }

  async delete({ params, response }: HttpContext) {
    const composerId = params.id
    const composer = await Composer.findOrFail(composerId)
    await composer.delete()
    return response.status(204)
  }

  async getPieces({ params, response }: HttpContext) {
    const composer = await Composer.query().where('id', params.id).preload('pieces').first()

    if (!composer) {
      return response.status(404).send('Composer not found')
    }

    return response.json(composer.pieces)
  }
}
