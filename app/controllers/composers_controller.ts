// import type { HttpContext } from '@adonisjs/core/http'

import Composer from '#models/composer'
import { HttpContext } from '@adonisjs/core/http'
import { createComposerValidator } from '#validators/composer'
import { simpleFilter, Filter } from '#services/simple_filter'

export default class ComposersController {
  async getAll(ctx: HttpContext) {
    let baseQuery = Composer.query()

    let res = await simpleFilter(
      ctx,
      Composer,
      baseQuery,
      new Filter(Composer, [
        'short_name',
        'long_name',
        'birth_date',
        'death_date',
        'country',
        'main_style',
      ]),
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
    let composer = await Composer.find(params.id)
    composer?.delete()
    return response.send('composer deleted')
  }
}
