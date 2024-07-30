// import type { HttpContext } from '@adonisjs/core/http'

import Instrument from '#models/instrument'
import { createInstrumentValidator } from '#validators/instrument'
import { HttpContext } from '@adonisjs/core/http'

export default class ContactsController {
  async getAll() {
    return await Instrument.query()
  }

  async createOrUpdate(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createInstrumentValidator)

    if (data.id === undefined) {
      return await Instrument.create({ name: data.name, family: data.family })
    } else {
      let instrument = await Instrument.find(data.id)
      if (instrument === null) {
        return ctx.response.status(404).send('instrument not found')
      } else {
        instrument.name = data.name
        instrument.family = data.family
        return await instrument.save()
      }
    }
  }

  async delete({ params, response }: HttpContext) {
    let contact = await Instrument.find(params.id)
    contact?.delete()
    return response.send('instrument deleted')
  }
}
