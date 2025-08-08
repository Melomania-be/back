// app/controllers/recruitment_controller.ts - Version corrigée
import { HttpContext } from '@adonisjs/core/http'
import RecruitmentContact from '#models/recruitment_contact'
import RecruitmentSettings from '#models/recruitment_settings'
import RecruitmentRecommendation from '#models/recruitment_recommendation'
import Contact from '#models/contact'
import Project from '#models/project'
import { DateTime } from 'luxon'
import { simpleFilter, advancedFilter } from 'adonisjs-filters'
import vine from '@vinejs/vine'

export default class RecruitmentController {
  // Validation des paramètres
  private validateProjectId(projectId: string | undefined): number {
    if (!projectId || projectId === 'undefined' || isNaN(Number(projectId))) {
      throw new Error('Invalid project ID')
    }
    return Number(projectId)
  }

  // Obtenir les paramètres de recrutement d'un projet
  async getSettings({ params, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)

      // Vérifier que le projet existe
      const project = await Project.find(projectId)
      if (!project) {
        return response.status(404).json({ error: 'Project not found' })
      }

      const settings = await RecruitmentSettings.query()
        .where('project_id', projectId)
        .first()

      if (!settings) {
        // Créer des paramètres par défaut
        return await RecruitmentSettings.create({
          project_id: projectId,
          follow_up_days: 7,
          auto_follow_up_enabled: true
        })
      }

      return settings
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  // Mettre à jour les paramètres
  async updateSettings({ params, request, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)

      const data = await request.validateUsing(vine.compile(
        vine.object({
          follow_up_days: vine.number().min(1).max(30),
          auto_follow_up_enabled: vine.boolean()
        })
      ))

      let settings = await RecruitmentSettings.query()
        .where('project_id', projectId)
        .first()

      if (!settings) {
        settings = await RecruitmentSettings.create({
          project_id: projectId,
          ...data
        })
      } else {
        await settings.merge(data).save()
      }

      // Recalculer les statuts si les jours ont changé
      if (data.auto_follow_up_enabled) {
        await this.updateFollowUpStatuses(projectId, data.follow_up_days)
      }

      return settings
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  // Obtenir tous les contacts de recrutement
  async getContacts(ctx: HttpContext) {
    try {
      const projectId = this.validateProjectId(ctx.params.id)

      const baseQuery = RecruitmentContact.query()
        .where('project_id', projectId)
        .preload('contact')
        .preload('section')
        .preload('recommender')
        .orderBy('created_at', 'desc')

      return await simpleFilter(
        ctx,
        baseQuery,
        ['first_name', 'last_name', 'email', 'phone', 'messenger', 'status', 'notes'],
        [
          { relationColumns: ['name'], relationName: 'section' },
          { relationColumns: ['first_name', 'last_name'], relationName: 'contact' }
        ]
      )
    } catch (error) {
      return ctx.response.status(400).json({ error: error.message })
    }
  }

  // Créer un contact manuel
  async createManualContact({ params, request, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)

      const data = await request.validateUsing(vine.compile(
        vine.object({
          first_name: vine.string().trim(),
          last_name: vine.string().trim(),
          email: vine.string().email().optional(),
          phone: vine.string().optional(),
          messenger: vine.string().optional(),
          section_id: vine.number().optional(),
          notes: vine.string().optional()
        })
      ))

      // Vérifier les doublons
      const isDuplicate = await this.checkForDuplicates(projectId, data)

      const contact = await RecruitmentContact.create({
        project_id: projectId,
        ...data,
        source: 'manual',
        status: 'not_yet_contacted',
        is_duplicate: isDuplicate
      })

      await contact.load('section')
      return contact
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  // Importer des contacts depuis la base de données
  async importContacts({ params, request, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)

      const data = await request.validateUsing(vine.compile(
        vine.object({
          contact_ids: vine.array(vine.number()),
          from_project_id: vine.number().optional()
        })
      ))

      const results = {
        imported: [],
        conflicts: [],
        errors: []
      }

      for (const contactId of data.contact_ids) {
        try {
          const contact = await Contact.find(contactId)
          if (!contact) {
            results.errors.push(`Contact ${contactId} not found`)
            continue
          }

          // Vérifier si déjà dans le recrutement
          const existing = await RecruitmentContact.query()
            .where('project_id', projectId)
            .where('contact_id', contactId)
            .first()

          if (existing) {
            results.conflicts.push({
              contact,
              existing_status: existing.status,
              recruitment_id: existing.id
            })
            continue
          }

          // Créer l'entrée de recrutement
          const recruitmentContact = await RecruitmentContact.create({
            project_id: projectId,
            contact_id: contactId,
            first_name: contact.first_name,
            last_name: contact.last_name,
            email: contact.email,
            phone: contact.phone,
            messenger: contact.messenger,
            source: 'database',
            status: 'not_yet_contacted'
          })

          await recruitmentContact.load('contact')
          results.imported.push(recruitmentContact)

        } catch (error) {
          results.errors.push(`Error importing contact ${contactId}: ${error.message}`)
        }
      }

      return results
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  // Recherche avancée de contacts
  async searchContacts(ctx: HttpContext) {
    try {
      const baseQuery = Contact.query()
        .preload('instruments')
        .preload('participants', (query) => {
          query.preload('project').preload('section')
        })

      return await advancedFilter(ctx, baseQuery)
    } catch (error) {
      return ctx.response.status(400).json({ error: error.message })
    }
  }

  // Mettre à jour le statut d'un contact
  async updateContactStatus({ params, request, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      const contactId = this.validateProjectId(params.contactId)

      const data = await request.validateUsing(vine.compile(
        vine.object({
          status: vine.enum(['not_yet_contacted', 'awaiting_response', 'to_follow_up', 'not_available', 'pending_validation', 'cancelled', 'recruited']),
          contact_method: vine.enum(['manual', 'email', 'messenger', 'phone']).optional(),
          notes: vine.string().optional(),
          contact_date: vine.date({ formats: ['iso'] }).optional()
        })
      ))

      const contact = await RecruitmentContact.query()
        .where('id', contactId)
        .where('project_id', projectId)
        .firstOrFail()

      // Si le statut passe à "awaiting_response", enregistrer la date de contact
      if (data.status === 'awaiting_response' && !contact.contact_date) {
        data.contact_date = new Date()
      }

      await contact.merge(data).save()
      await contact.load('section')
      await contact.load('contact')

      return contact
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  // Supprimer un contact de recrutement
  async deleteContact({ params, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      const contactId = this.validateProjectId(params.contactId)

      const contact = await RecruitmentContact.query()
        .where('id', contactId)
        .where('project_id', projectId)
        .firstOrFail()

      await contact.delete()
      return { message: 'Contact removed from recruitment' }
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  // Envoyer des mails de recrutement
  async sendRecruitmentEmails({ params, request, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)

      const data = await request.validateUsing(vine.compile(
        vine.object({
          contact_ids: vine.array(vine.number()),
          template_id: vine.number().optional(),
          custom_subject: vine.string().optional(),
          custom_content: vine.string().optional()
        })
      ))

      const results = {
        sent: [],
        failed: [],
        skipped: []
      }

      for (const contactId of data.contact_ids) {
        const contact = await RecruitmentContact.query()
          .where('id', contactId)
          .where('project_id', projectId)
          .firstOrFail()

        if (!contact.email) {
          results.skipped.push({ contact_id: contactId, reason: 'No email address' })
          continue
        }

        try {
          // Logique d'envoi d'email (à implémenter avec votre système de mail)
          // await this.sendRecruitmentEmail(contact, data)

          // Mettre à jour le statut
          await contact.merge({
            status: 'awaiting_response',
            contact_method: 'email',
            contact_date: DateTime.now()
          }).save()

          results.sent.push(contact)
        } catch (error) {
          results.failed.push({ contact_id: contactId, error: error.message })
        }
      }

      return results
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  // Obtenir les recommandations en attente
  async getRecommendations({ params, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)

      return await RecruitmentRecommendation.query()
        .where('project_id', projectId)
        .orderBy('created_at', 'desc')
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  // Traiter une recommandation
  async handleRecommendation({ params, request, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      const recommendationId = this.validateProjectId(params.recommendationId)

      const data = await request.validateUsing(vine.compile(
        vine.object({
          action: vine.enum(['ignore', 'contact_email', 'contact_manual']),
          section_id: vine.number().optional(),
          notes: vine.string().optional()
        })
      ))

      const recommendation = await RecruitmentRecommendation.query()
        .where('id', recommendationId)
        .where('project_id', projectId)
        .firstOrFail()

      if (data.action === 'ignore') {
        await recommendation.merge({ status: 'ignored' }).save()
        return recommendation
      }

      // Créer un contact de recrutement
      const recruitmentContact = await RecruitmentContact.create({
        project_id: projectId,
        first_name: recommendation.recommended_first_name,
        last_name: recommendation.recommended_last_name,
        email: recommendation.recommended_email,
        phone: recommendation.recommended_phone,
        messenger: recommendation.recommended_messenger,
        section_id: data.section_id,
        recommended_by: recommendation.recommender_name,
        source: 'recommendation',
        status: data.action === 'contact_email' ? 'awaiting_response' : 'not_yet_contacted',
        contact_method: data.action === 'contact_email' ? 'email' : 'manual',
        contact_date: data.action === 'contact_email' ? DateTime.now() : null,
        notes: data.notes
      })

      await recommendation.merge({
        status: data.action,
        recruitment_contact_id: recruitmentContact.id
      }).save()

      if (data.action === 'contact_email') {
        // Envoyer l'email de recrutement avec mention du recommandeur
        // await this.sendRecommendationEmail(recruitmentContact, recommendation)
      }

      await recruitmentContact.load('section')
      return { recommendation, recruitmentContact }
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  // Import depuis un autre projet
  async importFromProject({ params, request, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)

      const data = await request.validateUsing(vine.compile(
        vine.object({
          source_project_id: vine.number(),
          include_statuses: vine.array(vine.string()).optional()
        })
      ))

      const sourceContacts = await RecruitmentContact.query()
        .where('project_id', data.source_project_id)
        .if(data.include_statuses, (query) => {
          query.whereIn('status', data.include_statuses!)
        })

      const results = {
        imported: [],
        conflicts: [],
        errors: []
      }

      for (const sourceContact of sourceContacts) {
        try {
          // Vérifier les conflits
          const existing = await RecruitmentContact.query()
            .where('project_id', projectId)
            .where((query) => {
              if (sourceContact.contact_id) {
                query.where('contact_id', sourceContact.contact_id)
              } else {
                query
                  .where('first_name', sourceContact.first_name)
                  .where('last_name', sourceContact.last_name)
                  .where('email', sourceContact.email)
              }
            })
            .first()

          if (existing) {
            results.conflicts.push({
              source_contact: sourceContact,
              existing_contact: existing
            })
            continue
          }

          // Créer le nouveau contact
          const newContact = await RecruitmentContact.create({
            project_id: projectId,
            contact_id: sourceContact.contact_id,
            first_name: sourceContact.first_name,
            last_name: sourceContact.last_name,
            email: sourceContact.email,
            phone: sourceContact.phone,
            messenger: sourceContact.messenger,
            section_id: sourceContact.section_id,
            source: `imported_from_project_${data.source_project_id}`,
            status: 'not_yet_contacted'
          })

          results.imported.push(newContact)

        } catch (error) {
          results.errors.push(`Error importing contact ${sourceContact.id}: ${error.message}`)
        }
      }

      return results
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  // Statistiques du recrutement
  async getStats({ params, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)

      const total = await RecruitmentContact.query()
        .where('project_id', projectId)
        .count('*')

      const byStatus = await RecruitmentContact.query()
        .where('project_id', projectId)
        .groupBy('status')
        .count('*')
        .select('status')

      const pendingRecommendations = await RecruitmentRecommendation.query()
        .where('project_id', projectId)
        .where('status', 'pending')
        .count('*')

      return {
        total: total[0].count,
        by_status: byStatus,
        pending_recommendations: pendingRecommendations[0].count
      }
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  // Méthodes utilitaires privées
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
    const contactsToUpdate = await RecruitmentContact.query()
      .where('project_id', projectId)
      .where('status', 'awaiting_response')
      .whereNotNull('contact_date')

    for (const contact of contactsToUpdate) {
      if (contact.shouldFollowUp(followUpDays)) {
        await contact.merge({ status: 'to_follow_up' }).save()
      }
    }
  }
}
