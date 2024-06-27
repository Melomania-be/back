// import type { HttpContext } from '@adonisjs/core/http'
import { HttpContext } from '@adonisjs/core/http'
import Callsheet from '#models/callsheet'
import { createCallsheetValidator, getCallsheetValidator } from '#validators/callsheet'
import Contact from '#models/contact'

export default class CallsheetsController {
  async getAll() {
    return await Callsheet.all()
  }

  async getOne(ctx: HttpContext) {
    const { params } = await ctx.request.validateUsing(getCallsheetValidator)

    const callsheet = await Callsheet.query()
      .where('id', params.id)
      .preload('contents')
      .preload('project', (projectQuery) => {
        projectQuery
          .preload('rehearsals')
          .preload('pieces', (pieceQuery) => {
            pieceQuery.preload('composer')
          })
          .preload('sectionGroup', (sectionGroupQuery) => {
            sectionGroupQuery.preload('sections', (sectionQuery) => {
              sectionQuery.preload('instruments')
            })
          })
      })
      .first()

    if (!callsheet) return ctx.response.notFound()

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

    return ctx.response.json(callsheet)
  }

  async create(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createCallsheetValidator)
    const callsheet = await Callsheet.create(data)
    return callsheet.related('contents').createMany(data.content)
  }
}
