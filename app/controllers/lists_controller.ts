import type { HttpContext } from '@adonisjs/core/http'
import List from '#models/list'
import { simpleFilter } from 'adonisjs-filters'
import { createListValidator } from '#validators/list'

export default class ListsController {
  async getAll(ctx: HttpContext) {
    const organizationId = ctx.auth.user?.organizationId

    let baseQuery = List.query()
      .if(organizationId, (query) => query.where('organization_id', organizationId!))
      .preload('contacts')

    return await simpleFilter(
      ctx,
      baseQuery,
      ['name'],
      [{ relationColumns: ['first_name', 'last_name'], relationName: 'contacts' }]
    )
  }

  async getOne(ctx: HttpContext) {
    const organizationId = ctx.auth.user?.organizationId

    return List.query()
      .where('id', ctx.params.id)
      .if(organizationId, (query) => query.where('organization_id', organizationId!))
      .preload('contacts', (query) => {
        query.preload('instruments')
      })
      .firstOrFail()
  }

  async createOrUpdate(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createListValidator)
    const organizationId = ctx.auth.user?.organizationId

    if (data.id === null || data.id === undefined) {
      const newList = await List.create({ ...data, organizationId })

      return await newList.related('contacts').sync(data.contacts.map((contact) => contact.id))
    }

    const list = await List.query()
      .where('id', data.id)
      .if(organizationId, (query) => query.where('organization_id', organizationId!))
      .firstOrFail()

    list.merge(data)
    await list.save()

    return await list.related('contacts').sync(data.contacts.map((contact) => contact.id))
  }

  async delete(ctx: HttpContext) {
    const organizationId = ctx.auth.user?.organizationId

    const list = await List.query()
      .where('id', ctx.params.id)
      .if(organizationId, (query) => query.where('organization_id', organizationId!))
      .firstOrFail()

    await list.related('contacts').detach()
    await list.delete()
  }
}