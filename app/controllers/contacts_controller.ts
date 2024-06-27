// import type { HttpContext } from '@adonisjs/core/http'
import Contact from '#models/contact'
import Instrument from '#models/instrument'
import { getAll, Filter, RelationFilter } from '#services/get_all_services'
import { createContactValidator } from '#validators/contact'
import { HttpContext } from '@adonisjs/core/http'

export default class ContactsController {
  async getAll(ctx: HttpContext) {
    let baseQuery = Contact.query().preload('instruments', (instrumentsQuery) => {
      instrumentsQuery.pivotColumns(['proficiency_level'])
    })

    return await getAll(
      ctx,
      Contact,
      baseQuery,
      new Filter(Contact, ['first_name', 'last_name', 'email', 'comments', 'messenger', 'phone']),
      [new RelationFilter('instruments', Instrument, ['family', 'name'])]
    )
  }

  async getOne({ params }: HttpContext) {
    return await Contact.query()
      .where('id', params.id)
      .preload('instruments')
      .preload('lists')
      .preload('participant', (query) => {
        query.preload('project').preload('section').preload('answer')
      })
      .firstOrFail()
  }

  async createOrUpdate(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createContactValidator)

    if (!data.id) {
      return await Contact.create({ ...data, validated: true })
    }

    const contact = await Contact.updateOrCreate({ id: data.id }, { ...data, validated: true })

    if (data.instruments) {
      let toSync = Object.assign(
        {},
        ...data.instruments.map((instrument) => {
          return {
            [instrument.id]: {
              proficiency_level: instrument.pivot_proficiency_level,
            },
          }
        })
      )

      await contact.related('instruments').sync(toSync)
    }

    await contact.save()
    return contact
  }

  async delete({ params, response }: HttpContext) {
    let contact = await Contact.find(params.id)
    if (contact) {
      await contact.delete()
      return response.send('contact deleted')
    }
    return response.send('contact not found')
  }

  async create(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createContactValidator)

    const existing = await Contact.query()
      .where('firstname', data.first_name)
      .andWhere('lastname', data.last_name)
      .andWhere('email', data.email)
      .andWhere('phone', data.phone!)
      .andWhere('messenger', data.messenger!)
      .first()

    if (existing) return ctx.response.send('Contact already exists.')

    return await Contact.create(data)
  }

  async getValidation() {
    console.log('getValidation called')
    let test = await Contact.query().where('validated', false)
    return test
  }
}
