import Participant from '#models/participant'
import Project from '#models/project'
import ProjectPolicy from '#policies/project_policy'
import { HttpContext } from '@adonisjs/core/http'
import { createParticipantValidator, validateParticipantValidator } from '#validators/participant'
import { simpleFilter } from 'adonisjs-filters'
import Section from '#models/section'
import RecruitmentContact from '#models/recruitment_contact'
import Contact from '#models/contact'

export default class ParticipantsController {

  private async getAuthorizedProject(bouncer: any, projectId: number, action: 'view' | 'update' | 'delete' = 'view') {
    const project = await Project.findOrFail(projectId)
    await bouncer.with(ProjectPolicy).authorize(action, project)
    return project
  }

  async getAll(ctx: HttpContext) {
    const project = await this.getAuthorizedProject(ctx.bouncer, ctx.params.id, 'view')
    const baseQuery = Participant.query().where('project_id', project.id).andWhere('accepted', true).preload('contact').preload('section').preload('concerts', (q) => q.pivotColumns(['comment'])).preload('rehearsals', (q) => q.pivotColumns(['comment']))
    return await simpleFilter(ctx, baseQuery, ['contact_id'], [{ relationColumns: ['first_name', 'last_name','email','phone','messenger'] as any, relationName: 'contact' }, { relationColumns: ['name'] as any, relationName: 'section' }])
  }

  async getOne({ params, bouncer }: HttpContext) {
    const project = await this.getAuthorizedProject(bouncer, params.id, 'view')
    return await Participant.query().where('id', params.participantId).where('project_id', project.id).preload('contact').preload('section').preload('answers').preload('concerts', (q) => q.pivotColumns(['comment'])).preload('rehearsals', (q) => q.pivotColumns(['comment'])).preload('project').first()
  }

  async createOrUpdate({ request, response, bouncer }: HttpContext) {
    const data = await request.validateUsing(createParticipantValidator)
    const project = await this.getAuthorizedProject(bouncer, data.project.id, 'update')

    let participant: Participant | null
    if (data.id) {
      participant = await Participant.query().where('id', data.id).where('project_id', project.id).first()
      if (!participant) return response.abort('Participant not found')
    } else {
      participant = await Participant.query().where('project_id', project.id).andWhere('contact_id', data.contact.id).first()
      if (participant) return response.abort('This person already is a participant')
      participant = await Participant.create({ accepted: data.accepted, contact_id: data.contact.id, project_id: project.id, section_id: data.section.id, is_section_leader: data.is_section_leader })
    }

    await participant.related('section').dissociate()
    const section = await Section.findOrFail(data.section.id)
    await participant.related('section').associate(section)

    await participant.related('answers').query().delete()
    await participant.related('answers').createMany(data.answers.map((a) => ({ text: a.text || '', form_id: a.formId })))

    if (data.concerts) {
      let toSync = Object.assign({}, ...data.concerts.map((c) => ({ [c.id]: { comment: c.pivot_comment } })))
      await participant.related('concerts').sync(toSync)
    }

    if (data.rehearsals) {
      let toSync = Object.assign({}, ...data.rehearsals.map((r) => ({ [r.id]: { comment: r.pivot_comment } })))
      await participant.related('rehearsals').sync(toSync)
    }

    if (data.id) participant.merge({ is_section_leader: data.is_section_leader })
    await participant.save()

    return response.send('Participant created')
  }

  async getApplications({ params, bouncer }: HttpContext) {
    const project = await this.getAuthorizedProject(bouncer, params.id, 'view')
    return await Participant.query().where('project_id', project.id).andWhere('accepted', false).preload('contact').preload('section').preload('answers', (q) => q.preload('form')).preload('auditions', (q) => q.preload('files', (fq) => fq.preload('file')))
  }

  async getParticipantWithAuditions({ params, bouncer }: HttpContext) {
    const project = await this.getAuthorizedProject(bouncer, params.id, 'view')
    return await Participant.query().where('id', params.participantId).where('project_id', project.id).preload('contact').preload('auditions', (q) => q.preload('files', (fq) => fq.preload('file')).orderBy('created_at', 'desc')).first()
  }

  async validateParticipant({ request, response, auth, bouncer }: HttpContext) {
    const data = await request.validateUsing(validateParticipantValidator)
    const project = await this.getAuthorizedProject(bouncer, data.params.id, 'update')

    const participant = await Participant.query().where('id', data.id).where('project_id', project.id).preload('contact').first()
    if (!participant) return response.send("Couldn't find the participant")

    participant.accepted = true
    await participant.save()

    if (participant.contact?.id) await this.addToRecruitmentIfNotExists(project.id, participant.contact, auth)
    return response.send('Participant validated')
  }

  async delete({ params, response, bouncer }: HttpContext) {
    const project = await this.getAuthorizedProject(bouncer, params.id, 'delete')
    const participant = await Participant.query().where('id', params.participantId).where('project_id', project.id).preload('contact').first()

    if (!participant) return response.send("Can't find this participant in this project")

    if (participant.contact?.id) await this.updateRecruitmentStatusOnDeletion(project.id, participant.contact.id)
    await participant.related('concerts').detach()
    await participant.related('rehearsals').detach()
    await participant.delete()

    return response.send('Participant deleted')
  }

  async getParticipantsCountBySection({ params, bouncer }: HttpContext) {
    const project = await this.getAuthorizedProject(bouncer, params.id, 'view')
    const counts = await Participant.query().where('project_id', project.id).where('accepted', true).select('section_id').count('id as participants_count').groupBy('section_id').preload('section', (q) => q.select('id', 'name'))

    return counts.map((item) => ({ section_id: item.section_id, section_name: item.section?.name || null, participants_count: Number(item.$extras.participants_count) || 0 }))
  }

  async getParticipantsAnswers({ params, bouncer }: HttpContext) {
    const project = await this.getAuthorizedProject(bouncer, params.id, 'view')
    return await Participant.query().where('project_id', project.id).preload('answers')
  }

  private async getCurrentUserName(auth: any): Promise<string> {
    try { const user = await auth.authenticate(); return user.fullName || user.email || 'System' } catch (error) { return 'System' }
  }

  private async addToRecruitmentIfNotExists(projectId: number, contact: Contact, auth: any) {
    try {
      const existingRecruitment = await RecruitmentContact.query().where('project_id', projectId).where('contact_id', contact.id).first()
      if (existingRecruitment) {
        if (existingRecruitment.status !== 'recruited') await existingRecruitment.merge({ status: 'recruited' }).save()
        return
      }
      const currentUserName = await this.getCurrentUserName(auth)
      await RecruitmentContact.create({ project_id: projectId, contact_id: contact.id, first_name: contact.first_name || '', last_name: contact.last_name || '', email: contact.email, status: 'recruited', contact_method: 'manual', is_duplicate: false, contacted_by: currentUserName })
    } catch (error) {}
  }

  private async updateRecruitmentStatusOnDeletion(projectId: number, contactId: number) {
    try {
      const recruitmentContact = await RecruitmentContact.query().where('project_id', projectId).where('contact_id', contactId).first()
      if (recruitmentContact) {
        recruitmentContact.status = 'cancelled'
        await recruitmentContact.save()
      }
    } catch (error) {}
  }
}
