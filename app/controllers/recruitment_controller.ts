// app/controllers/recruitment_controller.ts - Version complète corrigée
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
  // Validation des paramètres avec logging détaillé
  private validateProjectId(projectId: string | undefined): number {
    console.log('🔍 Validating project ID:', projectId)

    if (!projectId) {
      console.error('❌ Project ID is undefined')
      throw new Error('Project ID is required')
    }

    if (projectId === 'undefined' || projectId === 'null') {
      console.error('❌ Project ID is string "undefined" or "null"')
      throw new Error('Invalid project ID format')
    }

    const numericId = Number(projectId)
    if (isNaN(numericId) || numericId <= 0) {
      console.error('❌ Project ID is not a valid positive number:', projectId)
      throw new Error('Invalid project ID')
    }

    console.log('✅ Project ID validated:', numericId)
    return numericId
  }

  // Obtenir les paramètres de recrutement d'un projet
  async getSettings({ params, response }: HttpContext) {
    try {
      console.log('📋 Getting recruitment settings for project:', params.id)
      const projectId = this.validateProjectId(params.id)

      // Vérifier que le projet existe
      const project = await Project.find(projectId)
      if (!project) {
        console.error('❌ Project not found:', projectId)
        return response.status(404).json({ error: 'Project not found' })
      }

      let settings = await RecruitmentSettings.query()
        .where('project_id', projectId)
        .first()

      if (!settings) {
        console.log('📝 Creating default settings for project:', projectId)
        settings = await RecruitmentSettings.create({
          project_id: projectId,
          follow_up_days: 7,
          auto_follow_up_enabled: true
        })
      }

      console.log('✅ Settings retrieved successfully:', settings.serialize())
      return response.json(settings.serialize())
    } catch (error) {
      console.error('❌ Error in getSettings:', error.message)
      return response.status(400).json({ error: error.message })
    }
  }

  // Mettre à jour les paramètres
  async updateSettings({ params, request, response }: HttpContext) {
    try {
      console.log('⚙️ Updating recruitment settings for project:', params.id)
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

      console.log('✅ Settings updated successfully')
      return response.json(settings.serialize())
    } catch (error) {
      console.error('❌ Error in updateSettings:', error.message)
      return response.status(400).json({ error: error.message })
    }
  }

  // Obtenir tous les contacts de recrutement
  async getContacts(ctx: HttpContext) {
    try {
      console.log('👥 Getting recruitment contacts for project:', ctx.params.id)
      const projectId = this.validateProjectId(ctx.params.id)

      const baseQuery = RecruitmentContact.query()
        .where('project_id', projectId)
        .preload('contact')
        .preload('section')
        .preload('recommender')
        .orderBy('created_at', 'desc')

      const result = await simpleFilter(
        ctx,
        baseQuery,
        ['first_name', 'last_name', 'email', 'phone', 'messenger', 'status', 'notes'],
        [
          { relationColumns: ['name'], relationName: 'section' },
          { relationColumns: ['first_name', 'last_name'], relationName: 'contact' }
        ]
      )

      // ✅ CORRECTION : S'assurer que tous les contacts ont des noms valides
      if (result.data) {
        result.data = result.data.map(contact => ({
          ...contact,
          first_name: contact.first_name || '',
          last_name: contact.last_name || '',
          display_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
        }))
      }

      console.log('✅ Contacts retrieved successfully, count:', result.data?.length || 0)
      return result
    } catch (error) {
      console.error('❌ Error in getContacts:', error.message)
      return ctx.response.status(400).json({ error: error.message })
    }
  }

  // Statistiques du recrutement avec validation robuste
  async getStats({ params, response }: HttpContext) {
    try {
      console.log('📊 Getting recruitment stats for project:', params.id)
      const projectId = this.validateProjectId(params.id)

      // Requête directe avec agrégation pour les statistiques par statut
      const statsResults = await RecruitmentContact.query()
        .where('project_id', projectId)
        .select('status')
        .count('* as total')
        .groupBy('status')

      console.log('📊 Raw stats from DB:', statsResults)

      // Compter le total directement
      const totalResult = await RecruitmentContact.query()
        .where('project_id', projectId)
        .count('* as total')
        .first()

      const total = Number(totalResult?.$extras.total || 0)

      // Mapper les résultats correctement
      const byStatus = statsResults.map(result => ({
        status: result.status,
        count: Number(result.$extras.total || 0)
      }))

      // Compter les recommandations en attente
      const pendingRecommendationsResult = await RecruitmentRecommendation.query()
        .where('project_id', projectId)
        .where('status', 'pending')
        .count('* as total')
        .first()

      const pendingRecommendations = Number(pendingRecommendationsResult?.$extras.total || 0)

      const stats = {
        total,
        by_status: byStatus,
        pending_recommendations: pendingRecommendations
      }

      console.log('✅ Final stats computed:', stats)
      return response.json(stats)
    } catch (error) {
      console.error('❌ Error in getStats:', error.message)
      return response.status(400).json({
        error: error.message,
        // Retourner des stats par défaut en cas d'erreur
        total: 0,
        by_status: [],
        pending_recommendations: 0
      })
    }
  }

  // ✅ CORRECTION : Créer un contact manuel avec validation renforcée
  async createManualContact({ params, request, response }: HttpContext) {
    try {
      console.log('👤 Creating manual contact for project:', params.id)
      const projectId = this.validateProjectId(params.id)

      const data = await request.validateUsing(vine.compile(
        vine.object({
          first_name: vine.string().trim().minLength(1),
          last_name: vine.string().trim().minLength(1),
          email: vine.string().email().optional(),
          phone: vine.string().optional(),
          messenger: vine.string().optional(),
          section_id: vine.number().optional(),
          notes: vine.string().optional()
        })
      ))

      // ✅ Validation que les noms ne sont pas vides après trim
      if (!data.first_name || !data.last_name) {
        return response.status(400).json({
          error: 'Le prénom et le nom sont requis et ne peuvent pas être vides'
        })
      }

      // Vérifier les doublons
      const isDuplicate = await this.checkForDuplicates(projectId, data)

      const contact = await RecruitmentContact.create({
        project_id: projectId,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        phone: data.phone || null,
        messenger: data.messenger || null,
        section_id: data.section_id || null,
        notes: data.notes || null,
        source: 'manual',
        status: 'not_yet_contacted',
        contact_method: 'manual',
        is_duplicate: isDuplicate
      })

      // Charger les relations
      await contact.load('section')
      await contact.load('contact')

      console.log('✅ Manual contact created successfully:', contact.id)
      return response.json(contact.serialize())
    } catch (error) {
      console.error('❌ Error in createManualContact:', error.message)
      return response.status(400).json({ error: error.message })
    }
  }

  // ✅ CORRECTION : Envoi d'emails avec logging amélioré et vraie simulation
  async sendRecruitmentEmails({ params, request, response }: HttpContext) {
    try {
      console.log('📧 Sending recruitment emails for project:', params.id)
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

      console.log('📬 Processing emails for contacts:', data.contact_ids)

      // Récupérer le projet pour le contexte de l'email
      const project = await Project.find(projectId)
      if (!project) {
        return response.status(404).json({ error: 'Project not found' })
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
          // ✅ SIMULATION D'ENVOI D'EMAIL - Version améliorée
          console.log('📧 SIMULATION - Sending email to:', contact.email)
          console.log('📧 Subject: Invitation à rejoindre le projet', project.name)
          console.log('📧 Recipient:', contact.first_name, contact.last_name)

          // Contenu de l'email simulé avec plus de détails
          const emailContent = `
          Bonjour ${contact.first_name} ${contact.last_name},

          Nous vous invitons à rejoindre notre projet musical "${project.name}".

          Pour plus d'informations et pour vous inscrire, cliquez sur le lien ci-dessous :
          [LIEN D'INSCRIPTION - SIMULATION]

          Vous pouvez également recommander d'autres musiciens en cliquant ici :
          [LIEN DE RECOMMANDATION - SIMULATION]

          Cordialement,
          L'équipe du projet ${project.name}

          ---
          ⚠️ ATTENTION : Ceci est une SIMULATION pour le développement.
          En production, ce message serait envoyé via un vrai service d'email.
          ---
        `

          console.log('📧 Email content preview:', emailContent.substring(0, 200) + '...')

          // ✅ TODO: Remplacer par un vrai service d'email en production
          // Exemples d'intégration possibles :
          // - await Mail.send(...)
          // - await this.mailService.sendRecruitmentEmail(contact, project)
          // - await this.sendEmail(contact.email, subject, content)

          // Simuler un délai d'envoi réaliste
          await new Promise(resolve => setTimeout(resolve, 200))

          // ✅ Simulation d'échec aléatoire pour tester la gestion d'erreurs (5% de chance)
          if (Math.random() < 0.05) {
            throw new Error('Simulation: Service email temporairement indisponible')
          }

          // ✅ Mettre à jour le statut du contact SEULEMENT si l'envoi réussit
          await contact.merge({
            status: 'awaiting_response',
            contact_method: 'email',
            contact_date: DateTime.now()
          }).save()

          results.sent.push({
            contact_id: contact.id,
            email: contact.email,
            name: `${contact.first_name} ${contact.last_name}`,
            sent_at: new Date().toISOString(),
            simulation: true // Indicateur que c'est une simulation
          })

          console.log('✅ Email sent successfully (SIMULATION) to:', contact.email)

        } catch (error) {
          console.error('❌ Failed to send email to contact:', contactId, error.message)
          results.failed.push({
            contact_id: contactId,
            error: error.message,
            email: contact.email
          })
        }
      }

      const summary = {
        sent: results.sent.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
        total: data.contact_ids.length
      }

      console.log('✅ Email sending completed:', summary)

      // ✅ Message d'avertissement pour indiquer la simulation
      const warningMessage = results.sent.length > 0 ?
        `⚠️ SIMULATION : ${results.sent.length} email(s) seraient envoyé(s) en production. Status mis à jour.` :
        `Aucun email envoyé. Vérifiez les adresses email.`

      return response.json({
        success: true,
        summary,
        details: results,
        message: `Emails envoyés: ${results.sent.length}/${data.contact_ids.length}`,
        warning: warningMessage,
        simulation_mode: true
      })
    } catch (error) {
      console.error('❌ Error in sendRecruitmentEmails:', error.message)
      return response.status(400).json({ error: error.message })
    }
  }

  // Importer des contacts depuis la base de données
  async importContacts({ params, request, response }: HttpContext) {
    try {
      console.log('📥 Importing contacts for project:', params.id)
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

      console.log('📋 Processing contact imports:', data.contact_ids)

      for (const contactId of data.contact_ids) {
        try {
          const contact = await Contact.find(contactId)
          if (!contact) {
            results.errors.push(`Contact ${contactId} not found`)
            continue
          }

          console.log('📋 Processing contact:', contact.firstName, contact.lastName)

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

          // ✅ CORRECTION : Vérifier que les champs requis ne sont pas vides
          const firstName = contact.firstName || contact.first_name || ''
          const lastName = contact.lastName || contact.last_name || ''

          if (!firstName.trim() || !lastName.trim()) {
            console.error('❌ Contact has empty name fields:', contact)
            results.errors.push(`Contact ${contactId} has empty name fields`)
            continue
          }

          // Créer l'entrée de recrutement avec validation des champs
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
            is_duplicate: false
          })

          await recruitmentContact.load('contact')
          await recruitmentContact.load('section')

          results.imported.push(recruitmentContact.serialize())
          console.log('✅ Contact imported successfully:', recruitmentContact.id)

        } catch (error) {
          console.error('❌ Error importing contact:', contactId, error.message)
          results.errors.push(`Error importing contact ${contactId}: ${error.message}`)
        }
      }

      console.log('✅ Import completed:', results)
      return response.json(results)
    } catch (error) {
      console.error('❌ Error in importContacts:', error.message)
      return response.status(400).json({ error: error.message })
    }
  }

  // Recherche avancée de contacts
  async searchContacts(ctx: HttpContext) {
    try {
      console.log('🔍 Searching contacts for project:', ctx.params.id)

      const baseQuery = Contact.query()
        .preload('instruments')
        .preload('participants', (query) => {
          query.preload('project').preload('section')
        })

      const result = await advancedFilter(ctx, baseQuery)
      console.log('✅ Contact search completed, results:', result.data?.length || 0)
      return result
    } catch (error) {
      console.error('❌ Error in searchContacts:', error.message)
      return ctx.response.status(400).json({ error: error.message })
    }
  }

  // Mettre à jour le statut d'un contact
  async updateContactStatus({ params, request, response }: HttpContext) {
    try {
      console.log('🔄 Updating contact status for project:', params.id, 'contact:', params.contactId)
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
        .first()

      if (!contact) {
        console.error('❌ Contact not found for status update')
        return response.status(404).json({ error: 'Contact not found' })
      }

      // Si le statut passe à "awaiting_response", enregistrer la date de contact
      const updateData = { ...data }
      if (data.status === 'awaiting_response' && !contact.contact_date) {
        updateData.contact_date = new Date()
      }

      await contact.merge(updateData).save()
      await contact.load('section')
      await contact.load('contact')

      console.log('✅ Contact status updated successfully')
      return response.json(contact.serialize())
    } catch (error) {
      console.error('❌ Error in updateContactStatus:', error.message)
      return response.status(400).json({ error: error.message })
    }
  }

  // Supprimer un contact de recrutement
  async deleteContact({ params, response }: HttpContext) {
    try {
      console.log('🗑️ Deleting contact for project:', params.id, 'contact:', params.contactId)
      const projectId = this.validateProjectId(params.id)
      const contactId = this.validateProjectId(params.contactId)

      const contact = await RecruitmentContact.query()
        .where('id', contactId)
        .where('project_id', projectId)
        .first()

      if (!contact) {
        console.error('❌ Contact not found for deletion')
        return response.status(404).json({ error: 'Contact not found' })
      }

      await contact.delete()
      console.log('✅ Contact deleted successfully')
      return response.json({ message: 'Contact removed from recruitment' })
    } catch (error) {
      console.error('❌ Error in deleteContact:', error.message)
      return response.status(400).json({ error: error.message })
    }
  }

  // Obtenir les recommandations en attente
  async getRecommendations({ params, response }: HttpContext) {
    try {
      console.log('💭 Getting recommendations for project:', params.id)
      const projectId = this.validateProjectId(params.id)

      const recommendations = await RecruitmentRecommendation.query()
        .where('project_id', projectId)
        .orderBy('created_at', 'desc')

      console.log('✅ Recommendations retrieved:', recommendations.length)
      return response.json(recommendations)
    } catch (error) {
      console.error('❌ Error in getRecommendations:', error.message)
      return response.status(400).json({ error: error.message })
    }
  }

  // Traiter une recommandation
  async handleRecommendation({ params, request, response }: HttpContext) {
    try {
      console.log('🤝 Handling recommendation for project:', params.id, 'recommendation:', params.recommendationId)
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
        .first()

      if (!recommendation) {
        console.error('❌ Recommendation not found')
        return response.status(404).json({ error: 'Recommendation not found' })
      }

      if (data.action === 'ignore') {
        await recommendation.merge({ status: 'ignored' }).save()
        console.log('✅ Recommendation ignored')
        return response.json(recommendation)
      }

      // ✅ CORRECTION : Créer un contact de recrutement avec validation
      const recruitmentContact = await RecruitmentContact.create({
        project_id: projectId,
        first_name: recommendation.recommended_first_name || '',
        last_name: recommendation.recommended_last_name || '',
        email: recommendation.recommended_email,
        phone: recommendation.recommended_phone,
        messenger: recommendation.recommended_messenger,
        section_id: data.section_id,
        recommended_by: recommendation.recommender_name,
        source: 'recommendation',
        status: data.action === 'contact_email' ? 'awaiting_response' : 'not_yet_contacted',
        contact_method: data.action === 'contact_email' ? 'email' : 'manual',
        contact_date: data.action === 'contact_email' ? DateTime.now() : null,
        notes: data.notes || null,
        is_duplicate: false
      })

      await recommendation.merge({
        status: data.action,
        recruitment_contact_id: recruitmentContact.id
      }).save()

      if (data.action === 'contact_email') {
        // TODO: Envoyer l'email de recrutement avec mention du recommandeur
        console.log('📧 Would send recommendation email to:', recruitmentContact.email)
      }

      await recruitmentContact.load('section')
      console.log('✅ Recommendation handled successfully')
      return response.json({ recommendation, recruitmentContact: recruitmentContact.serialize() })
    } catch (error) {
      console.error('❌ Error in handleRecommendation:', error.message)
      return response.status(400).json({ error: error.message })
    }
  }

  // Obtenir les projets disponibles pour l'import
  async getAvailableProjects({ params, response }: HttpContext) {
    try {
      console.log('📋 Getting available projects for import, excluding:', params.id)
      const currentProjectId = this.validateProjectId(params.id)

      const projects = await Project.query()
        .where('id', '!=', currentProjectId)
        .select('id', 'name', 'created_at', 'updated_at')
        .orderBy('created_at', 'desc')

      console.log('✅ Available projects retrieved:', projects.length)
      return response.json(projects)
    } catch (error) {
      console.error('❌ Error in getAvailableProjects:', error.message)
      return response.status(400).json({ error: error.message })
    }
  }

  // Import depuis un autre projet
  async importFromProject({ params, request, response }: HttpContext) {
    try {
      console.log('🔄 Importing from project:', params.id)
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

      console.log('📋 Processing project import, source contacts:', sourceContacts.length)

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
              source_contact: sourceContact.serialize(),
              existing_contact: existing.serialize()
            })
            continue
          }

          // ✅ CORRECTION : Créer le nouveau contact avec validation
          const newContact = await RecruitmentContact.create({
            project_id: projectId,
            contact_id: sourceContact.contact_id,
            first_name: sourceContact.first_name || '',
            last_name: sourceContact.last_name || '',
            email: sourceContact.email,
            phone: sourceContact.phone,
            messenger: sourceContact.messenger,
            section_id: sourceContact.section_id,
            source: `imported_from_project_${data.source_project_id}`,
            status: 'not_yet_contacted',
            contact_method: 'manual',
            is_duplicate: false
          })

          await newContact.load('section')
          results.imported.push(newContact.serialize())

        } catch (error) {
          console.error('❌ Error importing contact:', sourceContact.id, error.message)
          results.errors.push(`Error importing contact ${sourceContact.id}: ${error.message}`)
        }
      }

      console.log('✅ Project import completed:', results)
      return response.json(results)
    } catch (error) {
      console.error('❌ Error in importFromProject:', error.message)
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
    console.log('🔄 Updating follow-up statuses for project:', projectId, 'with', followUpDays, 'days')

    const contactsToUpdate = await RecruitmentContact.query()
      .where('project_id', projectId)
      .where('status', 'awaiting_response')
      .whereNotNull('contact_date')

    let updatedCount = 0
    for (const contact of contactsToUpdate) {
      if (contact.shouldFollowUp(followUpDays)) {
        await contact.merge({ status: 'to_follow_up' }).save()
        updatedCount++
      }
    }

    console.log('✅ Updated', updatedCount, 'contacts to follow-up status')
  }
}
