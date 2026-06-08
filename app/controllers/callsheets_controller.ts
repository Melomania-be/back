import { HttpContext } from '@adonisjs/core/http'
import Callsheet from '#models/callsheet'
import Project from '#models/project'
import ProjectPolicy from '#policies/project_policy'
import { createCallsheetValidator, getCallsheetValidator } from '#validators/callsheet'
import Contact from '#models/contact'
import { simpleFilter } from 'adonisjs-filters'

export default class CallsheetsController {

  async getAll({ params, bouncer, request, response }: HttpContext) {
    const project = await Project.findOrFail(params.id)
    await bouncer.with(ProjectPolicy).authorize('view', project)

    let baseQuery = Callsheet.query().where('project_id', project.id)

    // Note : passons l'objet ctx complet (reconstruit) au filter si besoin
    return await simpleFilter({ request } as HttpContext, baseQuery, ['version'])
  }

  async getOne(ctx: HttpContext) {
    // ⚠️ Pas de Bouncer ici car cette route gère les visitorId (participants non-admins)
    const { params } = await ctx.request.validateUsing(getCallsheetValidator)

    const callsheet = await Callsheet.query()
      .where('project_id', params.id)
      .orderBy('updated_at', 'desc')
      .preload('contents')
      .preload('project', (projectQuery) => {
        projectQuery
          .preload('responsibles')
          .preload('rehearsals')
          .preload('concerts')
          .preload('pieces', (pieceQuery) => {
            pieceQuery.preload('composer')
            pieceQuery.preload('folder', (folderQuery) => {
              folderQuery.preload('files')
            })
            pieceQuery.preload('files')
          })
          .preload('sectionGroup', (sectionGroupQuery) => {
            sectionGroupQuery.preload('sections', (sectionQuery) => {
              sectionQuery.preload('instruments')
            })
          })
          .preload('registration')
      })
      .firstOrFail()

    if (params.visitorId) {
      const contact = await Contact.find(params.visitorId)
      if (contact) {
        const project = await callsheet.related('project').query().first()
        if (project) {
          const participant = await project.related('participants').query().where('contact_id', contact.id).first()
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

  async createOrUpdate({ request, response, bouncer }: HttpContext) {
    const data = await request.validateUsing(createCallsheetValidator)

    // Sécurité via le project_id du body
    const project = await Project.findOrFail(data.project_id)
    await bouncer.with(ProjectPolicy).authorize('update', project)

    let callsheet: Callsheet
    if (data.id) {
      const tmpCallsheet = await Callsheet.findOrFail(data.id)

      // Sécurité Anti-IDOR stricte
      if (tmpCallsheet.project_id !== project.id) {
        return response.status(403).json({ error: 'Unauthorized to modify this callsheet' })
      }

      callsheet = await tmpCallsheet.merge({ version: data.version }).save()
      await callsheet.related('contents').query().delete()
    } else {
      callsheet = await Callsheet.create({ project_id: project.id, version: data.version })
    }

    return callsheet
      .related('contents')
      .createMany(data.contents.map((content) => ({ text: content.text, title: content.title })))
  }

  async delete({ params, bouncer, response }: HttpContext) {
    const callsheet = await Callsheet.findOrFail(params.callsheetId)

    // On remonte au projet pour autoriser la suppression
    const project = await Project.findOrFail(callsheet.project_id)
    await bouncer.with(ProjectPolicy).authorize('delete', project)

    await callsheet.delete()
    return response.noContent()
  }
}
