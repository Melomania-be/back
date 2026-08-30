import Composer from '#models/composer'
import { HttpContext } from '@adonisjs/core/http'
import { createComposerValidator } from '#validators/composer'
import { simpleFilter } from 'adonisjs-filters'
import stringSimilarity from 'string-similarity'

const SIMILARITY_THRESHOLD = 0.8

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
      const existingComposers = await Composer.all()
      const namesToCheck = [data.short_name, data.long_name].filter(Boolean) as string[]
      const similarComposers: { composer: Composer; field: string; score: number }[] = []

      for (const composer of existingComposers) {
        for (const newName of namesToCheck) {
          if (composer.short_name) {
            const score = stringSimilarity.compareTwoStrings(
              newName.toLowerCase(),
              composer.short_name.toLowerCase()
            )
            if (score >= SIMILARITY_THRESHOLD) {
              similarComposers.push({ composer, field: 'short_name', score })
            }
          }
          if (composer.long_name) {
            const score = stringSimilarity.compareTwoStrings(
              newName.toLowerCase(),
              composer.long_name.toLowerCase()
            )
            if (score >= SIMILARITY_THRESHOLD) {
              similarComposers.push({ composer, field: 'long_name', score })
            }
          }
        }
      }

      if (similarComposers.length > 0) {
        return ctx.response.status(409).json({
          message: 'Similar composers already exist',
          similarComposers: similarComposers.map(({ composer, field, score }) => ({
            id: composer.id,
            short_name: composer.short_name,
            long_name: composer.long_name,
            similarity_field: field,
            similarity_score: Math.round(score * 100),
          })),
        })
      }

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