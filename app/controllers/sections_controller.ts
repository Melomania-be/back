import Section from '#models/section'
import { createSectionValidator } from '#validators/section'
import { HttpContext } from '@adonisjs/core/http'

export default class SectionsController {
  async getAll() {
    return await Section.query().preload('instruments')
  }

  async getOne({ params }: HttpContext) {
    return await Section.query().where('id', params.id).preload('instruments').firstOrFail()
  }

  async createOrUpdate(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createSectionValidator)

    if (data.id === undefined) {
      let section = await Section.create({ name: data.name, size: data.size })

      for (let instrument of data.instruments) {
        if (!instrument.id) {
          return ctx.response.status(400).send('save the instrument before adding it to a section')
        }
      }

      return section.related('instruments').sync(data.instruments.map((i) => i.id!))
    } else {
      let section = await Section.find(data.id)

      if (section === null) {
        return ctx.response.status(404).send('section not found')
      } else {
        section.name = data.name
        section.size = data.size
        await section.save()

        for (let instrument of data.instruments) {
          if (!instrument.id) {
            return ctx.response
              .status(400)
              .send('save the instrument before adding it to a section')
          }
        }

        return section.related('instruments').sync(data.instruments.map((i) => i.id!))
      }
    }
  }

  async delete({ params, response }: HttpContext) {
    let section = await Section.find(params.id)
    section?.delete()
    return response.send('section deleted')
  }
}
