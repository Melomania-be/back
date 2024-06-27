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
      return await Instrument.create(data)
    }

    const instrument = await Instrument.firstOrCreate({ id: data.id }, data)

    if (instrument.$isLocal) {
      return instrument
    }

    instrument.merge(data)
    await instrument.save()
    return instrument
  }

  async delete({ params, response }: HttpContext) {
    let contact = await Instrument.find(params.id)
    contact?.delete()
    return response.send('contat deleted')
  }
}
