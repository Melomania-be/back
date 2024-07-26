import { HttpContext } from '@adonisjs/core/http'
import Callsheet from '#models/callsheet'
import { createCallsheetValidator, getCallsheetValidator } from '#validators/callsheet'
import Contact from '#models/contact'
import { simpleFilter, Filter } from '#services/simple_filter'

export default class CallsheetsController {
  async getAll(ctx: HttpContext) {
    let baseQuery = Callsheet.query().where('project_id', ctx.params.id)

    return await simpleFilter(ctx, Callsheet, baseQuery, new Filter(Callsheet, ['version']))
  }

  async getOne(ctx: HttpContext) {
    const { params } = await ctx.request.validateUsing(getCallsheetValidator)

    const callsheet = await Callsheet.query()
      .where('project_id', params.id)
      .orderBy('updated_at', 'desc')
      .preload('contents')
      .preload('project', (projectQuery) => {
        projectQuery
          .preload('responsibles')
          .preload('rehearsals')
          .preload('pieces', (pieceQuery) => {
            pieceQuery.preload('composer')
            pieceQuery.preload('folder', (folderQuery) => {
              folderQuery.preload('files')
            })
          })
          .preload('sectionGroup', (sectionGroupQuery) => {
            sectionGroupQuery.preload('sections', (sectionQuery) => {
              sectionQuery.preload('instruments')
            })
          })
      })
      .firstOrFail()

    if (!callsheet) return ctx.response.notFound()

    if (params.visitorId) {
      const contact = await Contact.find(params.visitorId)

      if (contact) {
        const project = await callsheet.related('project').query().first()

        if (project) {
          const participant = await project
            .related('participants')
            .query()
            .where('contact_id', contact.id)
            .first()

          if (participant) {
            participant.last_activity = new Date()
            await callsheet.related('participants').save(participant)

            await participant.related('hasSeenCallsheets').detach([callsheet.id])
            await participant.related('hasSeenCallsheets').attach([callsheet.id])
          }
        }
      }
    }

    return ctx.response.json(callsheet)
  }

  async createOrUpdate(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createCallsheetValidator)
    let callsheet: Callsheet
    if (data.id) {
      const tmpCallsheet = await Callsheet.find(data.id)
      if (tmpCallsheet) {
        callsheet = await tmpCallsheet.merge({ version: data.version }).save()

        await callsheet.related('contents').query().delete()
      } else {
        return ctx.response.notFound()
      }
    } else {
      callsheet = await Callsheet.create({ project_id: data.project_id, version: data.version })
    }

    return callsheet
      .related('contents')
      .createMany(data.contents.map((content) => ({ text: content.text, title: content.title })))
  }

  async delete(ctx: HttpContext) {
    const callsheet = await Callsheet.find(ctx.params.callsheetId)
    if (!callsheet) return ctx.response.notFound()

    await callsheet.delete()
    return ctx.response.noContent()
  }
}
