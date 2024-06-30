import type { HttpContext } from '@adonisjs/core/http'
import { simpleFilter } from '#services/simple_filter'
import SectionGroups from '#models/section_group'
//import {createSectionValidator} from '#validators/sectionGroups'

export default class SectionGroupsController {
  async getAll(ctx: HttpContext) {
    let baseQuery = SectionGroups.query().preload('sections')

    return await simpleFilter(ctx, SectionGroups, baseQuery)
  }

  async getOne({ params }: HttpContext) {
    return await SectionGroups.query().where('id', params.id).preload('sections').firstOrFail()
  }

  async createOrUpdate() {
    //to do
  }
}
