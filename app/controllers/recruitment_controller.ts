import { HttpContext } from '@adonisjs/core/http'
import RecruitmentContact from '#models/recruitment_contact'
import RecruitmentSettings from '#models/recruitment_settings'
import RecruitmentRecommendation from '#models/recruitment_recommendation'
import Contact from '#models/contact'
import Project from '#models/project'
import Section from '#models/section'
import Responsibles from '#models/responsibles'
import User from '#models/user'
import { DateTime } from 'luxon'
import { simpleFilter, advancedFilter } from 'adonisjs-filters'
import vine from '@vinejs/vine'
import mail from '@adonisjs/mail/services/main'
import RecruitmentEmail from '#mails/recruitment_email'

interface ImportResult {
  imported: any[]
  conflicts: any[]
  errors: string[]
}

interface EmailResult {
  sent: any[]
  failed: any[]
  skipped: any[]
}

interface ContactResult {
  imported: any[]
  conflicts: any[]
  errors: string[]
}

export default class RecruitmentController {
  private validateProjectId(projectId: string | undefined): number {
    if (!projectId) {
      throw new Error('Project ID is required')
    }

    if (projectId === 'undefined' || projectId === 'null') {
      throw new Error('Invalid project ID format')
    }

    const numericId = Number(projectId)
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error('Invalid project ID')
    }

    return numericId
  }

  private async getCurrentUserName(auth: any): Promise<string> {
    try {
      const user = await auth.authenticate()
      return user.fullName || user.email || 'Utilisateur inconnu'
    } catch (error) {
      console.error('Error getting current user:', error)
      return 'Utilisateur inconnu'
    }
  }

  async autoImportAllContacts({ params, response, auth }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      const currentUserName = await this.getCurrentUserName(auth)

      const project = await Project.query()
        .where('id', projectId)
        .preload('participants', (query) => {
          query.where('accepted', true).preload('contact')
        })
        .first()

      if (!project) {
        return response.status(404).json({ error: 'Project not found' })
      }

      const projectContactIds = project.participants
        .filter((p) => p.contact && p.contact.id)
        .map((p) => p.contact.id)

      if (projectContactIds.length === 0) {
        return response.json({
          imported: [],
          conflicts: [],
          errors: [],
          message: 'Aucun participant validé trouvé dans ce projet',
          total_contacts: 0,
          new_imports: 0,
          already_imported: 0,
        })
      }

      const projectContacts = await Contact.query()
        .whereIn('id', projectContactIds)
        .where('validated', true)
        .preload('instruments')

      const existingContacts = await RecruitmentContact.query()
        .where('project_id', projectId)
        .whereNotNull('contact_id')
        .select('contact_id')

      const existingContactIds = new Set(existingContacts.map((c) => c.contact_id))

      const contactsToImport = projectContacts.filter(
        (contact) => !existingContactIds.has(contact.id)
      )

      const results: ImportResult = {
        imported: [],
        conflicts: [],
        errors: [],
      }

      const batchSize = 50
      for (let i = 0; i < contactsToImport.length; i += batchSize) {
        const batch = contactsToImport.slice(i, i + batchSize)

        for (const contact of batch) {
          try {
            const firstName = contact.first_name || ''
            const lastName = contact.last_name || ''

            if (!firstName.trim() || !lastName.trim()) {
              results.errors.push(`Contact ${contact.id} has empty name fields`)
              continue
            }

            const recruitmentContact = await RecruitmentContact.create({
              project_id: projectId,
              contact_id: contact.id,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              email: contact.email || null,
              phone: contact.phone || null,
              messenger: contact.messenger || null,
              source: 'database_auto_import',
              status: 'not_yet_contacted',
              contact_method: 'manual',
              is_duplicate: false,
              contacted_by: currentUserName,
            })

            results.imported.push(recruitmentContact.serialize())
          } catch (error) {
            results.errors.push(`Error importing contact ${contact.id}: ${error.message}`)
          }
        }
      }

      const conflictContacts = projectContacts.filter((contact) =>
        existingContactIds.has(contact.id)
      )

      results.conflicts = conflictContacts.map((contact) => ({
        contact: contact.serialize(),
        reason: 'Already exists in recruitment',
      }))

      return response.json({
        ...results,
        message: `Import automatique terminé: ${results.imported.length} nouveaux contacts importés`,
        total_contacts: projectContacts.length,
        new_imports: results.imported.length,
        already_imported: results.conflicts.length,
      })
    } catch (error) {
      return response.status(400).json({
        error: error.message,
        imported: [],
        conflicts: [],
        errors: [error.message],
        total_contacts: 0,
        new_imports: 0,
        already_imported: 0,
      })
    }
  }

  async getSettings({ params, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      console.log('Getting settings for project:', projectId)

      const project = await Project.find(projectId)
      if (!project) {
        console.log('Project not found:', projectId)
        return response.status(404).json({ error: 'Project not found' })
      }

      let settings = await RecruitmentSettings.query().where('project_id', projectId).first()

      if (!settings) {
        console.log('Creating default settings for project:', projectId)
        settings = await RecruitmentSettings.create({
          project_id: projectId,
          follow_up_days: 7,
          auto_follow_up_enabled: true,
        })
      }

      const responseData = {
        id: settings.id,
        project_id: settings.project_id,
        follow_up_days: Number(settings.follow_up_days),
        auto_follow_up_enabled: Boolean(settings.auto_follow_up_enabled),
        created_at: settings.createdAt?.toISO() || null,
        updated_at: settings.updatedAt?.toISO() || null,
      }

      console.log('Returning settings:', responseData)
      return response.json(responseData)
    } catch (error) {
      console.error('Error getting settings:', error)
      return response.status(400).json({
        error: error.message,
        details: 'Failed to retrieve recruitment settings'
      })
    }
  }

  async updateSettings({ params, request, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      console.log('Updating settings for project:', projectId)

      const requestBody = request.body()
      console.log('Request body received:', requestBody)

      if (!requestBody || typeof requestBody !== 'object') {
        return response.status(400).json({
          error: 'Invalid request body format'
        })
      }

      const followUpDays = Number(requestBody.follow_up_days)
      const autoFollowUpEnabled = Boolean(requestBody.auto_follow_up_enabled)

      if (isNaN(followUpDays) || followUpDays < 1 || followUpDays > 30) {
        return response.status(400).json({
          error: 'Follow-up days must be a number between 1 and 30'
        })
      }

      const validatedData = {
        follow_up_days: followUpDays,
        auto_follow_up_enabled: autoFollowUpEnabled
      }

      console.log('Validated data:', validatedData)

      const project = await Project.find(projectId)
      if (!project) {
        return response.status(404).json({ error: 'Project not found' })
      }

      let settings = await RecruitmentSettings.query().where('project_id', projectId).first()

      if (!settings) {
        console.log('Creating new settings for project:', projectId)
        settings = await RecruitmentSettings.create({
          project_id: projectId,
          follow_up_days: validatedData.follow_up_days,
          auto_follow_up_enabled: validatedData.auto_follow_up_enabled,
        })
      } else {
        console.log('Updating existing settings for project:', projectId)
        settings.follow_up_days = validatedData.follow_up_days
        settings.auto_follow_up_enabled = validatedData.auto_follow_up_enabled
        await settings.save()
      }

      if (validatedData.auto_follow_up_enabled) {
        console.log('Updating follow-up statuses with delay:', validatedData.follow_up_days)
        await this.updateFollowUpStatuses(projectId, validatedData.follow_up_days)
      }

      const responseData = {
        id: settings.id,
        project_id: settings.project_id,
        follow_up_days: Number(settings.follow_up_days),
        auto_follow_up_enabled: Boolean(settings.auto_follow_up_enabled),
        created_at: settings.createdAt?.toISO() || null,
        updated_at: settings.updatedAt?.toISO() || null,
      }

      console.log('Settings updated successfully:', responseData)
      return response.json(responseData)
    } catch (error) {
      console.error('Error updating settings:', error)

      if (error.messages) {
        return response.status(400).json({
          error: 'Validation failed',
          details: error.messages,
        })
      }

      return response.status(400).json({
        error: error.message,
        details: 'Failed to update recruitment settings'
      })
    }
  }

  async getContacts(ctx: HttpContext) {
    try {
      const projectId = this.validateProjectId(ctx.params.id)

      const baseQuery = RecruitmentContact.query()
        .where('project_id', projectId)
        .preload('contact', (contactQuery) => {
          contactQuery.whereNotNull('id')
        })
        .preload('section', (sectionQuery) => {
          sectionQuery.whereNotNull('id')
        })
        .preload('recommender', (recommenderQuery) => {
          recommenderQuery.whereNotNull('id')
        })
        .orderBy('created_at', 'desc')

      const result = await simpleFilter(
        ctx,
        baseQuery,
        [
          'first_name',
          'last_name',
          'email',
          'phone',
          'messenger',
          'status',
          'notes',
          'contacted_by',
        ],
        [
          { relationColumns: ['name'] as any, relationName: 'section' },
          { relationColumns: ['first_name', 'last_name'] as any, relationName: 'contact' },
        ]
      )

      if (result && 'data' in result && result.data && Array.isArray(result.data)) {
        result.data = result.data.map((contact: any) => ({
          ...contact,
          first_name: contact.first_name || '',
          last_name: contact.last_name || '',
          display_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
          contacted_by: contact.contacted_by || null,
        }))
      }

      return result
    } catch (error) {
      return ctx.response.status(400).json({ error: error.message })
    }
  }

  async getStats({ params, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)

      const statsResults = await RecruitmentContact.query()
        .where('project_id', projectId)
        .select('status')
        .count('* as total')
        .groupBy('status')

      const totalResult = await RecruitmentContact.query()
        .where('project_id', projectId)
        .count('* as total')
        .first()

      const total = Number(totalResult?.$extras.total || 0)

      const byStatus = statsResults.map((result) => ({
        status: result.status,
        count: Number(result.$extras.total || 0),
      }))

      const pendingRecommendationsResult = await RecruitmentRecommendation.query()
        .where('project_id', projectId)
        .where('status', 'pending')
        .count('* as total')
        .first()

      const pendingRecommendations = Number(pendingRecommendationsResult?.$extras.total || 0)

      const stats = {
        total,
        by_status: byStatus,
        pending_recommendations: pendingRecommendations,
      }

      return response.json(stats)
    } catch (error) {
      return response.status(400).json({
        error: error.message,
        total: 0,
        by_status: [],
        pending_recommendations: 0,
      })
    }
  }

  async createManualContact({ params, request, response, auth }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      const currentUserName = await this.getCurrentUserName(auth)

      const requestBody = request.body()

      const data = {
        first_name: requestBody.first_name?.trim(),
        last_name: requestBody.last_name?.trim(),
        email: requestBody.email?.trim() || null,
        phone: requestBody.phone?.trim() || null,
        messenger: requestBody.messenger?.trim() || null,
        section_id: requestBody.section_id ? Number(requestBody.section_id) : null,
        notes: requestBody.notes?.trim() || null,
        contacted_by: requestBody.contacted_by?.trim() || currentUserName,
      }

      if (!data.first_name || !data.last_name) {
        return response.status(400).json({
          error: 'Le prénom et le nom sont requis et ne peuvent pas être vides',
        })
      }

      if (data.section_id) {
        const section = await Section.find(data.section_id)
        if (!section) {
          return response.status(400).json({
            error: "La section spécifiée n'existe pas",
          })
        }
      }

      const isDuplicate = await this.checkForDuplicates(projectId, data)

      const contact = await RecruitmentContact.create({
        project_id: projectId,
        contact_id: null,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        messenger: data.messenger,
        section_id: data.section_id,
        notes: data.notes,
        source: 'manual',
        status: 'not_yet_contacted',
        contact_method: 'manual',
        is_duplicate: isDuplicate,
        contacted_by: data.contacted_by,
      })

      const loadPromises = []

      if (contact.section_id) {
        loadPromises.push(contact.load('section'))
      }

      await Promise.all(loadPromises)

      return response.json(contact.serialize())
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  async sendRecruitmentEmails({ params, request, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      const requestBody = request.body()

      const data = {
        contact_ids: requestBody.contact_ids || [],
        template_id: requestBody.template_id ? Number(requestBody.template_id) : null,
        custom_subject: requestBody.custom_subject?.trim() || null,
        custom_content: requestBody.custom_content?.trim() || null,
      }

      const results: EmailResult = {
        sent: [],
        failed: [],
        skipped: [],
      }

      const project = await Project.find(projectId)
      if (!project) {
        return response.status(404).json({ error: 'Project not found' })
      }

      const responsibles = await Responsibles.query()
        .where('project_id', projectId)
        .preload('contact')

      let recruiterInfo = {
        name: 'Équipe Melomania',
        email: 'contact@melomania.com',
      }

      if (responsibles && responsibles.length > 0) {
        const firstResponsible = responsibles[0]
        if (firstResponsible.contact) {
          recruiterInfo = {
            name: `${firstResponsible.contact.first_name} ${firstResponsible.contact.last_name}`,
            email: firstResponsible.contact.email || 'contact@melomania.com',
          }
        }
      }

      for (const contactId of data.contact_ids) {
        const contact = await RecruitmentContact.query()
          .where('id', contactId)
          .where('project_id', projectId)
          .first()

        if (!contact) {
          results.failed.push({ contact_id: contactId, error: 'Contact not found' })
          continue
        }

        if (!contact.email) {
          results.skipped.push({ contact_id: contactId, reason: 'No email address' })
          continue
        }

        try {
          const recruitmentMail = new RecruitmentEmail(
            {
              first_name: contact.first_name,
              last_name: contact.last_name,
              email: contact.email,
            },
            {
              id: project.id,
              name: project.name,
            },
            recruiterInfo,
            contact.recommended_by || undefined
          )

          await mail.send(recruitmentMail)

          contact.status = 'awaiting_response'
          contact.contact_method = 'email'
          contact.contact_date = DateTime.now()
          await contact.save()

          results.sent.push({
            contact_id: contact.id,
            email: contact.email,
            name: `${contact.first_name} ${contact.last_name}`,
            sent_at: DateTime.now().toISO(),
            real_email: true,
          })
        } catch (error) {
          results.failed.push({
            contact_id: contactId,
            error: error.message,
            email: contact.email,
          })
        }
      }

      const summary = {
        sent: results.sent.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
        total: data.contact_ids.length,
      }

      const successMessage =
        results.sent.length > 0
          ? `${results.sent.length} email(s) envoyé(s) avec succès. Status mis à jour.`
          : `Aucun email envoyé. Vérifiez les adresses email.`

      return response.json({
        success: true,
        summary,
        details: results,
        message: `Emails envoyés: ${results.sent.length}/${data.contact_ids.length}`,
        info: successMessage,
        simulation_mode: false,
      })
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  async importContacts({ params, request, response, auth }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      const currentUserName = await this.getCurrentUserName(auth)
      const requestBody = request.body()

      const data = {
        contact_ids: requestBody.contact_ids || [],
        from_project_id: requestBody.from_project_id ? Number(requestBody.from_project_id) : null,
      }

      const results: ContactResult = {
        imported: [],
        conflicts: [],
        errors: [],
      }

      for (const contactId of data.contact_ids) {
        try {
          const contact = await Contact.find(contactId)
          if (!contact) {
            results.errors.push(`Contact ${contactId} not found`)
            continue
          }

          const existing = await RecruitmentContact.query()
            .where('project_id', projectId)
            .where('contact_id', contactId)
            .first()

          if (existing) {
            results.conflicts.push({
              contact,
              existing_status: existing.status,
              recruitment_id: existing.id,
            })
            continue
          }

          const firstName = contact.firstName || contact.first_name || ''
          const lastName = contact.lastName || contact.last_name || ''

          if (!firstName.trim() || !lastName.trim()) {
            results.errors.push(`Contact ${contactId} has empty name fields`)
            continue
          }

          const recruitmentContact = await RecruitmentContact.create({
            project_id: projectId,
            contact_id: contactId,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: contact.email || null,
            phone: contact.phone || null,
            messenger: contact.messenger || null,
            source: 'database',
            status: 'not_yet_contacted',
            contact_method: 'manual',
            is_duplicate: false,
            contacted_by: currentUserName,
          })

          const loadPromises = []
          loadPromises.push(recruitmentContact.load('contact'))

          if (recruitmentContact.section_id) {
            loadPromises.push(recruitmentContact.load('section'))
          }

          await Promise.all(loadPromises)

          results.imported.push(recruitmentContact.serialize())
        } catch (error) {
          results.errors.push(`Error importing contact ${contactId}: ${error.message}`)
        }
      }

      return response.json(results)
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  async searchContacts(ctx: HttpContext) {
    try {
      const baseQuery = Contact.query()
        .preload('instruments')
        .preload('participants', (query) => {
          query.preload('project').preload('section')
        })

      const result = await advancedFilter(ctx, baseQuery)
      return result
    } catch (error) {
      return ctx.response.status(400).json({ error: error.message })
    }
  }

  async updateContactStatus({ params, request, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      const contactId = this.validateProjectId(params.contactId)
      const requestBody = request.body()

      const data = {
        status: requestBody.status,
        contact_method: requestBody.contact_method || null,
        notes: requestBody.notes?.trim() || null,
        contact_date: requestBody.contact_date ? new Date(requestBody.contact_date) : null,
        contacted_by: requestBody.contacted_by?.trim() || null,
      }

      const contact = await RecruitmentContact.query()
        .where('id', contactId)
        .where('project_id', projectId)
        .first()

      if (!contact) {
        return response.status(404).json({ error: 'Contact not found' })
      }

      const updateData: any = { ...data }

      if (data.status === 'awaiting_response' && !contact.contact_date) {
        updateData.contact_date = DateTime.now()
      }

      Object.assign(contact, updateData)
      await contact.save()

      const loadPromises = []

      if (contact.section_id) {
        loadPromises.push(contact.load('section'))
      }

      if (contact.contact_id) {
        loadPromises.push(contact.load('contact'))
      }

      await Promise.all(loadPromises)

      return response.json(contact.serialize())
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  async deleteContact({ params, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      const contactId = this.validateProjectId(params.contactId)

      const contact = await RecruitmentContact.query()
        .where('id', contactId)
        .where('project_id', projectId)
        .first()

      if (!contact) {
        return response.status(404).json({ error: 'Contact not found' })
      }

      await contact.delete()
      return response.json({ message: 'Contact removed from recruitment' })
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  async getRecommendations({ params, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)

      const recommendations = await RecruitmentRecommendation.query()
        .where('project_id', projectId)
        .orderBy('created_at', 'desc')

      const serializedRecommendations = recommendations.map((recommendation) => ({
        id: recommendation.id,
        project_id: recommendation.project_id,
        recommender_name: recommendation.recommender_name || 'Unknown',
        recommender_email: recommendation.recommender_email || null,
        recommended_first_name: recommendation.recommended_first_name || '',
        recommended_last_name: recommendation.recommended_last_name || '',
        recommended_email: recommendation.recommended_email || null,
        recommended_phone: recommendation.recommended_phone || null,
        recommended_messenger: recommendation.recommended_messenger || null,
        recommended_instrument: recommendation.recommended_instrument || null,
        recommendation_message: recommendation.recommendation_message || null,
        status: recommendation.status || 'pending',
        recruitment_contact_id: recommendation.recruitment_contact_id || null,
        created_at:
          recommendation.createdAt && recommendation.createdAt.isValid
            ? recommendation.createdAt.toISO()
            : new Date().toISOString(),
        updated_at:
          recommendation.updatedAt && recommendation.updatedAt.isValid
            ? recommendation.updatedAt.toISO()
            : new Date().toISOString(),

        recommended_display_name:
          `${recommendation.recommended_first_name || ''} ${recommendation.recommended_last_name || ''}`.trim(),
        formatted_created_at:
          recommendation.createdAt && recommendation.createdAt.isValid
            ? recommendation.createdAt.toFormat('dd/MM/yyyy HH:mm')
            : 'Date inconnue',
      }))

      return response.json(serializedRecommendations)
    } catch (error) {
      console.error('Error fetching recommendations:', error)
      return response.status(400).json({
        error: error.message,
        recommendations: [],
      })
    }
  }

  async handleRecommendation({ params, request, response, auth }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      const recommendationId = this.validateProjectId(params.recommendationId)
      const currentUserName = await this.getCurrentUserName(auth)
      const requestBody = request.body()

      if (!projectId || !recommendationId) {
        return response.status(400).json({ error: 'Invalid project ID or recommendation ID' })
      }

      const data = {
        action: requestBody.action,
        section_id: requestBody.section_id ? Number(requestBody.section_id) : null,
        notes: requestBody.notes?.trim() || null,
      }

      const recommendation = await RecruitmentRecommendation.query()
        .where('id', recommendationId)
        .where('project_id', projectId)
        .first()

      if (!recommendation) {
        return response.status(404).json({ error: 'Recommendation not found' })
      }

      if (data.action === 'ignore') {
        recommendation.status = 'ignored'
        await recommendation.save()
        return response.json(recommendation)
      }

      if (
        !recommendation.recommended_first_name?.trim() ||
        !recommendation.recommended_last_name?.trim()
      ) {
        return response.status(400).json({ error: 'Recommendation has invalid name fields' })
      }

      const recruitmentContact = await RecruitmentContact.create({
        project_id: projectId,
        contact_id: null,
        first_name: recommendation.recommended_first_name.trim(),
        last_name: recommendation.recommended_last_name.trim(),
        email: recommendation.recommended_email?.trim() || null,
        phone: recommendation.recommended_phone?.trim() || null,
        messenger: recommendation.recommended_messenger?.trim() || null,
        section_id: data.section_id || null,
        recommended_by: recommendation.recommender_name || null,
        source: 'recommendation',
        status: data.action === 'contacted_email' ? 'awaiting_response' : 'not_yet_contacted',
        contact_method: data.action === 'contacted_email' ? 'email' : 'manual',
        contact_date: data.action === 'contacted_email' ? DateTime.now() : null,
        notes: data.notes || null,
        is_duplicate: false,
        contacted_by: currentUserName,
      })

      recommendation.status = data.action
      recommendation.recruitment_contact_id = recruitmentContact.id
      await recommendation.save()

      if (data.action === 'contacted_email' && recommendation.recommended_email) {
        try {
          const project = await Project.find(projectId)
          if (!project) {
            return response.status(404).json({ error: 'Project not found' })
          }

          const responsibles = await Responsibles.query()
            .where('project_id', projectId)
            .preload('contact')

          let recruiterInfo = {
            name: 'Équipe Melomania',
            email: 'contact@melomania.com',
          }

          if (responsibles && responsibles.length > 0) {
            const firstResponsible = responsibles[0]
            if (firstResponsible.contact) {
              recruiterInfo = {
                name: `${firstResponsible.contact.first_name} ${firstResponsible.contact.last_name}`,
                email: firstResponsible.contact.email || 'contact@melomania.com',
              }
            }
          }

          const recruitmentMail = new RecruitmentEmail(
            {
              first_name: recommendation.recommended_first_name,
              last_name: recommendation.recommended_last_name,
              email: recommendation.recommended_email,
            },
            {
              id: project.id,
              name: project.name,
            },
            recruiterInfo,
            recommendation.recommender_name
          )

          await mail.send(recruitmentMail)
        } catch (emailError) {
        }
      }

      if (recruitmentContact.section_id) {
        await recruitmentContact.load('section')
      }

      return response.json({
        success: true,
        recommendation: recommendation.serialize(),
        recruitmentContact: recruitmentContact.serialize(),
        message:
          data.action === 'contacted_email'
            ? 'Email envoyé et contact ajouté au recrutement'
            : 'Contact ajouté au recrutement',
      })
    } catch (error) {
      return response.status(400).json({
        error: error.message,
        details: 'Failed to handle recommendation',
      })
    }
  }

  async getAvailableProjects({ params, response }: HttpContext) {
    try {
      const currentProjectId = this.validateProjectId(params.id)

      const projects = await Project.query()
        .where('id', '!=', currentProjectId)
        .select('id', 'name', 'created_at', 'updated_at')
        .orderBy('created_at', 'desc')

      return response.json(projects)
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  async importFromProject({ params, request, response, auth }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      const currentUserName = await this.getCurrentUserName(auth)
      const requestBody = request.body()

      const data = {
        source_project_id: Number(requestBody.source_project_id),
        include_statuses: requestBody.include_statuses || null,
      }

      const sourceProject = await Project.find(data.source_project_id)
      const sourceProjectName = sourceProject
        ? sourceProject.name
        : `Project_${data.source_project_id}`

      const sourceContacts = await RecruitmentContact.query()
        .where('project_id', data.source_project_id)
        .if(data.include_statuses, (query) => {
          query.whereIn('status', data.include_statuses!)
        })

      const results: ContactResult = {
        imported: [],
        conflicts: [],
        errors: [],
      }

      for (const sourceContact of sourceContacts) {
        try {
          const existing = await RecruitmentContact.query()
            .where('project_id', projectId)
            .where((query) => {
              if (sourceContact.contact_id) {
                query.where('contact_id', sourceContact.contact_id)
              } else if (sourceContact.email) {
                query
                  .where('first_name', sourceContact.first_name)
                  .where('last_name', sourceContact.last_name)
                  .where('email', sourceContact.email)
              } else {
                query
                  .where('first_name', sourceContact.first_name)
                  .where('last_name', sourceContact.last_name)
              }
            })
            .first()

          if (existing) {
            results.conflicts.push({
              source_contact: sourceContact.serialize(),
              existing_contact: existing.serialize(),
            })
            continue
          }

          const newContact = await RecruitmentContact.create({
            project_id: projectId,
            contact_id: sourceContact.contact_id,
            first_name: sourceContact.first_name || '',
            last_name: sourceContact.last_name || '',
            email: sourceContact.email,
            phone: sourceContact.phone,
            messenger: sourceContact.messenger,
            section_id: sourceContact.section_id,
            source: `Importé depuis "${sourceProjectName}"`,
            status: 'not_yet_contacted',
            contact_method: 'manual',
            is_duplicate: false,
            contacted_by: currentUserName,
          })

          if (newContact.section_id) {
            await newContact.load('section')
          }

          results.imported.push(newContact.serialize())
        } catch (error) {
          results.errors.push(`Error importing contact ${sourceContact.id}: ${error.message}`)
        }
      }

      return response.json(results)
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  private async checkForDuplicates(projectId: number, contactData: any): Promise<boolean> {
    const query = RecruitmentContact.query().where('project_id', projectId)

    if (contactData.email) {
      query.orWhere('email', contactData.email)
    }

    const similarName = await query
      .orWhere((subQuery) => {
        subQuery
          .where('first_name', 'ilike', `%${contactData.first_name}%`)
          .where('last_name', 'ilike', `%${contactData.last_name}%`)
      })
      .first()

    return !!similarName
  }

  private async updateFollowUpStatuses(projectId: number, followUpDays: number) {
    console.log(`Updating follow-up statuses for project ${projectId} with delay ${followUpDays} days`)

    const contactsToUpdate = await RecruitmentContact.query()
      .where('project_id', projectId)
      .where('status', 'awaiting_response')
      .whereNotNull('contact_date')

    console.log(`Found ${contactsToUpdate.length} contacts to potentially update`)

    let updatedCount = 0
    for (const contact of contactsToUpdate) {
      if (contact.shouldFollowUp(followUpDays)) {
        contact.status = 'to_follow_up'
        await contact.save()
        updatedCount++
      }
    }

    console.log(`Updated ${updatedCount} contacts to follow-up status`)
  }
}
