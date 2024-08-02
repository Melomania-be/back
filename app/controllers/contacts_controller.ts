// import type { HttpContext } from '@adonisjs/core/http'
import Contact from '#models/contact'
import Instrument from '#models/instrument'
import { advancedFilter } from '#services/advanced_filter'
import { simpleFilter, Filter, RelationFilter } from '#services/simple_filter'
import { createContactValidator } from '#validators/contact'
import { HttpContext } from '@adonisjs/core/http'

export default class ContactsController {
  async getAll(ctx: HttpContext) {
    let baseQuery = Contact.query().preload('instruments', (instrumentsQuery) => {
      instrumentsQuery.pivotColumns(['proficiency_level'])
    })

    return await simpleFilter(
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
      .preload('participants', (query) => {
        query
          .preload('project')
          .preload('section', (subQuery) => {
            subQuery.preload('instruments')
          })
          .preload('answers')
      })
      .firstOrFail()
  }

  async advancedSearch(ctx: HttpContext) {
    let baseQuery = Contact.query()
      .preload('instruments', (instrumentsQuery) => {
        instrumentsQuery.pivotColumns(['proficiency_level'])
      })
      .preload('lists')
      .preload('participants')
      .preload('projects')

    const data = await advancedFilter(ctx, Contact, baseQuery)

    return {
      data,
      columns: {
        self: ['id', 'first_name', 'last_name', 'email', 'comments', 'messenger', 'phone'],
        instruments: ['id', 'family', 'name'],
        projects: ['id', 'name'],
        participants: ['id', 'project', 'section', 'answers'],
        lists: ['id', 'name'],
      },
    }
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
      let participations = await contact.related('participants').query()

      for (let participation of participations) {
        await participation.related('answers').query().delete()
        await participation.related('rehearsals').query().delete()
        await participation.delete()
      }

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
      .first()

    if (existing) return ctx.response.send('Contact already exists.')

    return await Contact.create(data)
  }

  async getValidation(ctx: HttpContext) {
    console.log('getValidation called')

    let baseQuery = Contact.query()
      .where('validated', false)
      .preload('instruments', (instrumentsQuery) => {
        instrumentsQuery.pivotColumns(['proficiency_level'])
      })

    return await simpleFilter(
      ctx,
      Contact,
      baseQuery,
      new Filter(Contact, ['first_name', 'last_name', 'email', 'comments', 'messenger', 'phone']),
      [new RelationFilter('instruments', Instrument, ['family', 'name'])]
    )
  }

  async unsubscribe_from_mails({ request, response }: HttpContext) {
    console.log('unsubscribe_from_mails called')
    const { email }: { email: string } = request.only(['email'])
    let contact = await Contact.query().where('email', email).first()
    if (contact) {
      contact.subscribed = false
      await contact.save()
      return response.status(200).send('contact unsubscribed')
    }
    return response.status(404).send('contact not found')
  }
}
