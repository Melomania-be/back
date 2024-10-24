import type { HttpContext } from '@adonisjs/core/http'
import { simpleFilter } from 'adonisjs-filters'
import SectionGroups from '#models/section_group'
import { createSectionGroupValidator } from '#validators/section_group'
//import {createSectionValidator} from '#validators/sectionGroups'

export default class SectionGroupsController {
  async getAll(ctx: HttpContext) {
    let baseQuery = SectionGroups.query().preload('sections', (subQuery) => {
      subQuery.preload('instruments').pivotColumns(['order']).orderBy('order', 'asc')
    })

    return await simpleFilter(ctx, baseQuery)
  }

  async getOne({ params }: HttpContext) {
    return await SectionGroups.query().where('id', params.id).preload('sections').firstOrFail()
  }

  async createOrUpdate(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createSectionGroupValidator)

    if (data.id === undefined) {
      let sectionGroup = await SectionGroups.create({ name: data.name })

      for (let section of data.sections) {
        if (!section.id) {
          return ctx.response.status(400).send('save the instrument before adding it to a section')
        }
      }

      return sectionGroup.related('sections').sync(data.sections.map((s) => s.id!))
    } else {
      let sectionGroup = await SectionGroups.find(data.id)

      if (sectionGroup === null) {
        return ctx.response.status(404).send('section not found')
      } else {
        sectionGroup.name = data.name
        await sectionGroup.save()

        for (let section of data.sections) {
          if (!section.id) {
            return ctx.response
              .status(400)
              .send('save the instrument before adding it to a section')
          }
        }

        const sectionData = data.sections.reduce(
          (acc, section) => {
            acc[section.id!] = { order: section.pivot_order ?? 0 }
            return acc
          },
          {} as Record<number, { order: number }>
        )

        return sectionGroup.related('sections').sync(sectionData)
      }
    }
  }

  async delete({ params, response }: HttpContext) {
    let sectionGroup = await SectionGroups.find(params.id)
    sectionGroup?.delete()
    return response.send('section group deleted')
  }
}
