import { HttpContext } from '@adonisjs/core/http'
import RecruitmentContact from '#models/recruitment_contact'
import RecruitmentSettings from '#models/recruitment_settings'
import RecruitmentRecommendation from '#models/recruitment_recommendation'
import Contact from '#models/contact'
import Project from '#models/project'
import Section from '#models/section'
import Responsibles from '#models/responsibles'
import User from '#models/user'
import Participant from '#models/participant'
import { DateTime } from 'luxon'
import { simpleFilter, advancedFilter } from 'adonisjs-filters'
import vine from '@vinejs/vine'
import mail from '@adonisjs/mail/services/main'
import RecruitmentEmail from '#mails/recruitment_email'
import RecommendationEmail from '#mails/recommendation_email'

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
  replaced?: any[]
  conflicts: any[]
  errors: string[]
}

export default class RecruitmentController {
  private normalizeEmail(value: string | null | undefined): string {
    return (value || '').trim().toLowerCase()
  }

  private normalizePhone(value: string | null | undefined): string {
    return (value || '')
      .replace(/\s|\/|\.|-/g, '')
      .replace(/^\+32/, '0')
      .replace(/^0032/, '0')
      .trim()
  }

  private normalizeMessenger(value: string | null | undefined): string {
    return (value || '').trim().toLowerCase()
  }

  private hasIdenticalCommunicationDetails(contactData: {
    email?: string | null
    phone?: string | null
    messenger?: string | null
  }, existingData: {
    email?: string | null
    phone?: string | null
    messenger?: string | null
  }): boolean {
    return (
      this.normalizeEmail(contactData.email) === this.normalizeEmail(existingData.email) &&
      this.normalizePhone(contactData.phone) === this.normalizePhone(existingData.phone) &&
      this.normalizeMessenger(contactData.messenger) === this.normalizeMessenger(existingData.messenger)
    )
  }

  private isRecruitmentContactUniqueConstraintError(error: any): boolean {
    const message = String(error?.message || '')
    const constraint = String(error?.constraint || '')

    return (
      constraint === 'recruitment_contacts_project_id_contact_id_unique' ||
      message.includes('recruitment_contacts_project_id_contact_id_unique')
    )
  }

  private getImportContactErrorMessage(error: any): string {
    if (this.isRecruitmentContactUniqueConstraintError(error)) {
      return 'This contact is already in the recruitment contact list.'
    }

    return error.message
  }

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
      return user.fullName || user.email || 'System user'
    } catch (error) {
      console.error('Error getting current user:', error)
      return 'System user'
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
          message: 'No validated participants found in this project',
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
          results.errors.push(`Error importing contact ${contact.id}: ${this.getImportContactErrorMessage(error)}`)
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
        message: `Auto import completed: ${results.imported.length} new contacts imported`,
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

  async getSettings({ params, response, auth }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      const organizationId = auth.user?.organizationId

      const project = await Project.query()
        .where('id', projectId)
        .if(organizationId, (query) => query.where('organization_id', organizationId!))
        .first()
      if (!project) {
        return response.status(404).json({ error: 'Project not found' })
      }

      let settings = await RecruitmentSettings.query().where('project_id', projectId).first()

      if (!settings) {
        settings = await RecruitmentSettings.create({
          project_id: projectId,
          follow_up_days: 7,
          auto_follow_up_enabled: true,
          organizationId,
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

      return response.json(responseData)
    } catch (error) {
      console.error('Error getting settings:', error)
      return response.status(400).json({
        error: error.message,
        details: 'Failed to retrieve recruitment settings'
      })
    }
  }

  async updateSettings({ params, request, response, auth }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      const organizationId = auth.user?.organizationId

      const requestBody = request.body()

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

      const project = await Project.query()
        .where('id', projectId)
        .if(organizationId, (query) => query.where('organization_id', organizationId!))
        .first()
      if (!project) {
        return response.status(404).json({ error: 'Project not found' })
      }

      let settings = await RecruitmentSettings.query().where('project_id', projectId).first()

      if (!settings) {
        settings = await RecruitmentSettings.create({
          project_id: projectId,
          follow_up_days: validatedData.follow_up_days,
          auto_follow_up_enabled: validatedData.auto_follow_up_enabled,
          organizationId,
        })
      } else {
        settings.follow_up_days = validatedData.follow_up_days
        settings.auto_follow_up_enabled = validatedData.auto_follow_up_enabled
        await settings.save()
      }

      if (validatedData.auto_follow_up_enabled) {
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
        contact_id: requestBody.contact_id ? Number(requestBody.contact_id) : null,
        first_name: requestBody.first_name?.trim(),
        last_name: requestBody.last_name?.trim(),
        email: requestBody.email?.trim() || null,
        phone: requestBody.phone?.trim() || null,
        messenger: requestBody.messenger?.trim() || null,
        section_id: requestBody.section_id ? Number(requestBody.section_id) : null,
        notes: requestBody.notes?.trim() || null,
        contacted_by: requestBody.contacted_by?.trim() || currentUserName,
        allow_duplicate_name: Boolean(requestBody.allow_duplicate_name),
      }

      if (!data.first_name || !data.last_name) {
        return response.status(400).json({
          error: 'First name and last name are required',
        })
      }

      if (data.section_id) {
        const section = await Section.find(data.section_id)
        if (!section) {
          return response.status(400).json({
            error: 'Specified section does not exist',
          })
        }
      }

      const exactExistingMatch = await this.findExactRecruitmentMatch(projectId, {
        contact_id: data.contact_id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        messenger: data.messenger,
      })

      if (exactExistingMatch && !data.allow_duplicate_name) {
        return response.status(409).json({
          code: 'EXACT_RECRUITMENT_CONTACT_ALREADY_EXISTS',
          error: 'This contact already exists in this recruitment list.',
          duplicate_warnings: [{
            warning_type: 'exact_existing_contact',
            contact: data,
            matches: [{
              type: 'exact_contact',
              contact: exactExistingMatch.serialize(),
              match_id: exactExistingMatch.id,
            }],
          }],
        })
      }

      const duplicateInfo = await this.checkForDuplicatesDetailed(projectId, data)

      if (duplicateInfo.isDuplicate && !data.allow_duplicate_name) {
        return response.status(409).json({
          code: 'POTENTIAL_DUPLICATE_RECRUITMENT_CONTACT',
          error: 'A contact with an identical or similar name already exists in this recruitment list.',
          duplicate_warnings: [{
            warning_type: duplicateInfo.matches.some((match) => match.type === 'exact_contact')
              ? 'exact_existing_contact'
              : 'similar_contact',
            contact: data,
            matches: duplicateInfo.matches,
          }],
        })
      }

      const contact = await RecruitmentContact.create({
        project_id: projectId,
        contact_id: data.contact_id,
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
        is_duplicate: duplicateInfo.isDuplicate,
        contacted_by: data.contacted_by,
      })

      const loadPromises = []

      if (contact.section_id) {
        loadPromises.push(contact.load('section'))
      }

      await Promise.all(loadPromises)

      return response.json({
        ...contact.serialize(),
        duplicate_matches: duplicateInfo.matches
      })
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
        name: 'Melomania Team',
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
          const recommenderName = contact.recommended_by ? this.getRecommenderName(contact.recommended_by) || undefined : undefined

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
            recommenderName
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
          ? `${results.sent.length} email(s) sent successfully. Status updated.`
          : `No emails sent. Please check email addresses.`

      return response.json({
        success: true,
        summary,
        details: results,
        message: `Emails sent: ${results.sent.length}/${data.contact_ids.length}`,
        info: successMessage,
        simulation_mode: false,
      })
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  async sendRecommendationEmail({ params, request, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      const requestBody = request.body()

      const contactId = requestBody.contact_id

      const contact = await RecruitmentContact.query()
        .where('id', contactId)
        .where('project_id', projectId)
        .first()

      if (!contact) {
        return response.status(404).json({ error: 'Contact not found' })
      }

      if (!contact.email) {
        return response.status(400).json({ error: 'Contact has no email address' })
      }

      if (!contact.recommended_by && contact.source !== 'recommendation') {
        return response.status(400).json({ error: 'This contact was not recommended' })
      }

      const project = await Project.find(projectId)
      if (!project) {
        return response.status(404).json({ error: 'Project not found' })
      }

      const responsibles = await Responsibles.query()
        .where('project_id', projectId)
        .preload('contact')

      let recruiterInfo = {
        name: 'Melomania Team',
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

      const recommenderName = this.getRecommenderName(contact.recommended_by) || 'someone'

      try {
        const recommendationMail = new RecommendationEmail(
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
          recommenderName
        )

        await mail.send(recommendationMail)

        contact.status = 'awaiting_response'
        contact.contact_method = 'email'
        contact.contact_date = DateTime.now()
        await contact.save()

        return response.json({
          success: true,
          message: 'Recommendation email sent successfully',
          contact_id: contact.id,
          email: contact.email,
          recommender: recommenderName,
          sent_at: DateTime.now().toISO(),
        })

      } catch (emailError) {
        return response.status(400).json({
          error: 'Failed to send recommendation email',
          details: emailError.message,
        })
      }

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
        allow_duplicate_name: Boolean(requestBody.allow_duplicate_name),
        replace_existing: Boolean(requestBody.replace_existing),
      }

      const results: ContactResult = {
        imported: [],
        replaced: [],
        conflicts: [],
        errors: [],
      }

      const duplicateWarnings: any[] = []
      const exactConflictWarnings: any[] = []
      const contactsToImport: Array<{
        contact: Contact
        contactId: number
        firstName: string
        lastName: string
        duplicateInfo: { isDuplicate: boolean; matches: any[] }
      }> = []

      for (const contactId of data.contact_ids) {
        try {
          const contact = await Contact.find(contactId)
          if (!contact) {
            results.errors.push(`Contact ${contactId} not found`)
            continue
          }

          const firstName = contact.firstName || contact.first_name || ''
          const lastName = contact.lastName || contact.last_name || ''

          const existing = await this.findExactRecruitmentMatch(projectId, {
            contact_id: contactId,
            first_name: firstName,
            last_name: lastName,
            email: contact.email,
            phone: contact.phone,
            messenger: contact.messenger,
          })

          if (existing) {
            if (data.replace_existing) {
              existing.first_name = firstName.trim()
              existing.last_name = lastName.trim()
              existing.email = contact.email || null
              existing.phone = contact.phone || null
              existing.messenger = contact.messenger || null
              existing.source = 'database'
              existing.is_duplicate = false
              existing.contacted_by = existing.contacted_by || currentUserName
              await existing.save()

              await existing.load('contact')
              if (existing.section_id) {
                await existing.load('section')
              }

              results.replaced!.push(existing.serialize())
              continue
            }

            exactConflictWarnings.push({
              warning_type: 'exact_existing_contact',
              contact: {
                id: contact.id,
                first_name: firstName,
                last_name: lastName,
                email: contact.email || null,
                phone: contact.phone || null,
                messenger: contact.messenger || null,
              },
              matches: [{
                type: 'exact_contact',
                match_id: existing.id,
                contact: existing.serialize(),
              }],
            })
            continue
          }

          if (!firstName.trim() || !lastName.trim()) {
            results.errors.push(`Contact ${contactId} has empty name fields`)
            continue
          }

          let duplicateInfo = await this.checkForDuplicatesDetailed(projectId, {
            contact_id: contact.id,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: contact.email,
            phone: contact.phone,
            messenger: contact.messenger,
          })

          const pendingMatches = contactsToImport
            .filter((item) => this.arePotentialDuplicateContacts(
              {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: contact.email,
              },
              {
                first_name: item.firstName,
                last_name: item.lastName,
                email: item.contact.email,
              }
            ))
            .map((item) => ({
              type: 'pending_import',
              contact: {
                id: item.contactId,
                first_name: item.firstName,
                last_name: item.lastName,
                email: item.contact.email || null,
                phone: item.contact.phone || null,
                messenger: item.contact.messenger || null,
                source: 'Pending import',
                status: 'Selected for import',
              },
              match_id: item.contactId,
              similarity: this.calculateNameSimilarity(
                this.normalizeName(`${firstName.trim()} ${lastName.trim()}`),
                this.normalizeName(`${item.firstName} ${item.lastName}`)
              ),
            }))

          if (pendingMatches.length > 0) {
            duplicateInfo = {
              isDuplicate: true,
              matches: [...duplicateInfo.matches, ...pendingMatches],
            }
          }

          if (duplicateInfo.matches.some((match) => match.type === 'exact_contact')) {
            const warning = {
              warning_type: 'exact_existing_contact',
              contact: {
                id: contact.id,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: contact.email || null,
                phone: contact.phone || null,
                messenger: contact.messenger || null,
              },
              matches: duplicateInfo.matches,
            }

            exactConflictWarnings.push(warning)
            continue
          }

          if (duplicateInfo.isDuplicate && !data.allow_duplicate_name) {
            const warning = {
              warning_type: 'similar_contact',
              contact: {
                id: contact.id,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: contact.email || null,
                phone: contact.phone || null,
                messenger: contact.messenger || null,
              },
              matches: duplicateInfo.matches,
            }

            duplicateWarnings.push(warning)
            continue
          }

          contactsToImport.push({
            contact,
            contactId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            duplicateInfo,
          })
        } catch (error) {
          results.errors.push(`Error preparing contact ${contactId}: ${error.message}`)
        }
      }

      if (exactConflictWarnings.length > 0) {
        return response.status(409).json({
          code: 'EXACT_RECRUITMENT_CONTACT_ALREADY_EXISTS',
          error: 'Some contacts are already in this recruitment list.',
          duplicate_warnings: [...exactConflictWarnings, ...duplicateWarnings],
        })
      }

      if (duplicateWarnings.length > 0) {
        return response.status(409).json({
          code: 'POTENTIAL_DUPLICATE_RECRUITMENT_CONTACT',
          error: 'Some contacts have identical or similar names to contacts already in this recruitment list.',
          duplicate_warnings: duplicateWarnings,
        })
      }

      for (const item of contactsToImport) {
        try {
          const { contact, contactId, firstName, lastName, duplicateInfo } = item

          const recruitmentContact = await RecruitmentContact.create({
            project_id: projectId,
            contact_id: contactId,
            first_name: firstName,
            last_name: lastName,
            email: contact.email || null,
            phone: contact.phone || null,
            messenger: contact.messenger || null,
            source: 'database',
            status: 'not_yet_contacted',
            contact_method: 'manual',
            is_duplicate: duplicateInfo.isDuplicate,
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
          results.errors.push(`Error importing contact ${item.contactId}: ${this.getImportContactErrorMessage(error)}`)
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

      const contact = await RecruitmentContact.query()
        .where('id', contactId)
        .where('project_id', projectId)
        .first()

      if (!contact) {
        return response.status(404).json({ error: 'Contact not found' })
      }

      if (requestBody.status !== undefined) contact.status = requestBody.status
      if (requestBody.contact_method !== undefined) contact.contact_method = requestBody.contact_method || null
      if (requestBody.notes !== undefined) contact.notes = requestBody.notes?.trim() || null
      if (requestBody.contact_date !== undefined) contact.contact_date = requestBody.contact_date ? DateTime.fromISO(new Date(requestBody.contact_date).toISOString()) : null
      if (requestBody.contacted_by !== undefined) contact.contacted_by = requestBody.contacted_by?.trim() || null

      if (requestBody.status === 'awaiting_response' && !contact.contact_date) {
        contact.contact_date = DateTime.now()
      }
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

      const serializedRecommendations = recommendations.map((recommendation) => {
        const createdAt = recommendation.createdAt && recommendation.createdAt.isValid
          ? recommendation.createdAt
          : DateTime.now()

        const updatedAt = recommendation.updatedAt && recommendation.updatedAt.isValid
          ? recommendation.updatedAt
          : DateTime.now()

        return {
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
          created_at: createdAt.toISO(),
          updated_at: updatedAt.toISO(),
          createdAt: createdAt.toISO(),

          recommended_display_name: `${recommendation.recommended_first_name || ''} ${recommendation.recommended_last_name || ''}`.trim(),
          formatted_created_at: createdAt.toFormat('dd/MM/yyyy HH:mm'),
        }
      })

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

      const duplicateInfo = await this.checkForDuplicatesDetailed(projectId, {
        first_name: recommendation.recommended_first_name.trim(),
        last_name: recommendation.recommended_last_name.trim(),
        email: recommendation.recommended_email
      })

      const recommendedByText = recommendation.recommender_name
        ? recommendation.recommender_name
        : 'Anonymous'

      const recruitmentContact = await RecruitmentContact.create({
        project_id: projectId,
        contact_id: null,
        first_name: recommendation.recommended_first_name.trim(),
        last_name: recommendation.recommended_last_name.trim(),
        email: recommendation.recommended_email?.trim() || null,
        phone: recommendation.recommended_phone?.trim() || null,
        messenger: recommendation.recommended_messenger?.trim() || null,
        section_id: data.section_id || null,
        recommended_by: `Recommended by ${recommendedByText}`,
        source: 'recommendation',
        status: data.action === 'contacted_email' ? 'awaiting_response' : 'not_yet_contacted',
        contact_method: data.action === 'contacted_email' ? 'email' : 'manual',
        contact_date: data.action === 'contacted_email' ? DateTime.now() : null,
        notes: data.notes || null,
        is_duplicate: duplicateInfo.isDuplicate,
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
            name: 'Melomania Team',
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
          // Do not fail the entire request if email fails
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
            ? 'Email sent and contact added to recruitment'
            : 'Contact added to recruitment',
      })
    } catch (error) {
      return response.status(400).json({
        error: error.message,
        details: 'Failed to handle recommendation',
      })
    }
  }

  async getAvailableProjects({ params, response, auth }: HttpContext) {
    try {
      const currentProjectId = this.validateProjectId(params.id)
      const organizationId = auth.user?.organizationId

      const projects = await Project.query()
        .where('id', '!=', currentProjectId)
        .if(organizationId, (query) => query.where('organization_id', organizationId!))
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
        allow_duplicate_name: Boolean(requestBody.allow_duplicate_name),
        replace_existing: Boolean(requestBody.replace_existing),
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
        replaced: [],
        conflicts: [],
        errors: [],
      }

      const duplicateWarnings: any[] = []
      const exactConflictWarnings: any[] = []
      const contactsToImport: Array<{
        sourceContact: RecruitmentContact
        duplicateInfo: { isDuplicate: boolean; matches: any[] }
      }> = []

      for (const sourceContact of sourceContacts) {
        try {
          const existing = await this.findExactRecruitmentMatch(projectId, {
            contact_id: sourceContact.contact_id,
            first_name: sourceContact.first_name || '',
            last_name: sourceContact.last_name || '',
            email: sourceContact.email,
            phone: sourceContact.phone,
            messenger: sourceContact.messenger,
          })

          if (existing) {
            if (data.replace_existing) {
              existing.contact_id = sourceContact.contact_id
              existing.first_name = sourceContact.first_name || ''
              existing.last_name = sourceContact.last_name || ''
              existing.email = sourceContact.email
              existing.phone = sourceContact.phone
              existing.messenger = sourceContact.messenger
              existing.section_id = sourceContact.section_id
              existing.source = `Imported from "${sourceProjectName}"`
              existing.is_duplicate = false
              existing.contacted_by = existing.contacted_by || currentUserName
              await existing.save()

              if (existing.section_id) {
                await existing.load('section')
              }

              results.replaced!.push(existing.serialize())
              continue
            }

            exactConflictWarnings.push({
              warning_type: 'exact_existing_contact',
              contact: sourceContact.serialize(),
              matches: [{
                type: 'exact_contact',
                match_id: existing.id,
                contact: existing.serialize(),
              }],
            })
            continue
          }

          let duplicateInfo = await this.checkForDuplicatesDetailed(projectId, {
            contact_id: sourceContact.contact_id,
            first_name: sourceContact.first_name,
            last_name: sourceContact.last_name,
            email: sourceContact.email,
            phone: sourceContact.phone,
            messenger: sourceContact.messenger,
          })

          const pendingMatches = contactsToImport
            .filter((item) => this.arePotentialDuplicateContacts(
              {
                first_name: sourceContact.first_name,
                last_name: sourceContact.last_name,
                email: sourceContact.email,
              },
              {
                first_name: item.sourceContact.first_name,
                last_name: item.sourceContact.last_name,
                email: item.sourceContact.email,
              }
            ))
            .map((item) => ({
              type: 'pending_import',
              contact: {
                id: item.sourceContact.id,
                first_name: item.sourceContact.first_name || '',
                last_name: item.sourceContact.last_name || '',
                email: item.sourceContact.email || null,
                phone: item.sourceContact.phone || null,
                messenger: item.sourceContact.messenger || null,
                source: 'Pending import',
                status: 'Selected for import',
              },
              match_id: item.sourceContact.id,
              similarity: this.calculateNameSimilarity(
                this.normalizeName(`${sourceContact.first_name} ${sourceContact.last_name}`),
                this.normalizeName(`${item.sourceContact.first_name} ${item.sourceContact.last_name}`)
              ),
            }))

          if (pendingMatches.length > 0) {
            duplicateInfo = {
              isDuplicate: true,
              matches: [...duplicateInfo.matches, ...pendingMatches],
            }
          }

          if (duplicateInfo.matches.some((match) => match.type === 'exact_contact')) {
            const warning = {
              warning_type: 'exact_existing_contact',
              contact: sourceContact.serialize(),
              matches: duplicateInfo.matches,
            }

            exactConflictWarnings.push(warning)
            continue
          }

          if (duplicateInfo.isDuplicate && !data.allow_duplicate_name) {
            const warning = {
              warning_type: 'similar_contact',
              contact: sourceContact.serialize(),
              matches: duplicateInfo.matches,
            }

            duplicateWarnings.push(warning)
            continue
          }

          contactsToImport.push({ sourceContact, duplicateInfo })
        } catch (error) {
          results.errors.push(`Error preparing contact ${sourceContact.id}: ${error.message}`)
        }
      }

      if (exactConflictWarnings.length > 0) {
        return response.status(409).json({
          code: 'EXACT_RECRUITMENT_CONTACT_ALREADY_EXISTS',
          error: 'Some contacts are already in this recruitment list.',
          duplicate_warnings: [...exactConflictWarnings, ...duplicateWarnings],
        })
      }

      if (duplicateWarnings.length > 0) {
        return response.status(409).json({
          code: 'POTENTIAL_DUPLICATE_RECRUITMENT_CONTACT',
          error: 'Some contacts have identical or similar names to contacts already in this recruitment list.',
          duplicate_warnings: duplicateWarnings,
        })
      }

      for (const item of contactsToImport) {
        try {
          const { sourceContact, duplicateInfo } = item

          const newContact = await RecruitmentContact.create({
            project_id: projectId,
            contact_id: sourceContact.contact_id,
            first_name: sourceContact.first_name || '',
            last_name: sourceContact.last_name || '',
            email: sourceContact.email,
            phone: sourceContact.phone,
            messenger: sourceContact.messenger,
            section_id: sourceContact.section_id,
            source: `Imported from "${sourceProjectName}"`,
            status: 'not_yet_contacted',
            contact_method: 'manual',
            is_duplicate: duplicateInfo.isDuplicate,
            contacted_by: currentUserName,
          })

          if (newContact.section_id) {
            await newContact.load('section')
          }

          results.imported.push(newContact.serialize())
        } catch (error) {
          results.errors.push(`Error importing contact ${item.sourceContact.id}: ${this.getImportContactErrorMessage(error)}`)
        }
      }

      return response.json(results)
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  async updateRecruitmentOnParticipantDeletion(participantId: number) {
    try {
      const participant = await Participant.query()
        .where('id', participantId)
        .preload('contact')
        .first()

      if (!participant || !participant.contact) {
        return
      }

      const recruitmentContact = await RecruitmentContact.query()
        .where('project_id', participant.project_id)
        .where('contact_id', participant.contact.id)
        .first()

      if (recruitmentContact) {
        recruitmentContact.status = 'cancelled'
        await recruitmentContact.save()
      }
    } catch (error) {
      console.error('Error updating recruitment status on participant deletion:', error)
    }
  }

  private getRecommenderName(recommendedBy: string | null): string | null {
    if (!recommendedBy) return null

    if (recommendedBy.startsWith('Recommended by ')) {
      return recommendedBy.replace('Recommended by ', '')
    }

    return recommendedBy
  }

  private async checkForDuplicatesDetailed(projectId: number, contactData: any): Promise<{
    isDuplicate: boolean
    matches: any[]
  }> {
    const targetFullName = this.normalizeName(`${contactData.first_name} ${contactData.last_name}`)
    const projectContacts = await RecruitmentContact.query()
      .where('project_id', projectId)
      .select([
        'id',
        'contact_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'messenger',
        'status',
        'source',
      ])

    const matches = []

    for (const match of projectContacts) {
      const candidateFullName = this.normalizeName(`${match.first_name} ${match.last_name}`)
      const similarity = this.calculateNameSimilarity(
        targetFullName,
        candidateFullName
      )

      if (similarity >= 0.82) {
        const hasExactCommunicationMatch = this.hasIdenticalCommunicationDetails(contactData, {
          email: match.email,
          phone: match.phone,
          messenger: match.messenger,
        })

        matches.push({
          type: similarity === 1 && hasExactCommunicationMatch
            ? 'exact_contact'
            : 'similar_name',
          contact: match.serialize(),
          match_id: match.id,
          similarity
        })
      }
    }

    // Remove duplicates using the stored original ID
    const uniqueMatches = matches.filter((match, index, self) => {
      return index === self.findIndex(m => m.match_id === match.match_id)
    })

    return {
      isDuplicate: uniqueMatches.length > 0,
      matches: uniqueMatches
    }
  }

  private async findExactRecruitmentMatch(projectId: number, contactData: {
    contact_id?: number | null
    first_name: string
    last_name: string
    email?: string | null
    phone?: string | null
    messenger?: string | null
  }): Promise<RecruitmentContact | null> {
    const normalizedTargetName = this.normalizeName(
      `${contactData.first_name || ''} ${contactData.last_name || ''}`
    )

    const projectContacts = await RecruitmentContact.query().where('project_id', projectId)

    for (const projectContact of projectContacts) {
      const normalizedCandidateName = this.normalizeName(
        `${projectContact.first_name || ''} ${projectContact.last_name || ''}`
      )

      if (!normalizedTargetName || normalizedCandidateName !== normalizedTargetName) {
        continue
      }

      if (this.hasIdenticalCommunicationDetails(contactData, {
        email: projectContact.email,
        phone: projectContact.phone,
        messenger: projectContact.messenger,
      })) {
        return projectContact
      }
    }

    return null
  }

  private normalizeName(value: string | null | undefined): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s'-]/g, '')
      .replace(/\s+/g, ' ')
  }

  private arePotentialDuplicateContacts(firstContact: any, secondContact: any): boolean {
    if (
      firstContact.email &&
      secondContact.email &&
      firstContact.email.toLowerCase().trim() === secondContact.email.toLowerCase().trim()
    ) {
      return true
    }

    const firstFullName = this.normalizeName(`${firstContact.first_name || ''} ${firstContact.last_name || ''}`)
    const secondFullName = this.normalizeName(`${secondContact.first_name || ''} ${secondContact.last_name || ''}`)

    if (!firstFullName || !secondFullName) {
      return false
    }

    return this.calculateNameSimilarity(firstFullName, secondFullName) >= 0.82
  }

  private calculateNameSimilarity(name1: string, name2: string): number {
    const longer = name1.length > name2.length ? name1 : name2
    const shorter = name1.length > name2.length ? name2 : name1

    if (longer.length === 0) return 1.0

    const editDistance = this.getEditDistance(longer.toLowerCase(), shorter.toLowerCase())
    return (longer.length - editDistance) / longer.length
  }

  private getEditDistance(s1: string, s2: string): number {
    const costs = []
    for (let i = 0; i <= s2.length; i++) {
      let lastValue = i
      for (let j = 0; j <= s1.length; j++) {
        if (i === 0) {
          costs[j] = j
        } else if (j > 0) {
          let newValue = costs[j - 1]
          if (s1.charAt(j - 1) !== s2.charAt(i - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
          }
          costs[j - 1] = lastValue
          lastValue = newValue
        }
      }
      if (i > 0) {
        costs[s1.length] = lastValue
      }
    }
    return costs[s1.length]
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
