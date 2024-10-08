import type { HttpContext } from '@adonisjs/core/http'
import List from '#models/list'
import { simpleFilter } from 'adonisjs-filters'
import { createListValidator } from '#validators/list'

export default class ListsController {
  async getAll(ctx: HttpContext) {
    let baseQuery = List.query().preload('contacts')

    return await simpleFilter(
      ctx,
      baseQuery,
      ['name'],
      [{ relationColumns: ['first_name', 'last_name'], relationName: 'contacts' }]
    )
  }

  async getOne(ctx: HttpContext) {
    return List.query()
      .where('id', ctx.params.id)
      .preload('contacts', (query) => {
        query.preload('instruments')
      })
      .firstOrFail()
  }

  async createOrUpdate(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createListValidator)

    if (data.id === null || data.id === undefined) {
      const newList = await List.create(data)

      return await newList.related('contacts').sync(data.contacts.map((contact) => contact.id))
    }

    const list = await List.updateOrCreate({ id: data.id }, data)

    return await list.related('contacts').sync(data.contacts.map((contact) => contact.id))
  }

  async delete(ctx: HttpContext) {
    const list = await List.findOrFail(ctx.params.id)

    await list.related('contacts').detach()
    await list.delete()
  }
}
