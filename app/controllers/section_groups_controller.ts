import type { HttpContext } from '@adonisjs/core/http'
import { simpleFilter } from 'adonisjs-filters'
import SectionGroups from '#models/section_group'
import { createSectionGroupValidator } from '#validators/section_group'
//import {createSectionValidator} from '#validators/sectionGroups'

export default class SectionGroupsController {
  private getSectionSyncData(sections: Array<{ id?: number; pivot_order?: number }>) {
    return sections.reduce(
      (acc, section, index) => {
        acc[section.id!] = {
          order: section.pivot_order && section.pivot_order > 0 ? section.pivot_order : index + 1,
        }
        return acc
      },
      {} as Record<number, { order: number }>
    )
  }

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

      return sectionGroup.related('sections').sync(this.getSectionSyncData(data.sections))
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

        return sectionGroup.related('sections').sync(this.getSectionSyncData(data.sections))
      }
    }
  }

  async delete({ params, response }: HttpContext) {
    let sectionGroup = await SectionGroups.find(params.id)
    sectionGroup?.delete()
    return response.send('section group deleted')
  }
}
