import Instrument from '#models/instrument'
import { createInstrumentValidator } from '#validators/instrument'
import { HttpContext } from '@adonisjs/core/http'

export default class InstrumentsController {
  async getAll() {
    return await Instrument.query()
  }

  async createOrUpdate({ request, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    const data = await request.validateUsing(createInstrumentValidator)

    if (data.id === undefined) {
      return await Instrument.create({ name: data.name, family: data.family })
    } else {
      let instrument = await Instrument.find(data.id)
      if (instrument === null) {
        return response.status(404).send('instrument not found')
      } else {
        instrument.name = data.name
        instrument.family = data.family
        return await instrument.save()
      }
    }
  }

  async delete({ params, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    let instrument = await Instrument.find(params.id)
    instrument?.delete()
    return response.send('instrument deleted')
  }
}
