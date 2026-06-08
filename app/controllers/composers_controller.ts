import { HttpContext } from '@adonisjs/core/http'
import Composer from '#models/composer'
import { createComposerValidator } from '#validators/composer'
import { simpleFilter } from 'adonisjs-filters'

export default class ComposersController {

  async getAll(ctx: HttpContext) {
    // Les listes globales peuvent être lues sans droit d'écriture admin
    let baseQuery = Composer.query()

    let res = await simpleFilter(
      ctx,
      baseQuery,
      ['short_name', 'long_name', 'birth_date', 'death_date', 'country', 'main_style'],
      [],
      { filtered: true, paginated: true, ordered: true }
    )
    return res
  }

  async createOrUpdate({ request, bouncer, response }: HttpContext) {
    // SÉCURITÉ : Action globale, réservée aux administrateurs
    await (bouncer as any).authorize('adminRights')

    const data = await request.validateUsing(createComposerValidator)

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

  async delete({ params, response, bouncer }: HttpContext) {
    // SÉCURITÉ : Action globale, réservée aux administrateurs
    await (bouncer as any).authorize('adminRights')

    const composerId = params.id
    const composer = await Composer.findOrFail(composerId)
    await composer.delete()
    return response.status(204)
  }

  async getPieces({ params, response }: HttpContext) {
    // Lecture de ressource
    const composer = await Composer.query().where('id', params.id).preload('pieces').first()

    if (!composer) {
      return response.status(404).send('Composer not found')
    }

    return response.json(composer.pieces)
  }
}
