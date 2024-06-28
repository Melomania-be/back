import type { HttpContext } from '@adonisjs/core/http'
import { getAll, Filter, RelationFilter } from '#services/get_all_services'
import SectionGroups from '#models/section_group'
//import {createSectionValidator} from '#validators/sectionGroups'

export default class SectionGroupsController {
    async getAll(ctx: HttpContext) {
        let baseQuery = SectionGroups.query().preload('sections')

        return await getAll(
            ctx,
            SectionGroups,
            baseQuery,
        )
    }

    async getOne({ params }: HttpContext) {
        return await SectionGroups.query()
            .where('id', params.id)
            .preload('sections')
            .firstOrFail()
    }

    async createOrUpdate(ctx: HttpContext) { 
        //to do
    }

}
