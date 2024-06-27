// import type { HttpContext } from '@adonisjs/core/http'

import Composer from '#models/composer'
import { HttpContext } from '@adonisjs/core/http'
import { createComposerValidator } from '#validators/composer'

export default class ComposersController {
  async getAll() {
    return await Composer.all()
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
