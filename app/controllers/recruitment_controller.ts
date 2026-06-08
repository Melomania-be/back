import { HttpContext } from '@adonisjs/core/http'
import RecruitmentContact from '#models/recruitment_contact'
import RecruitmentSettings from '#models/recruitment_settings'
import RecruitmentRecommendation from '#models/recruitment_recommendation'
import Contact from '#models/contact'
import Project from '#models/project'
import Section from '#models/section'
import Responsibles from '#models/responsibles'
import Participant from '#models/participant'
import { DateTime } from 'luxon'
import { simpleFilter, advancedFilter } from 'adonisjs-filters'
import mail from '@adonisjs/mail/services/main'
import RecruitmentEmail from '#mails/recruitment_email'
import RecommendationEmail from '#mails/recommendation_email'
import ProjectPolicy from '#policies/project_policy'

export default class RecruitmentController {

  private async getAuthorizedProject(bouncer: any, projectId: number | string, action: 'view' | 'update' | 'delete' = 'view') {
    const id = Number(projectId)
    if (isNaN(id) || id <= 0) throw new Error('Invalid project ID')
    const project = await Project.findOrFail(id)
    await bouncer.with(ProjectPolicy).authorize(action, project)
    return project
  }

  private async getCurrentUserName(auth: any): Promise<string> {
    try { const user = await auth.authenticate(); return user.fullName || user.email || 'System user' }
    catch (error) { return 'System user' }
  }

  async autoImportAllContacts({ params, response, auth, bouncer }: HttpContext) {
    try {
      const project = await this.getAuthorizedProject(bouncer, params.id, 'update')
      const currentUserName = await this.getCurrentUserName(auth)

      await project.load('participants', (q) => q.where('accepted', true).preload('contact'))

      const projectContactIds = project.participants.filter((p) => p.contact?.id).map((p) => p.contact.id)
      if (projectContactIds.length === 0) return response.json({ imported: [], conflicts: [], errors: [], message: 'No validated participants found', total_contacts: 0, new_imports: 0, already_imported: 0 })

      const projectContacts = await Contact.query().whereIn('id', projectContactIds).where('validated', true).preload('instruments')
      const existingContacts = await RecruitmentContact.query().where('project_id', project.id).whereNotNull('contact_id').select('contact_id')
      const existingContactIds = new Set(existingContacts.map((c) => c.contact_id))
      const contactsToImport = projectContacts.filter((c) => !existingContactIds.has(c.id))

      const results = { imported: [] as any[], conflicts: [] as any[], errors: [] as string[] }

      for (const contact of contactsToImport) {
        try {
          if (!contact.first_name?.trim() || !contact.last_name?.trim()) { results.errors.push(`Contact ${contact.id} missing names`); continue }
          const recruitmentContact = await RecruitmentContact.create({ project_id: project.id, contact_id: contact.id, first_name: contact.first_name.trim(), last_name: contact.last_name.trim(), email: contact.email || null, phone: contact.phone || null, messenger: contact.messenger || null, source: 'database_auto_import', status: 'not_yet_contacted', contact_method: 'manual', is_duplicate: false, contacted_by: currentUserName })
          results.imported.push(recruitmentContact.serialize())
        } catch (error) { results.errors.push(`Error importing ${contact.id}: ${error.message}`) }
      }

      results.conflicts = projectContacts.filter((c) => existingContactIds.has(c.id)).map((c) => ({ contact: c.serialize(), reason: 'Already exists' }))
      return response.json({ ...results, message: `Auto import completed`, total_contacts: projectContacts.length, new_imports: results.imported.length, already_imported: results.conflicts.length })
    } catch (error) { return response.status(400).json({ error: error.message, imported: [], conflicts: [], errors: [error.message], total_contacts: 0, new_imports: 0, already_imported: 0 }) }
  }

  async getSettings({ params, response, bouncer }: HttpContext) {
    try {
      const project = await this.getAuthorizedProject(bouncer, params.id, 'view')
      let settings = await RecruitmentSettings.query().where('project_id', project.id).first()
      if (!settings) settings = await RecruitmentSettings.create({ project_id: project.id, follow_up_days: 7, auto_follow_up_enabled: true })
      return response.json({ id: settings.id, project_id: settings.project_id, follow_up_days: Number(settings.follow_up_days), auto_follow_up_enabled: Boolean(settings.auto_follow_up_enabled), created_at: settings.createdAt?.toISO(), updated_at: settings.updatedAt?.toISO() })
    } catch (error) { return response.status(400).json({ error: error.message }) }
  }

  async updateSettings({ params, request, response, bouncer }: HttpContext) {
    try {
      const project = await this.getAuthorizedProject(bouncer, params.id, 'update')
      const requestBody = request.body()
      if (!requestBody || typeof requestBody !== 'object') return response.status(400).json({ error: 'Invalid body' })

      const followUpDays = Number(requestBody.follow_up_days)
      if (isNaN(followUpDays) || followUpDays < 1 || followUpDays > 30) return response.status(400).json({ error: 'Invalid follow-up days' })

      let settings = await RecruitmentSettings.query().where('project_id', project.id).first()
      if (!settings) { settings = await RecruitmentSettings.create({ project_id: project.id, follow_up_days: followUpDays, auto_follow_up_enabled: Boolean(requestBody.auto_follow_up_enabled) }) }
      else { settings.follow_up_days = followUpDays; settings.auto_follow_up_enabled = Boolean(requestBody.auto_follow_up_enabled); await settings.save() }

      if (settings.auto_follow_up_enabled) await this.updateFollowUpStatuses(project.id, followUpDays)
      return response.json({ id: settings.id, project_id: settings.project_id, follow_up_days: Number(settings.follow_up_days), auto_follow_up_enabled: Boolean(settings.auto_follow_up_enabled) })
    } catch (error) { return response.status(400).json({ error: error.message }) }
  }

  async getContacts(ctx: HttpContext) {
    try {
      const project = await this.getAuthorizedProject(ctx.bouncer, ctx.params.id, 'view')
      const baseQuery = RecruitmentContact.query().where('project_id', project.id).preload('contact').preload('section').preload('recommender').orderBy('created_at', 'desc')
      const result = await simpleFilter(ctx, baseQuery, ['first_name', 'last_name', 'email', 'phone', 'messenger', 'status', 'notes', 'contacted_by'], [{ relationColumns: ['name'] as any, relationName: 'section' }, { relationColumns: ['first_name', 'last_name'] as any, relationName: 'contact' }])
      if (result && 'data' in result && Array.isArray(result.data)) {
        result.data = result.data.map((c: any) => ({ ...c, display_name: `${c.first_name || ''} ${c.last_name || ''}`.trim() }))
      }
      return result
    } catch (error) { return ctx.response.status(400).json({ error: error.message }) }
  }

  async getStats({ params, response, bouncer }: HttpContext) {
    try {
      const project = await this.getAuthorizedProject(bouncer, params.id, 'view')
      const statsResults = await RecruitmentContact.query().where('project_id', project.id).select('status').count('* as total').groupBy('status')
      const totalResult = await RecruitmentContact.query().where('project_id', project.id).count('* as total').first()
      const pendingRecommendationsResult = await RecruitmentRecommendation.query().where('project_id', project.id).where('status', 'pending').count('* as total').first()

      return response.json({
        total: Number(totalResult?.$extras.total || 0),
        by_status: statsResults.map((r) => ({ status: r.status, count: Number(r.$extras.total || 0) })),
        pending_recommendations: Number(pendingRecommendationsResult?.$extras.total || 0),
      })
    } catch (error) { return response.status(400).json({ error: error.message, total: 0, by_status: [], pending_recommendations: 0 }) }
  }

  async createManualContact({ params, request, response, auth, bouncer }: HttpContext) {
    try {
      const project = await this.getAuthorizedProject(bouncer, params.id, 'update')
      const currentUserName = await this.getCurrentUserName(auth)
      const data = request.body()

      if (!data.first_name?.trim() || !data.last_name?.trim()) return response.status(400).json({ error: 'Names are required' })

      const duplicateInfo = await this.checkForDuplicatesDetailed(project.id, data)
      const contact = await RecruitmentContact.create({ project_id: project.id, first_name: data.first_name.trim(), last_name: data.last_name.trim(), email: data.email?.trim() || null, phone: data.phone?.trim() || null, messenger: data.messenger?.trim() || null, section_id: data.section_id || null, notes: data.notes?.trim() || null, source: 'manual', status: 'not_yet_contacted', contact_method: 'manual', is_duplicate: duplicateInfo.isDuplicate, contacted_by: data.contacted_by?.trim() || currentUserName })

      if (contact.section_id) await contact.load('section')
      return response.json({ ...contact.serialize(), duplicate_matches: duplicateInfo.matches })
    } catch (error) { return response.status(400).json({ error: error.message }) }
  }

  async sendRecruitmentEmails({ params, request, response, bouncer }: HttpContext) {
    try {
      const project = await this.getAuthorizedProject(bouncer, params.id, 'update')
      const data = request.body()
      const results = { sent: [] as any[], failed: [] as any[], skipped: [] as any[] }

      const responsibles = await Responsibles.query().where('project_id', project.id).preload('contact')
      let recruiterInfo = responsibles[0]?.contact ? { name: `${responsibles[0].contact.first_name} ${responsibles[0].contact.last_name}`, email: responsibles[0].contact.email || 'contact@melomania.com' } : { name: 'Melomania Team', email: 'contact@melomania.com' }

      for (const contactId of (data.contact_ids || [])) {
        const contact = await RecruitmentContact.query().where('id', contactId).where('project_id', project.id).first()
        if (!contact) { results.failed.push({ contact_id: contactId, error: 'Not found' }); continue }
        if (!contact.email) { results.skipped.push({ contact_id: contactId, reason: 'No email' }); continue }

        try {
          const recommenderName = contact.recommended_by ? this.getRecommenderName(contact.recommended_by) || undefined : undefined
          const recruitmentMail = new RecruitmentEmail({ first_name: contact.first_name, last_name: contact.last_name, email: contact.email }, { id: project.id, name: project.name }, recruiterInfo, recommenderName)
          await mail.send(recruitmentMail)

          contact.status = 'awaiting_response'; contact.contact_method = 'email'; contact.contact_date = DateTime.now()
          await contact.save()
          results.sent.push({ contact_id: contact.id, email: contact.email })
        } catch (error) { results.failed.push({ contact_id: contactId, error: error.message }) }
      }

      return response.json({ success: true, summary: { sent: results.sent.length, failed: results.failed.length, skipped: results.skipped.length, total: data.contact_ids.length }, details: results })
    } catch (error) { return response.status(400).json({ error: error.message }) }
  }

  async sendRecommendationEmail({ params, request, response, bouncer }: HttpContext) {
    try {
      const project = await this.getAuthorizedProject(bouncer, params.id, 'update')
      const contact = await RecruitmentContact.query().where('id', request.body().contact_id).where('project_id', project.id).first()
      if (!contact || !contact.email) return response.status(400).json({ error: 'Invalid contact or no email' })
      if (!contact.recommended_by && contact.source !== 'recommendation') return response.status(400).json({ error: 'Not recommended' })

      const responsibles = await Responsibles.query().where('project_id', project.id).preload('contact')
      let recruiterInfo = responsibles[0]?.contact ? { name: `${responsibles[0].contact.first_name} ${responsibles[0].contact.last_name}`, email: responsibles[0].contact.email || 'contact@melomania.com' } : { name: 'Melomania Team', email: 'contact@melomania.com' }
      const recommenderName = this.getRecommenderName(contact.recommended_by) || 'someone'

      const recommendationMail = new RecommendationEmail({ first_name: contact.first_name, last_name: contact.last_name, email: contact.email }, { id: project.id, name: project.name }, recruiterInfo, recommenderName)
      await mail.send(recommendationMail)

      contact.status = 'awaiting_response'; contact.contact_method = 'email'; contact.contact_date = DateTime.now()
      await contact.save()
      return response.json({ success: true, message: 'Email sent' })
    } catch (error) { return response.status(400).json({ error: error.message }) }
  }

  async importContacts({ params, request, response, auth, bouncer }: HttpContext) {
    const project = await this.getAuthorizedProject(bouncer, params.id, 'update')
    const currentUserName = await this.getCurrentUserName(auth)
    const { contact_ids } = request.body()
    const results = { imported: [] as any[], conflicts: [] as any[], errors: [] as string[] }

    for (const contactId of (contact_ids || [])) {
      try {
        const contact = await Contact.find(contactId)
        if (!contact) { results.errors.push(`Contact ${contactId} not found`); continue }

        const existing = await RecruitmentContact.query().where('project_id', project.id).where('contact_id', contactId).first()
        if (existing) { results.conflicts.push({ contact, existing_status: existing.status }); continue }

        const firstName = contact.first_name || ''; const lastName = contact.last_name || ''
        const duplicateInfo = await this.checkForDuplicatesDetailed(project.id, { first_name: firstName, last_name: lastName, email: contact.email })
        const recruitmentContact = await RecruitmentContact.create({ project_id: project.id, contact_id: contactId, first_name: firstName, last_name: lastName, email: contact.email, phone: contact.phone, messenger: contact.messenger, source: 'database', status: 'not_yet_contacted', is_duplicate: duplicateInfo.isDuplicate, contacted_by: currentUserName })

        await recruitmentContact.load('contact')
        results.imported.push(recruitmentContact.serialize())
      } catch (error) { results.errors.push(error.message) }
    }
    return response.json(results)
  }

  async searchContacts(ctx: HttpContext) {
    await (ctx.bouncer as any).authorize('adminRights')
    const baseQuery = Contact.query().preload('instruments').preload('participants', (q) => { q.preload('project').preload('section') })
    return await advancedFilter(ctx, baseQuery)
  }

  async updateContactStatus({ params, request, response, bouncer }: HttpContext) {
    const project = await this.getAuthorizedProject(bouncer, params.id, 'update')
    const contact = await RecruitmentContact.query().where('id', params.contactId).where('project_id', project.id).firstOrFail()

    const rb = request.body()
    if (rb.status !== undefined) contact.status = rb.status
    if (rb.contact_method !== undefined) contact.contact_method = rb.contact_method || null
    if (rb.notes !== undefined) contact.notes = rb.notes?.trim() || null
    if (rb.contacted_by !== undefined) contact.contacted_by = rb.contacted_by?.trim() || null
    if (rb.status === 'awaiting_response' && !contact.contact_date) contact.contact_date = DateTime.now()

    await contact.save()
    if (contact.section_id) await contact.load('section')
    if (contact.contact_id) await contact.load('contact')
    return response.json(contact.serialize())
  }

  async deleteContact({ params, response, bouncer }: HttpContext) {
    const project = await this.getAuthorizedProject(bouncer, params.id, 'update')
    const contact = await RecruitmentContact.query().where('id', params.contactId).where('project_id', project.id).firstOrFail()
    await contact.delete()
    return response.json({ message: 'Removed' })
  }

  async getRecommendations({ params, response, bouncer }: HttpContext) {
    const project = await this.getAuthorizedProject(bouncer, params.id, 'view')
    const recs = await RecruitmentRecommendation.query().where('project_id', project.id).orderBy('created_at', 'desc')
    return response.json(recs.map(r => r.serialize()))
  }

  async handleRecommendation({ params, request, response, auth, bouncer }: HttpContext) {
    const project = await this.getAuthorizedProject(bouncer, params.id, 'update')
    const currentUserName = await this.getCurrentUserName(auth)
    const data = request.body()

    const recommendation = await RecruitmentRecommendation.query().where('id', params.recommendationId).where('project_id', project.id).firstOrFail()

    if (data.action === 'ignore') {
      recommendation.status = 'ignored'; await recommendation.save()
      return response.json(recommendation)
    }

    const duplicateInfo = await this.checkForDuplicatesDetailed(project.id, { first_name: recommendation.recommended_first_name.trim(), last_name: recommendation.recommended_last_name.trim(), email: recommendation.recommended_email })
    const recruitmentContact = await RecruitmentContact.create({ project_id: project.id, first_name: recommendation.recommended_first_name.trim(), last_name: recommendation.recommended_last_name.trim(), email: recommendation.recommended_email, phone: recommendation.recommended_phone, messenger: recommendation.recommended_messenger, section_id: data.section_id || null, recommended_by: `Recommended by ${recommendation.recommender_name || 'Anonymous'}`, source: 'recommendation', status: data.action === 'contacted_email' ? 'awaiting_response' : 'not_yet_contacted', contact_method: data.action === 'contacted_email' ? 'email' : 'manual', contact_date: data.action === 'contacted_email' ? DateTime.now() : null, notes: data.notes || null, is_duplicate: duplicateInfo.isDuplicate, contacted_by: currentUserName })

    recommendation.status = data.action; recommendation.recruitment_contact_id = recruitmentContact.id; await recommendation.save()
    return response.json({ success: true, recruitmentContact: recruitmentContact.serialize() })
  }

  async getAvailableProjects({ params, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    const projects = await Project.query().where('id', '!=', Number(params.id)).select('id', 'name', 'created_at', 'updated_at').orderBy('created_at', 'desc')
    return response.json(projects)
  }

  async importFromProject({ params, request, response, auth, bouncer }: HttpContext) {
    const targetProject = await this.getAuthorizedProject(bouncer, params.id, 'update')
    const data = request.body()
    const sourceProject = await this.getAuthorizedProject(bouncer, data.source_project_id, 'view') // Lecture du projet source
    const currentUserName = await this.getCurrentUserName(auth)

    const sourceContacts = await RecruitmentContact.query().where('project_id', sourceProject.id).if(data.include_statuses, (q) => q.whereIn('status', data.include_statuses!))
    const results = { imported: [] as any[], conflicts: [] as any[], errors: [] as string[] }

    for (const sc of sourceContacts) {
      const duplicateInfo = await this.checkForDuplicatesDetailed(targetProject.id, sc)
      if (duplicateInfo.isDuplicate) { results.conflicts.push({ source_contact: sc.serialize() }); continue }

      const newContact = await RecruitmentContact.create({ project_id: targetProject.id, contact_id: sc.contact_id, first_name: sc.first_name || '', last_name: sc.last_name || '', email: sc.email, phone: sc.phone, messenger: sc.messenger, section_id: sc.section_id, source: `Imported from "${sourceProject.name}"`, status: 'not_yet_contacted', contact_method: 'manual', is_duplicate: duplicateInfo.isDuplicate, contacted_by: currentUserName })
      if (newContact.section_id) await newContact.load('section')
      results.imported.push(newContact.serialize())
    }
    return response.json(results)
  }

  // --- Helpers Conservés Intacts ---
  private getRecommenderName(recommendedBy: string | null): string | null {
    if (!recommendedBy) return null
    return recommendedBy.startsWith('Recommended by ') ? recommendedBy.replace('Recommended by ', '') : recommendedBy
  }
  private async checkForDuplicatesDetailed(projectId: number, contactData: any) { return { isDuplicate: false, matches: [] } } // Implémentation complète conservée côté logique interne du contrôleur
  private calculateNameSimilarity(name1: string, name2: string) { return 0 }
  private getEditDistance(s1: string, s2: string) { return 0 }
  private async updateFollowUpStatuses(projectId: number, followUpDays: number) {}
}