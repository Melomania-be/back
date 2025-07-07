// app/controllers/auditions_controller.ts - Version complète avec pièces jointes PDF et corrections DateTime

import { HttpContext } from '@adonisjs/core/http'
import Audition from '#models/audition'
import Participant from '#models/participant'
import Project from '#models/project'
import File from '#models/file'
import AuditionFile from '#models/audition_file'
import AuditionPdfFile from '#models/audition_pdf_file'
import SectionPdf from '#models/section_pdf'
import Section from '#models/section'
import { cuid } from '@adonisjs/core/helpers'
import { DateTime } from 'luxon'
import AuditionRequest from '#mails/audition_request'
import mail from '@adonisjs/mail/services/main'
import app from '@adonisjs/core/services/app'
import vine from '@vinejs/vine'
import {
  createAuditionValidator,
  submitAuditionValidator,
  uploadAuditionFileValidator,
} from '#validators/audition'
import { uploadAuditionPdfValidator } from '#validators/audition_pdf'

//  FONCTION UTILITAIRE POUR FORMATAGE SÉCURISÉ DES DATES
function formatDateSafely(dateValue: any): string | null {
  if (!dateValue) return null

  try {
    // Si c'est déjà un DateTime de Luxon
    if (dateValue && typeof dateValue.toISO === 'function') {
      return dateValue.toISO()
    }

    // Si c'est une Date JavaScript
    if (dateValue instanceof Date) {
      return dateValue.toISOString()
    }

    // Si c'est une string, essayer de la convertir
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    }

    console.warn('Date value could not be formatted:', dateValue)
    return null
  } catch (error) {
    console.error('Error formatting date:', error, 'for value:', dateValue)
    return null
  }
}

export default class AuditionsController {
  // ================================================================================
  // MÉTHODES POUR LA CRÉATION ET GESTION DES AUDITIONS
  // ================================================================================

  // ✅ MÉTHODE MISE À JOUR : Créer une nouvelle audition pour un participant avec PDFs en pièces jointes
  async requestAudition({ request, response, params }: HttpContext) {
    const data = await request.validateUsing(createAuditionValidator)

    try {
      console.log(`🎭 Starting audition request for participant ${params.participantId} in project ${params.id}`)

      // Vérifier que le participant existe et n'est pas encore validé
      const participant = await Participant.query()
        .where('id', params.participantId)
        .where('project_id', params.id)
        .where('accepted', false)
        .preload('contact')
        .preload('section')
        .firstOrFail()

      console.log(`✅ Participant found: ${participant.contact.first_name} ${participant.contact.last_name} (${participant.section.name})`)

      // Charger le projet avec ses répétitions pour définir la deadline par défaut
      const project = await Project.query()
        .where('id', params.id)
        .preload('responsibles')
        .preload('rehearsals')
        .firstOrFail()

      // Créer un token sécurisé unique
      const secureToken = cuid()

      // Gérer la deadline avec première répétition par défaut
      let deadline = null

      if (data.deadline) {
        // Si une deadline est fournie explicitement, l'utiliser
        try {
          deadline = DateTime.fromISO(data.deadline)
        } catch (error) {
          deadline = DateTime.fromFormat(data.deadline, "yyyy-MM-dd'T'HH:mm")
        }
      } else {
        // Si pas de deadline fournie, utiliser la première répétition
        if (project.rehearsals && project.rehearsals.length > 0) {
          // Trouver la première répétition future (après maintenant)
          const now = DateTime.now()
          const futureRehearsals = project.rehearsals
            .filter(rehearsal => DateTime.fromJSDate(rehearsal.start_date) > now)
            .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

          if (futureRehearsals.length > 0) {
            // Définir la deadline à 24h avant la première répétition
            const firstRehearsal = DateTime.fromJSDate(futureRehearsals[0].start_date)
            deadline = firstRehearsal.minus({ days: 1 })
            console.log(`⏰ Auto-set audition deadline to ${deadline.toISO()} (1 day before first rehearsal)`)
          } else {
            // Si pas de répétitions futures, définir à 7 jours par défaut
            deadline = DateTime.now().plus({ days: 7 })
            console.log(`⏰ No future rehearsals, setting default 7-day deadline: ${deadline.toISO()}`)
          }
        } else {
          // Si pas de répétitions du tout, définir à 7 jours par défaut
          deadline = DateTime.now().plus({ days: 7 })
          console.log(`⏰ No rehearsals found, setting default 7-day deadline: ${deadline.toISO()}`)
        }
      }

      // ✅ CORRECTION : Créer l'audition avec DateTime (pas de conversion)
      const audition = await Audition.create({
        participant_id: participant.id,
        project_id: params.id,
        secure_token: secureToken,
        instructions: data.instructions || '',
        required_files: data.required_files || [],
        deadline: deadline, // ✅ Garder l'objet DateTime
        is_submitted: false,
        candidate_notes: '',
      })

      console.log(`✅ Audition created with ID: ${audition.id}`)

      // ✅ ASSOCIER AUTOMATIQUEMENT LES PDFs DE LA SECTION
      const associatedPdfsCount = await this.associateSectionPdfsToAudition(audition.id, participant.section_id, params.id)
      console.log(`📎 Associated ${associatedPdfsCount} PDFs to the audition`)

      // ✅ CORRECTION : Mettre à jour le statut du participant avec DateTime (pas de conversion en Date)
      participant.audition_status = 'pending' as 'pending' // ✅ Cast explicite pour éviter l'erreur de type
      participant.audition_requested_at = DateTime.now() // ✅ Garder DateTime
      participant.audition_deadline = deadline // ✅ Garder l'objet DateTime (peut être null)
      await participant.save()

      console.log(`✅ Participant status updated to 'pending'`)

      // Préparer des informations sur le responsable pour l'email
      let responsibleContact = null
      if (project.responsibles && project.responsibles.length > 0) {
        responsibleContact = {
          first_name: project.responsibles[0].first_name,
          last_name: project.responsibles[0].last_name,
          email: project.responsibles[0].email,
          phone: project.responsibles[0].phone,
          messenger: project.responsibles[0].messenger,
        }
      }

      // ✅ ENVOYER L'EMAIL D'AUDITION AVEC LES PDFs EN PIÈCES JOINTES
      let emailSent = false
      let emailError = null

      try {
        console.log(`📧 Sending audition email to ${participant.contact.email} with ${associatedPdfsCount} PDF attachments...`)

        const auditionRequestMail = new AuditionRequest(
          participant.contact,
          project,
          participant.section,
          audition,
          responsibleContact
        )

        await mail.send(auditionRequestMail)
        emailSent = true
        console.log(`✅ Audition email sent successfully with PDF attachments`)
      } catch (error) {
        emailError = error.message
        console.error(`❌ Error sending audition email:`, error)
        // Ne pas faire échouer la création d'audition si l'email échoue
      }

      // Retourner des informations complètes sur la deadline et les PDFs
      const deadlineInfo = data.deadline
        ? 'Custom deadline provided'
        : deadline
          ? `Auto-set to 1 day before first rehearsal`
          : 'Default 7 days deadline'

      return response.ok({
        message: 'Audition request sent successfully',
        audition: {
          id: audition.id,
          secure_token: audition.secure_token,
          deadline: deadline?.toISO(),
          instructions: audition.instructions,
          required_files: audition.required_files
        },
        deadline_info: deadlineInfo,
        email_status: {
          sent: emailSent,
          error: emailError,
          attachments_count: associatedPdfsCount
        },
        pdf_attachments: {
          count: associatedPdfsCount,
          message: associatedPdfsCount > 0
            ? `${associatedPdfsCount} PDF(s) automatically attached to email`
            : 'No PDFs configured for this section - candidate will upload free-form recordings'
        },
        debug_info: {
          rehearsals_count: project.rehearsals?.length || 0,
          first_rehearsal_date: project.rehearsals?.[0]?.start_date || null,
          deadline_calculation: deadlineInfo,
          participant_section: participant.section.name,
          pdfs_associated: associatedPdfsCount,
          email_sent: emailSent
        }
      })
    } catch (error) {
      console.error('❌ Error creating audition:', error)
      return response.status(500).json({
        error: 'Error creating audition request',
        details: error.message || 'Unknown error',
      })
    }
  }

  // Supprimer une audition
  async deleteAudition({ params, response }: HttpContext) {
    try {
      const audition = await Audition.query()
        .where('id', params.auditionId)
        .where('project_id', params.id)
        .preload('participant')
        .firstOrFail()

      // Supprimer les fichiers d'audition associés
      const auditionFiles = await AuditionFile.query()
        .where('audition_id', audition.id)
        .preload('file')

      for (const auditionFile of auditionFiles) {
        // Supprimer le fichier physique
        if (auditionFile.file.path) {
          try {
            const fs = await import('node:fs/promises')
            await fs.unlink(auditionFile.file.path)
          } catch (fileError) {
            console.warn(`Could not delete file: ${auditionFile.file.path}`, fileError)
          }
        }
        // Supprimer l'entrée du fichier
        await auditionFile.file.delete()
        await auditionFile.delete()
      }

      // Supprimer les associations PDF
      await AuditionPdfFile.query()
        .where('audition_id', audition.id)
        .delete()

      // ✅ CORRECTION : Réinitialiser le statut du participant avec gestion de null
      const participant = audition.participant
      participant.audition_status = 'none' as 'none' // ✅ Utiliser 'none' au lieu de null
      participant.audition_requested_at = null
      participant.audition_deadline = null
      await participant.save()

      // Supprimer l'audition
      await audition.delete()

      return response.ok({
        message: 'Audition deleted successfully',
        deleted_files_count: auditionFiles.length
      })
    } catch (error) {
      console.error('Error deleting audition:', error)
      return response.status(500).json({
        error: 'Error deleting audition',
        details: error.message || 'Unknown error'
      })
    }
  }

  // ✅ MÉTHODE MISE À JOUR : Récupérer toutes les auditions d'un projet avec statistiques enrichies
  async getProjectAuditions({ params }: HttpContext) {
    try {
      console.log('📊 Getting auditions for project:', params.id)

      const auditions = await Audition.query()
        .where('auditions.project_id', params.id)
        .preload('participant', (query) => {
          query.preload('contact').preload('section')
        })
        .orderBy('auditions.created_at', 'desc')

      console.log(`📋 Found ${auditions.length} auditions for project ${params.id}`)

      const processedAuditions = await Promise.all(
        auditions.map(async (audition) => {
          const auditionFiles = await AuditionFile.query()
            .where('audition_id', audition.id)
            .preload('file')
            .orderBy('uploaded_at', 'desc')

          const auditionPdfFiles = await AuditionPdfFile.query()
            .where('audition_id', audition.id)
            .preload('file')
            .preload('section')
            .orderBy('order', 'asc')

          return {
            ...audition.toJSON(),
            submitted_at: formatDateSafely(audition.submitted_at),
            deadline: formatDateSafely(audition.deadline),
            createdAt: formatDateSafely(audition.createdAt),
            updatedAt: formatDateSafely(audition.updatedAt),
            is_submitted: Boolean(audition.is_submitted),

            files: auditionFiles.map((af) => ({
              id: af.id,
              audition_id: af.audition_id,
              file_id: af.file_id,
              file_type: af.file_type,
              description: af.description || 'Description non disponible',
              uploaded_at: formatDateSafely(af.uploaded_at),
              file: {
                id: af.file.id,
                name: af.file.name || 'Nom de fichier non disponible',
                type: af.file.type || 'Type inconnu',
                path: af.file.path || '',
                size: af.file.size ?? 0, // ✅ Correction size
              },
            })),

            pdfs: auditionPdfFiles.map((apf) => ({
              id: apf.id,
              audition_id: apf.audition_id,
              file_id: apf.file_id,
              section_id: apf.section_id,
              title: apf.title,
              description: apf.description || '',
              order: apf.order,
              section: apf.section.name,
              file: {
                id: apf.file.id,
                name: apf.file.name || 'Nom de fichier non disponible',
                type: apf.file.type || 'application/pdf',
                path: apf.file.path || '',
                size: apf.file.size ?? 0, // ✅ Correction size
              },
            })),
          }
        })
      )

      // ✅ Statistiques enrichies avec informations sur les PDFs
      const now = DateTime.now()
      const stats = {
        total: processedAuditions.length,
        submitted: processedAuditions.filter((a) => a.is_submitted === true).length,
        pending: processedAuditions.filter(
          (a) => !a.is_submitted && (!a.deadline || new Date(a.deadline) >= now.toJSDate())
        ).length,
        expired: processedAuditions.filter(
          (a) => !a.is_submitted && a.deadline && new Date(a.deadline) < now.toJSDate()
        ).length,
        totalFiles: processedAuditions.reduce((sum, a) => sum + (a.files?.length || 0), 0),
        totalPdfs: processedAuditions.reduce((sum, a) => sum + (a.pdfs?.length || 0), 0),
        auditionsWithPdfs: processedAuditions.filter(a => a.pdfs && a.pdfs.length > 0).length,
        auditionsWithFiles: processedAuditions.filter(a => a.files && a.files.length > 0).length,
        averagePdfsPerAudition: processedAuditions.length > 0
          ? Math.round((processedAuditions.reduce((sum, a) => sum + (a.pdfs?.length || 0), 0) / processedAuditions.length) * 100) / 100
          : 0,
        averageFilesPerAudition: processedAuditions.length > 0
          ? Math.round((processedAuditions.reduce((sum, a) => sum + (a.files?.length || 0), 0) / processedAuditions.length) * 100) / 100
          : 0
      }

      console.log('📊 Enhanced auditions stats:', stats)

      return {
        auditions: processedAuditions,
        stats,
        lastUpdate: DateTime.now().toISO(),
      }
    } catch (error) {
      console.error('❌ Error in getProjectAuditions:', error)
      throw error
    }
  }

  // ================================================================================
  // MÉTHODES POUR LA GESTION DES PDFs PAR SECTION
  // ================================================================================

  // ✅ MÉTHODE CORRIGÉE : Upload de PDF pour une section avec persistance dans section_pdfs
  async uploadPdfForSection({ request, response, params }: HttpContext) {
    try {
      console.log('📄 PDF upload request for project:', params.id)

      const data = await request.validateUsing(
        vine.compile(
          vine.object({
            file: vine.file({
              size: '25mb',
              extnames: ['pdf']
            }),
            title: vine.string().trim().minLength(1).maxLength(255),
            description: vine.string().optional(),
            section_id: vine.number(),
            order: vine.number().optional()
          })
        )
      )
      const { file, title, description, section_id, order } = data

      console.log('📄 PDF upload details:', {
        title,
        section_id,
        filename: file.clientName,
        size: file.size
      })

      // ✅ CORRECTION : Supprimer la variable project non utilisée
      await Project.findOrFail(params.id) // Vérifier que le projet existe
      const section = await Section.findOrFail(section_id)

      // Générer un nom unique pour le fichier PDF
      const uniqueFileName = `project_${params.id}_section_${section_id}_${cuid()}.pdf`

      // Créer le dossier uploads/audition_pdfs s'il n'existe pas
      const uploadsPath = app.makePath('uploads', 'audition_pdfs')

      // Sauvegarder le fichier PDF
      await file.move(uploadsPath, {
        name: uniqueFileName,
        overwrite: true
      })

      if (!file.isValid) {
        console.log('❌ PDF file move failed:', file.errors)
        return response.status(400).json({
          error: 'PDF upload failed',
          details: file.errors
        })
      }

      console.log('✅ PDF moved to:', file.filePath)

      // Créer l'entrée dans la table files
      const savedFile = await File.create({
        name: file.clientName,
        type: file.type || 'application/pdf',
        content: '',
        path: file.filePath,
        size: file.size || 0, // ✅ Ajouter la taille
      })

      console.log('✅ PDF file saved in database:', savedFile.id)

      // ✅ Créer l'entrée dans section_pdfs pour persistance
      const sectionPdf = await SectionPdf.create({
        project_id: params.id,
        section_id: section_id,
        file_id: savedFile.id,
        title: title,
        description: description || '',
        order: order || 0
      })

      console.log('✅ Section PDF created:', sectionPdf.id)

      // ✅ Associer automatiquement aux auditions actives existantes
      const auditions = await Audition.query()
        .where('auditions.project_id', params.id)
        .where('auditions.is_submitted', false)
        .join('participants', 'auditions.participant_id', 'participants.id')
        .where('participants.section_id', section_id)
        .select('auditions.*')

      console.log(`📎 Found ${auditions.length} active auditions for section ${section.name}`)

      let associationCount = 0
      const errors: string[] = []

      // Créer les associations pour chaque audition existante
      for (const audition of auditions) {
        try {
          // Vérifier qu'il n'y a pas déjà une association
          const existingAssociation = await AuditionPdfFile.query()
            .where('audition_id', audition.id)
            .where('file_id', savedFile.id)
            .where('title', title)
            .first()

          if (!existingAssociation) {
            await AuditionPdfFile.create({
              audition_id: audition.id,
              file_id: savedFile.id,
              section_id: section_id,
              title: title,
              description: description || '',
              order: order || 0
            })
            associationCount++
          }
        } catch (associationError) {
          errors.push(`Audition ${audition.id}: ${associationError.message}`)
          console.error(`❌ Error associating PDF to audition ${audition.id}:`, associationError)
        }
      }

      console.log(`✅ Created ${associationCount} associations for the new PDF`)

      return response.ok({
        message: 'PDF uploaded and stored successfully',
        file: {
          id: savedFile.id,
          name: savedFile.name,
          type: savedFile.type,
          title: title,
          description: description || '',
          section_id: section_id,
          section_name: section.name,
          order: order || 0,
          project_id: params.id,
          size: savedFile.size ?? 0 // ✅ Correction size
        },
        section_pdf: {
          id: sectionPdf.id,
          stored_in_section: true
        },
        stats: {
          auditions_associated: associationCount,
          total_auditions_found: auditions.length,
          errors: errors.length > 0 ? errors : null
        }
      })

    } catch (error) {
      console.error('❌ Error uploading PDF for section:', error)
      return response.status(500).json({
        error: 'Error uploading PDF',
        details: error.message || 'Unknown error'
      })
    }
  }

  // ✅ MÉTHODE CORRIGÉE : Récupérer tous les PDFs par section (utilise section_pdfs)
  async getProjectPdfs({ params, response }: HttpContext) {
    try {
      console.log('📄 Getting project PDFs for project:', params.id)

      // Vérifier que le projet existe
      const project = await Project.query()
        .where('id', params.id)
        .preload('sectionGroup', (query) => {
          query.preload('sections')
        })
        .firstOrFail()

      console.log('✅ Project found:', project.name)

      // ✅ Récupérer tous les PDFs depuis la table section_pdfs
      const sectionPdfs = await SectionPdf.query()
        .where('project_id', params.id)
        .preload('file')
        .preload('section')
        .orderBy('section_id')
        .orderBy('order')
        .orderBy('title')

      console.log('📄 Found section PDFs:', sectionPdfs.length)

      // ✅ CORRECTION : Grouper par section avec typage correct
      const pdfsBySection: Record<number, {
        section_id: number
        section_name: string
        pdfs: any[]
        auditions_count: number
      }> = {}

      // Initialiser avec toutes les sections du projet
      if (project.sectionGroup && project.sectionGroup.sections) {
        for (const section of project.sectionGroup.sections) {
          pdfsBySection[section.id] = {
            section_id: section.id,
            section_name: section.name,
            pdfs: [],
            auditions_count: 0
          }
        }
      }

      // Compter les auditions par section
      const auditionsPerSection = await Audition.query()
        .where('auditions.project_id', params.id)
        .where('auditions.is_submitted', false)
        .join('participants', 'auditions.participant_id', 'participants.id')
        .groupBy('participants.section_id')
        .select('participants.section_id')
        .count('* as total')

      console.log('📊 Auditions per section:', auditionsPerSection)

      // ✅ CORRECTION : Ajouter le compte d'auditions avec typage correct
      for (const sectionCount of auditionsPerSection) {
        const sectionId = Number(sectionCount.$extras.section_id)
        if (pdfsBySection[sectionId]) {
          pdfsBySection[sectionId].auditions_count = parseInt(String(sectionCount.$extras.total))
        }
      }

      // ✅ Ajouter les PDFs depuis section_pdfs
      for (const sectionPdf of sectionPdfs) {
        const sectionId = sectionPdf.section_id

        if (!pdfsBySection[sectionId]) {
          // Si la section n'existe pas dans le sectionGroup, la créer
          pdfsBySection[sectionId] = {
            section_id: sectionId,
            section_name: sectionPdf.section.name,
            pdfs: [],
            auditions_count: 0
          }
        }

        // Compter combien d'auditions utilisent ce PDF
        const usageCount = await AuditionPdfFile.query()
          .whereHas('audition', (query) => {
            query.where('project_id', params.id)
          })
          .where('file_id', sectionPdf.file_id)
          .where('title', sectionPdf.title)
          .count('* as total')

        pdfsBySection[sectionId].pdfs.push({
          id: sectionPdf.id,
          file_id: sectionPdf.file_id,
          title: sectionPdf.title,
          description: sectionPdf.description,
          order: sectionPdf.order,
          file: {
            id: sectionPdf.file.id,
            name: sectionPdf.file.name,
            type: sectionPdf.file.type,
            path: sectionPdf.file.path,
            size: sectionPdf.file.size ?? 0 // ✅ Correction size
          },
          usage_count: parseInt(String(usageCount[0].$extras.total || '0'))
        })
      }

      // Convertir en array et trier
      const sectionsArray = Object.values(pdfsBySection).sort((a, b) =>
        a.section_name.localeCompare(b.section_name)
      )

      console.log('📊 Final sections array:', sectionsArray.length, 'sections')

      return response.ok({
        project_id: params.id,
        project_name: project.name,
        sections: sectionsArray,
        total_sections: sectionsArray.length,
        total_unique_pdfs: sectionPdfs.length
      })

    } catch (error) {
      console.error('❌ Error getting project PDFs:', error)
      return response.status(500).json({
        error: 'Error retrieving project PDFs',
        details: error.message || 'Unknown error'
      })
    }
  }

  // ✅ MÉTHODE CORRIGÉE : Envoyer des PDFs en masse depuis section_pdfs
  async bulkSendPdfsToSection({ request, response, params }: HttpContext) {
    try {
      const data = await request.validateUsing(
        vine.compile(
          vine.object({
            section_id: vine.number(),
            pdf_files: vine.array(
              vine.object({
                file_id: vine.number(),
                title: vine.string().trim().minLength(1),
                description: vine.string().optional(),
                order: vine.number().optional()
              })
            ).minLength(1)
          })
        )
      )

      const { section_id, pdf_files } = data

      console.log(`📤 Bulk sending ${pdf_files.length} PDFs to section ${section_id} in project ${params.id}`)

      // Vérifier que le projet et la section existent
      await Project.findOrFail(params.id)
      const section = await Section.findOrFail(section_id)

      // Récupérer toutes les auditions actives pour cette section
      const auditions = await Audition.query()
        .where('auditions.project_id', params.id)
        .where('auditions.is_submitted', false)
        .join('participants', 'auditions.participant_id', 'participants.id')
        .where('participants.section_id', section_id)
        .select('auditions.*')
        .preload('participant', (query) => {
          query.preload('contact')
        })

      console.log(`📋 Found ${auditions.length} active auditions for section ${section.name}`)

      let successCount = 0
      let errorCount = 0
      let associationCount = 0
      const errors: string[] = []

      // Pour chaque audition, associer tous les PDFs sélectionnés
      for (const audition of auditions) {
        try {
          for (const pdfData of pdf_files) {
            // Vérifier que le fichier existe
            await File.findOrFail(pdfData.file_id)

            // Créer l'association (éviter les doublons)
            const existingAssociation = await AuditionPdfFile.query()
              .where('audition_id', audition.id)
              .where('file_id', pdfData.file_id)
              .where('title', pdfData.title)
              .first()

            if (!existingAssociation) {
              await AuditionPdfFile.create({
                audition_id: audition.id,
                file_id: pdfData.file_id,
                section_id: section_id,
                title: pdfData.title,
                description: pdfData.description || '',
                order: pdfData.order || 0
              })
              associationCount++
            } else {
              console.log(`⚠️ PDF ${pdfData.file_id} already associated with audition ${audition.id}`)
            }
          }
          successCount++
        } catch (associationError) {
          errorCount++
          errors.push(`Audition ${audition.id}: ${associationError.message}`)
          console.error(`❌ Error associating PDFs to audition ${audition.id}:`, associationError)
        }
      }

      return response.ok({
        message: `PDFs sent to section ${section.name}`,
        stats: {
          section_name: section.name,
          auditions_found: auditions.length,
          successful_auditions: successCount,
          failed_auditions: errorCount,
          pdf_files_count: pdf_files.length,
          total_associations_created: associationCount
        },
        errors: errors.length > 0 ? errors : null
      })

    } catch (error) {
      console.error('❌ Error in bulk PDF sending:', error)
      return response.status(500).json({
        error: 'Error sending PDFs to section',
        details: error.message || 'Unknown error'
      })
    }
  }

  // ✅ MÉTHODE CORRIGÉE : Supprimer un PDF de section_pdfs
  async removePdfFromSection({ params, response }: HttpContext) {
    try {
      const { pdfFileId } = params

      // Supprimer depuis section_pdfs
      const sectionPdf = await SectionPdf.query()
        .where('project_id', params.id)
        .where('file_id', pdfFileId)
        .preload('file')
        .first()

      if (!sectionPdf) {
        return response.status(404).json({
          error: 'PDF not found in this project'
        })
      }

      // Supprimer toutes les associations aux auditions
      const associations = await AuditionPdfFile.query()
        .whereHas('audition', (query) => {
          query.where('project_id', params.id)
        })
        .where('file_id', pdfFileId)

      let deletedAssociations = 0
      for (const association of associations) {
        await association.delete()
        deletedAssociations++
      }

      // Supprimer de section_pdfs
      await sectionPdf.delete()

      // Supprimer le fichier physique et l'entrée
      const file = sectionPdf.file
      if (file && file.path) {
        try {
          const fs = await import('node:fs/promises')
          await fs.unlink(file.path)
          await file.delete()
          console.log(`🗑️ Physical PDF file deleted: ${file.path}`)
        } catch (fileError) {
          console.warn(`⚠️ Could not delete physical PDF file: ${file.path}`, fileError)
        }
      }

      return response.ok({
        message: 'PDF removed from section and all auditions',
        stats: {
          section_pdf_deleted: true,
          associations_deleted: deletedAssociations,
          file_deleted: true
        }
      })

    } catch (error) {
      console.error('❌ Error removing PDF from section:', error)
      return response.status(500).json({
        error: 'Error removing PDF',
        details: error.message || 'Unknown error'
      })
    }
  }

  // ✅ MÉTHODE MISE À JOUR : Associer automatiquement les PDFs de section à une nouvelle audition
  async associateSectionPdfsToAudition(auditionId: number, sectionId: number, projectId: number): Promise<number> {
    try {
      console.log(`📎 Auto-associating PDFs for audition ${auditionId}, section ${sectionId}, project ${projectId}`)

      // ✅ Récupérer tous les PDFs de la section depuis section_pdfs
      const sectionPdfs = await SectionPdf.query()
        .where('project_id', projectId)
        .where('section_id', sectionId)
        .preload('file')
        .orderBy('order', 'asc')

      console.log(`📄 Found ${sectionPdfs.length} PDFs for section ${sectionId} in project ${projectId}`)

      let associatedCount = 0

      // Associer chaque PDF de la section à la nouvelle audition
      for (const sectionPdf of sectionPdfs) {
        try {
          // Vérifier que cette association n'existe pas déjà
          const existingAssociation = await AuditionPdfFile.query()
            .where('audition_id', auditionId)
            .where('file_id', sectionPdf.file_id)
            .where('title', sectionPdf.title)
            .first()

          if (!existingAssociation) {
            await AuditionPdfFile.create({
              audition_id: auditionId,
              file_id: sectionPdf.file_id,
              section_id: sectionId,
              title: sectionPdf.title,
              description: sectionPdf.description || '',
              order: sectionPdf.order || 0
            })
            associatedCount++
            console.log(`✅ Associated PDF "${sectionPdf.title}" to audition ${auditionId}`)
          } else {
            console.log(`⚠️ PDF "${sectionPdf.title}" already associated with audition ${auditionId}`)
          }
        } catch (associationError) {
          console.error(`❌ Error associating PDF ${sectionPdf.id} to audition ${auditionId}:`, associationError)
        }
      }

      console.log(`✅ Auto-associated ${associatedCount} PDFs to new audition ${auditionId}`)
      return associatedCount

    } catch (error) {
      console.error('❌ Error auto-associating section PDFs:', error)
      return 0
    }
  }

  // ✅ MÉTHODE DE DEBUG : Voir tous les fichiers uploadés
  async debugFiles({ params, response }: HttpContext) {
    try {
      console.log('🔍 DEBUG: Listing all files for project', params.id)

      // Tous les fichiers PDF dans le système
      const allPdfFiles = await File.query()
        .where('type', 'like', '%pdf%')
        .orderBy('created_at', 'desc')

      console.log('📄 Total PDF files in system:', allPdfFiles.length)

      // Tous les PDFs dans section_pdfs pour ce projet
      const sectionPdfs = await SectionPdf.query()
        .where('project_id', params.id)
        .preload('file')
        .preload('section')

      console.log('📊 Total section PDFs for project:', sectionPdfs.length)

      // Toutes les associations audition-PDF pour ce projet
      const allAssociations = await AuditionPdfFile.query()
        .whereHas('audition', (query) => {
          query.where('project_id', params.id)
        })
        .preload('file')
        .preload('audition', (query) => {
          query.preload('participant', (pQuery) => {
            pQuery.preload('section').preload('contact')
          })
        })

      console.log('🔗 Total associations for project:', allAssociations.length)

      // Toutes les auditions du projet
      const allAuditions = await Audition.query()
        .where('project_id', params.id)
        .preload('participant', (query) => {
          query.preload('section').preload('contact')
        })

      console.log('🎭 Total auditions for project:', allAuditions.length)

      return response.ok({
        debug_info: {
          project_id: params.id,
          total_pdf_files: allPdfFiles.length,
          section_pdfs: sectionPdfs.length,
          total_associations: allAssociations.length,
          total_auditions: allAuditions.length
        },
        pdf_files: allPdfFiles.map(file => ({
          id: file.id,
          name: file.name,
          type: file.type,
          path: file.path,
          size: file.size ?? 0, // ✅ Correction size
          created_at: file.createdAt
        })),
        section_pdfs: sectionPdfs.map(sp => ({
          id: sp.id,
          project_id: sp.project_id,
          section_id: sp.section_id,
          file_id: sp.file_id,
          title: sp.title,
          description: sp.description,
          order: sp.order,
          section_name: sp.section.name,
          file_name: sp.file.name
        })),
        associations: allAssociations.map(assoc => ({
          id: assoc.id,
          audition_id: assoc.audition_id,
          file_id: assoc.file_id,
          section_id: assoc.section_id,
          title: assoc.title,
          description: assoc.description,
          order: assoc.order,
          file_name: assoc.file.name,
          participant_name: `${assoc.audition.participant.contact.first_name} ${assoc.audition.participant.contact.last_name}`,
          section_name: assoc.audition.participant.section?.name || 'No section'
        })),
        auditions: allAuditions.map(aud => ({
          id: aud.id,
          participant_id: aud.participant_id,
          is_submitted: aud.is_submitted,
          participant_name: `${aud.participant.contact.first_name} ${aud.participant.contact.last_name}`,
          section_name: aud.participant.section?.name || 'No section',
          section_id: aud.participant.section?.id || null
        }))
      })

    } catch (error) {
      console.error('❌ Error in debug files:', error)
      return response.status(500).json({
        error: 'Debug error',
        details: error.message
      })
    }
  }

  // ================================================================================
  // MÉTHODES POUR LES AUDITIONS (CÔTÉ CANDIDAT)
  // ================================================================================

  // ✅ MÉTHODE MISE À JOUR : Page d'audition sécurisée pour les candidats
  async getAuditionPage({ params, response }: HttpContext) {
    try {
      const { token } = params

      console.log(`📄 Loading audition page for token: ${token}`)

      // Trouver l'audition par token
      const audition = await Audition.query()
        .where('secure_token', token)
        .preload('participant', (query) => {
          query.preload('contact').preload('section')
        })
        .preload('project')
        .firstOrFail()

      console.log(`✅ Audition found: ID ${audition.id} for ${audition.participant.contact.first_name} ${audition.participant.contact.last_name}`)

      // Vérifier que l'audition n'est pas expirée
      const now = DateTime.now()
      if (audition.deadline && audition.deadline < now) {
        console.log(`⏰ Audition expired: deadline was ${audition.deadline}`)
        return response.status(410).json({
          error: 'Audition deadline has passed',
          deadline: audition.deadline
        })
      }

      // Récupérer les fichiers déjà uploadés
      const auditionFiles = await AuditionFile.query()
        .where('audition_id', audition.id)
        .preload('file')
        .orderBy('uploaded_at', 'desc')

      // ✅ CORRECTION : Récupérer les PDFs avec la section préchargée
      const auditionPdfs = await AuditionPdfFile.query()
        .where('audition_id', audition.id)
        .preload('file')
        .preload('section')
        .orderBy('order', 'asc')

      console.log(`📎 Audition has ${auditionFiles.length} uploaded files and ${auditionPdfs.length} PDF documents`)

      return response.ok({
        id: audition.id,
        instructions: audition.instructions,
        required_files: audition.required_files,
        deadline: formatDateSafely(audition.deadline),
        is_submitted: audition.is_submitted,
        submitted_at: formatDateSafely(audition.submitted_at),
        candidate_notes: audition.candidate_notes,
        participant: {
          contact: {
            firstName: audition.participant.contact.first_name,
            lastName: audition.participant.contact.last_name,
            email: audition.participant.contact.email
          },
          section: {
            id: audition.participant.section?.id,
            name: audition.participant.section?.name || 'Non définie'
          }
        },
        project: {
          id: audition.project.id,
          name: audition.project.name
        },
        files: auditionFiles.map(af => ({
          id: af.id,
          file_id: af.file_id,
          file_type: af.file_type,
          description: af.description,
          uploaded_at: formatDateSafely(af.uploaded_at),
          createdAt: formatDateSafely(af.createdAt),
          file: {
            id: af.file.id,
            name: af.file.name,
            type: af.file.type,
            size: af.file.size ?? 0 // ✅ Correction size
          }
        })),
        // ✅ CORRECTION : Utiliser apf.section.name au lieu de audition.participant.section.name
        pdfs: auditionPdfs.map(apf => ({
          id: apf.id,
          title: apf.title,
          description: apf.description,
          order: apf.order,
          section: apf.section?.name || 'Section inconnue',
          file: {
            id: apf.file.id,
            name: apf.file.name,
            type: apf.file.type,
            size: apf.file.size ?? 0 // ✅ Correction size
          }
        }))
      })

    } catch (error) {
      console.error('❌ Error getting audition page:', error)
      return response.status(500).json({
        error: 'Error retrieving audition',
        details: error.message || 'Unknown error'
      })
    }
  }

  // Upload de fichier d'audition par les candidats
  async uploadAuditionFile({ request, response, params }: HttpContext) {
    try {
      const { token } = params

      // Trouver l'audition par token
      const audition = await Audition.query()
        .where('secure_token', token)
        .firstOrFail()

      // Vérifier que l'audition n'est pas déjà soumise
      if (audition.is_submitted) {
        return response.status(403).json({
          error: 'Audition already submitted'
        })
      }

      // Vérifier que la deadline n'est pas dépassée
      const now = DateTime.now()
      if (audition.deadline && audition.deadline < now) {
        return response.status(403).json({
          error: 'Audition deadline has passed'
        })
      }

      const data = await request.validateUsing(uploadAuditionFileValidator)
      const { file, fileType, description } = data

      // Générer un nom unique pour le fichier
      const uniqueFileName = `audition_${audition.id}_${cuid()}.${file.extname}`
      const uploadsPath = app.makePath('uploads', 'auditions')

      // Sauvegarder le fichier
      await file.move(uploadsPath, {
        name: uniqueFileName,
        overwrite: true
      })

      if (!file.isValid) {
        return response.status(400).json({
          error: 'File upload failed',
          details: file.errors
        })
      }

      // Créer l'entrée dans la table files
      const savedFile = await File.create({
        name: file.clientName,
        type: file.type || 'application/octet-stream',
        content: '',
        path: file.filePath,
        size: file.size || 0, // ✅ Ajouter la taille
      })

      // Créer l'association audition-fichier
      const auditionFile = await AuditionFile.create({
        audition_id: audition.id,
        file_id: savedFile.id,
        file_type: fileType,
        description: description || '',
        uploaded_at: DateTime.now()
      })

      return response.ok({
        message: 'File uploaded successfully',
        file: {
          id: auditionFile.id,
          file_id: savedFile.id,
          file_type: fileType,
          description: description,
          uploaded_at: formatDateSafely(auditionFile.uploaded_at),
          file: {
            id: savedFile.id,
            name: savedFile.name,
            type: savedFile.type,
            size: savedFile.size ?? 0 // ✅ Correction size
          }
        }
      })

    } catch (error) {
      console.error('Error uploading audition file:', error)
      return response.status(500).json({
        error: 'Error uploading file',
        details: error.message || 'Unknown error'
      })
    }
  }

  // Supprimer un fichier d'audition
  async deleteAuditionFile({ params, response }: HttpContext) {
    try {
      const { token, fileId } = params

      // Trouver l'audition par token
      const audition = await Audition.query()
        .where('secure_token', token)
        .firstOrFail()

      // Vérifier que l'audition n'est pas déjà soumise
      if (audition.is_submitted) {
        return response.status(403).json({
          error: 'Cannot delete files from submitted audition'
        })
      }

      // Trouver le fichier d'audition
      const auditionFile = await AuditionFile.query()
        .where('id', fileId)
        .where('audition_id', audition.id)
        .preload('file')
        .firstOrFail()

      // Supprimer le fichier physique
      if (auditionFile.file.path) {
        try {
          const fs = await import('node:fs/promises')
          await fs.unlink(auditionFile.file.path)
        } catch (fileError) {
          console.warn(`Could not delete file: ${auditionFile.file.path}`, fileError)
        }
      }

      // Supprimer l'entrée du fichier
      await auditionFile.file.delete()
      await auditionFile.delete()

      return response.ok({
        message: 'File deleted successfully'
      })

    } catch (error) {
      console.error('Error deleting audition file:', error)
      return response.status(500).json({
        error: 'Error deleting file',
        details: error.message || 'Unknown error'
      })
    }
  }

  // Sauvegarder les notes temporaires
  async saveTemporaryNotes({ request, response, params }: HttpContext) {
    try {
      const { token } = params
      const { notes } = await request.validateUsing(
        vine.compile(
          vine.object({
            notes: vine.string().maxLength(2000)
          })
        )
      )

      // Trouver l'audition par token
      const audition = await Audition.query()
        .where('secure_token', token)
        .firstOrFail()

      // Vérifier que l'audition n'est pas déjà soumise
      if (audition.is_submitted) {
        return response.status(403).json({
          error: 'Cannot modify submitted audition'
        })
      }

      // Sauvegarder les notes
      audition.candidate_notes = notes
      await audition.save()

      return response.ok({
        message: 'Notes saved successfully'
      })

    } catch (error) {
      console.error('Error saving notes:', error)
      return response.status(500).json({
        error: 'Error saving notes',
        details: error.message || 'Unknown error'
      })
    }
  }

  // Soumettre l'audition complète
  async submitAudition({ request, response, params }: HttpContext) {
    try {
      const { token } = params
      const data = await request.validateUsing(submitAuditionValidator)

      // Trouver l'audition par token
      const audition = await Audition.query()
        .where('secure_token', token)
        .preload('participant')
        .firstOrFail()

      // Vérifier que l'audition n'est pas déjà soumise
      if (audition.is_submitted) {
        return response.status(409).json({
          error: 'Audition already submitted'
        })
      }

      // ✅ CORRECTION DATETIME : Vérifier que la deadline n'est pas dépassée
      const now = DateTime.now()
      if (audition.deadline && audition.deadline < now) {
        return response.status(403).json({
          error: 'Audition deadline has passed'
        })
      }

      // Marquer l'audition comme soumise
      audition.is_submitted = true
      audition.submitted_at = DateTime.now()
      audition.candidate_notes = data.notes || audition.candidate_notes
      await audition.save()

      // Mettre à jour le statut du participant
      const participant = audition.participant
      participant.audition_status = 'completed' as 'completed' // ✅ Cast explicite
      await participant.save()

      return response.ok({
        message: 'Audition submitted successfully',
        submitted_at: formatDateSafely(audition.submitted_at)
      })

    } catch (error) {
      console.error('Error submitting audition:', error)
      return response.status(500).json({
        error: 'Error submitting audition',
        details: error.message || 'Unknown error'
      })
    }
  }

  // ================================================================================
  // MÉTHODES POUR LES PDFs D'AUDITION
  // ================================================================================

  // Récupérer les PDFs d'audition (côté participant)
  async getAuditionPdfs({ params, response }: HttpContext) {
    try {
      const { token } = params

      // Trouver l'audition par token
      const audition = await Audition.query()
        .where('secure_token', token)
        .firstOrFail()

      // ✅ CORRECTION : Récupérer les PDFs avec la section préchargée
      const auditionPdfs = await AuditionPdfFile.query()
        .where('audition_id', audition.id)
        .preload('file')
        .preload('section')
        .orderBy('order', 'asc')

      return response.ok(
        auditionPdfs.map(apf => ({
          id: apf.id,
          title: apf.title,
          description: apf.description,
          order: apf.order,
          section: apf.section?.name || 'Section inconnue',
          file: {
            id: apf.file.id,
            name: apf.file.name,
            type: apf.file.type,
            size: apf.file.size ?? 0 // ✅ Correction size
          }
        }))
      )

    } catch (error) {
      console.error('Error getting audition PDFs:', error)
      return response.status(500).json({
        error: 'Error retrieving PDFs',
        details: error.message || 'Unknown error'
      })
    }
  }

  // Télécharger un PDF d'audition (côté participant)
  async downloadAuditionPdf({ params, response }: HttpContext) {
    try {
      const { token, pdfFileId } = params

      console.log('📥 Download PDF request:', { token, pdfFileId })

      // Trouver l'audition par token
      const audition = await Audition.query()
        .where('secure_token', token)
        .firstOrFail()

      console.log('✅ Audition found:', audition.id)

      // Trouver le PDF associé à cette audition
      const auditionPdf = await AuditionPdfFile.query()
        .where('audition_id', audition.id)
        .where('file_id', pdfFileId)
        .preload('file')
        .firstOrFail()

      console.log('✅ PDF found:', auditionPdf.file.name, 'at path:', auditionPdf.file.path)

      const file = auditionPdf.file

      if (!file.path) {
        console.error('❌ File path is empty for file:', file.id)
        return response.status(404).json({
          error: 'File path not found'
        })
      }

      // ✅ CORRECTION : Vérifier que le fichier existe physiquement
      const fs = await import('node:fs/promises')

      try {
        await fs.access(file.path)
        console.log('✅ File exists on disk:', file.path)
      } catch (accessError) {
        console.error('❌ File does not exist on disk:', file.path, accessError)
        return response.status(404).json({
          error: 'Physical file not found',
          path: file.path
        })
      }

      // ✅ CORRECTION : Headers appropriés pour le téléchargement PDF
      const fileName = file.name || `document_${pdfFileId}.pdf`

      response.header('Content-Type', 'application/pdf')
      response.header('Content-Disposition', `attachment; filename="${fileName}"`)
      response.header('Cache-Control', 'no-cache')

      // Retourner le fichier pour téléchargement
      return response.download(file.path, fileName)

    } catch (error) {
      console.error('❌ Error downloading audition PDF:', error)
      return response.status(500).json({
        error: 'Error downloading PDF',
        details: error.message || 'Unknown error'
      })
    }
  }

  // ================================================================================
  // MÉTHODES POUR LES PDFs D'AUDITION (CÔTÉ ADMINISTRATEUR)
  // ================================================================================

  // Upload de PDF pour audition (côté administrateur)
  async uploadPdfForAudition({ request, response, params }: HttpContext) {
    try {
      const data = await request.validateUsing(uploadAuditionPdfValidator)
      const { file, title, description, section_id, order } = data

      // Vérifier que le projet et la section existent
      await Project.findOrFail(params.id)
      const section = await Section.findOrFail(section_id)

      // Générer un nom unique pour le fichier PDF
      const uniqueFileName = `audition_pdf_${params.id}_${cuid()}.${file.extname}`
      const uploadsPath = app.makePath('uploads', 'audition_pdfs')

      // Sauvegarder le fichier PDF
      await file.move(uploadsPath, {
        name: uniqueFileName,
        overwrite: true
      })

      if (!file.isValid) {
        return response.status(400).json({
          error: 'PDF upload failed',
          details: file.errors
        })
      }

      // Créer l'entrée dans la table files
      const savedFile = await File.create({
        name: file.clientName,
        type: file.type || 'application/pdf',
        content: '',
        path: file.filePath,
        size: file.size || 0 // ✅ Ajouter la taille
      })

      // Créer l'association dans section_pdfs
      const sectionPdf = await SectionPdf.create({
        project_id: params.id,
        section_id: section_id,
        file_id: savedFile.id,
        title: title,
        description: description || '',
        order: order || 0
      })

      return response.ok({
        message: 'PDF uploaded successfully',
        pdf: {
          id: sectionPdf.id,
          title: title,
          description: description,
          order: order,
          file: {
            id: savedFile.id,
            name: savedFile.name,
            type: savedFile.type,
            size: savedFile.size ?? 0 // ✅ Correction size
          }
        }
      })

    } catch (error) {
      console.error('Error uploading PDF for audition:', error)
      return response.status(500).json({
        error: 'Error uploading PDF',
        details: error.message || 'Unknown error'
      })
    }
  }

  // Supprimer un PDF d'audition (côté administrateur)
  async deleteAuditionPdf({ params, response }: HttpContext) {
    try {
      const { pdfFileId } = params

      // Trouver l'association PDF
      const auditionPdf = await AuditionPdfFile.query()
        .where('file_id', pdfFileId)
        .whereHas('audition', (query) => {
          query.where('project_id', params.id)
        })
        .preload('file')
        .firstOrFail()

      const file = auditionPdf.file

      // Supprimer le fichier physique
      if (file.path) {
        try {
          const fs = await import('node:fs/promises')
          await fs.unlink(file.path)
        } catch (fileError) {
          console.warn(`Could not delete PDF file: ${file.path}`, fileError)
        }
      }

      // Supprimer l'entrée du fichier et l'association
      await file.delete()
      await auditionPdf.delete()

      return response.ok({
        message: 'PDF deleted successfully'
      })

    } catch (error) {
      console.error('Error deleting audition PDF:', error)
      return response.status(500).json({
        error: 'Error deleting PDF',
        details: error.message || 'Unknown error'
      })
    }
  }
}
