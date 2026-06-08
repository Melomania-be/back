import type { HttpContext } from '@adonisjs/core/http'
import { simpleFilter } from 'adonisjs-filters'
import SectionGroups from '#models/section_group'
import { createSectionGroupValidator } from '#validators/section_group'

export default class SectionGroupsController {
  async getAll(ctx: HttpContext) {
    await (ctx.bouncer as any).authorize('adminRights')
    let baseQuery = SectionGroups.query().preload('sections', (sq) => sq.preload('instruments').pivotColumns(['order']).orderBy('order', 'asc'))
    return await simpleFilter(ctx, baseQuery)
  }

  async getOne({ params, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    return await SectionGroups.query().where('id', params.id).preload('sections').firstOrFail()
  }

  async createOrUpdate(ctx: HttpContext) {
    await (ctx.bouncer as any).authorize('adminRights')
    const data = await ctx.request.validateUsing(createSectionGroupValidator)

    if (data.id === undefined) {
      let sectionGroup = await SectionGroups.create({ name: data.name })
      for (let section of data.sections) if (!section.id) return ctx.response.status(400).send('save instrument before adding to section')
      return sectionGroup.related('sections').sync(data.sections.map((s) => s.id!))
    } else {
      let sectionGroup = await SectionGroups.find(data.id)
      if (!sectionGroup) return ctx.response.status(404).send('not found')

      sectionGroup.name = data.name; await sectionGroup.save()
      for (let section of data.sections) if (!section.id) return ctx.response.status(400).send('save instrument before adding to section')

      const sectionData = data.sections.reduce((acc, s) => { acc[s.id!] = { order: s.pivot_order ?? 0 }; return acc }, {} as Record<number, { order: number }>)
      return sectionGroup.related('sections').sync(sectionData)
    }
  }

  async delete({ params, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    let sectionGroup = await SectionGroups.find(params.id)
    sectionGroup?.delete()
    return response.send('section group deleted')
  }
}
