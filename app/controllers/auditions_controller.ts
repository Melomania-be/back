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

function formatDateSafely(dateValue: any): string | null {
  if (!dateValue) return null

  try {
    if (dateValue && typeof dateValue.toISO === 'function') {
      return dateValue.toISO()
    }

    if (dateValue instanceof Date) {
      return dateValue.toISOString()
    }

    if (typeof dateValue === 'string') {
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    }

    return null
  } catch (error) {
    return null
  }
}

export default class AuditionsController {
  async requestAudition({ request, response, params }: HttpContext) {
    const data = await request.validateUsing(createAuditionValidator)

    try {
      const participant = await Participant.query()
        .where('id', params.participantId)
        .where('project_id', params.id)
        .where('accepted', false)
        .preload('contact')
        .preload('section')
        .firstOrFail()

      const project = await Project.query()
        .where('id', params.id)
        .preload('responsibles')
        .preload('rehearsals')
        .firstOrFail()

      const secureToken = cuid()

      let deadline = null

      if (data.deadline) {
        try {
          deadline = DateTime.fromISO(data.deadline)
        } catch (error) {
          deadline = DateTime.fromFormat(data.deadline, "yyyy-MM-dd'T'HH:mm")
        }
      } else {
        if (project.rehearsals && project.rehearsals.length > 0) {
          const now = DateTime.now()

          const futureRehearsals = project.rehearsals
            .filter((rehearsal) => {
              if (
                rehearsal.start_date &&
                typeof (rehearsal.start_date as any).toJSDate === 'function'
              ) {
                return (rehearsal.start_date as any) > now
              }
              return DateTime.fromJSDate(rehearsal.start_date as unknown as Date) > now
            })
            .sort((a, b) => {
              const dateA =
                a.start_date && typeof (a.start_date as any).toJSDate === 'function'
                  ? (a.start_date as any).toJSDate()
                  : (a.start_date as unknown as Date)
              const dateB =
                b.start_date && typeof (b.start_date as any).toJSDate === 'function'
                  ? (b.start_date as any).toJSDate()
                  : (b.start_date as unknown as Date)
              return dateA.getTime() - dateB.getTime()
            })

          if (futureRehearsals.length > 0) {
            const firstRehearsalStartDate = futureRehearsals[0].start_date
            let firstRehearsal: DateTime

            if (
              firstRehearsalStartDate &&
              typeof (firstRehearsalStartDate as any).toJSDate === 'function'
            ) {
              firstRehearsal = firstRehearsalStartDate as any
            } else {
              firstRehearsal = DateTime.fromJSDate(firstRehearsalStartDate as unknown as Date)
            }

            deadline = firstRehearsal.minus({ days: 1 })
          } else {
            deadline = DateTime.now().plus({ days: 7 })
          }
        } else {
          deadline = DateTime.now().plus({ days: 7 })
        }
      }

      const audition = await Audition.create({
        participant_id: participant.id,
        project_id: params.id,
        secure_token: secureToken,
        instructions: data.instructions || '',
        required_files: data.required_files || [],
        deadline: deadline,
        is_submitted: false,
        candidate_notes: '',
      })

      const associatedPdfsCount = await this.associateSectionPdfsToAudition(
        audition.id,
        participant.section_id,
        params.id
      )

      participant.audition_status = 'pending' as 'pending'
      participant.audition_requested_at = DateTime.now()
      participant.audition_deadline = deadline
      await participant.save()

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

      let emailSent = false
      let emailError = null

      try {
        const auditionRequestMail = new AuditionRequest(
          participant.contact,
          project,
          participant.section,
          audition,
          responsibleContact
        )

        await mail.send(auditionRequestMail)
        emailSent = true
      } catch (error) {
        emailError = error.message
      }

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
          required_files: audition.required_files,
        },
        deadline_info: deadlineInfo,
        email_status: {
          sent: emailSent,
          error: emailError,
          attachments_count: associatedPdfsCount,
        },
        pdf_attachments: {
          count: associatedPdfsCount,
          message:
            associatedPdfsCount > 0
              ? `${associatedPdfsCount} PDF(s) automatically attached to email`
              : 'No PDFs configured for this section - candidate will upload free-form recordings',
        },
        debug_info: {
          rehearsals_count: project.rehearsals?.length || 0,
          first_rehearsal_date: project.rehearsals?.[0]?.start_date || null,
          deadline_calculation: deadlineInfo,
          participant_section: participant.section.name,
          pdfs_associated: associatedPdfsCount,
          email_sent: emailSent,
        },
      })
    } catch (error) {
      return response.status(500).json({
        error: 'Error creating audition request',
        details: error.message || 'Unknown error',
      })
    }
  }

  async deleteAudition({ params, response }: HttpContext) {
    try {
      const audition = await Audition.query()
        .where('id', params.auditionId)
        .where('project_id', params.id)
        .preload('participant')
        .firstOrFail()

      const auditionFiles = await AuditionFile.query()
        .where('audition_id', audition.id)
        .preload('file')

      for (const auditionFile of auditionFiles) {
        if (auditionFile.file.path) {
          try {
            const fs = await import('node:fs/promises')
            await fs.unlink(auditionFile.file.path)
          } catch (fileError) {
            // Continue without blocking
          }
        }
        await auditionFile.file.delete()
        await auditionFile.delete()
      }

      await AuditionPdfFile.query().where('audition_id', audition.id).delete()

      const participant = audition.participant
      participant.audition_status = 'none' as 'none'
      participant.audition_requested_at = null
      participant.audition_deadline = null
      await participant.save()

      await audition.delete()

      return response.ok({
        message: 'Audition deleted successfully',
        deleted_files_count: auditionFiles.length,
      })
    } catch (error) {
      return response.status(500).json({
        error: 'Error deleting audition',
        details: error.message || 'Unknown error',
      })
    }
  }

  async getProjectAuditions({ params }: HttpContext) {
    try {
      const auditions = await Audition.query()
        .where('auditions.project_id', params.id)
        .preload('participant', (query) => {
          query.preload('contact').preload('section')
        })
        .preload('project')
        .orderBy('auditions.created_at', 'desc')

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
            id: audition.id,
            participant_id: audition.participant_id,
            project_id: audition.project_id,
            secure_token: audition.secure_token,
            instructions: audition.instructions,
            required_files: audition.required_files,
            deadline: formatDateSafely(audition.deadline),
            is_submitted: Boolean(audition.is_submitted),
            submitted_at: formatDateSafely(audition.submitted_at),
            candidate_notes: audition.candidate_notes,
            createdAt: formatDateSafely(audition.createdAt),
            updatedAt: formatDateSafely(audition.updatedAt),

            participant: {
              id: audition.participant.id,
              contact: {
                firstName: audition.participant.contact.first_name,
                lastName: audition.participant.contact.last_name,
                email: audition.participant.contact.email,
              },
              section: {
                id: audition.participant.section?.id,
                name: audition.participant.section?.name || 'Non définie',
              },
            },

            project: {
              id: audition.project?.id,
              name: audition.project?.name,
            },

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
                size: af.file.size ?? 0,
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
                size: apf.file.size ?? 0,
              },
            })),
          }
        })
      )

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
        auditionsWithPdfs: processedAuditions.filter((a) => a.pdfs && a.pdfs.length > 0).length,
        auditionsWithFiles: processedAuditions.filter((a) => a.files && a.files.length > 0).length,
        averagePdfsPerAudition:
          processedAuditions.length > 0
            ? Math.round(
                (processedAuditions.reduce((sum, a) => sum + (a.pdfs?.length || 0), 0) /
                  processedAuditions.length) *
                  100
              ) / 100
            : 0,
        averageFilesPerAudition:
          processedAuditions.length > 0
            ? Math.round(
                (processedAuditions.reduce((sum, a) => sum + (a.files?.length || 0), 0) /
                  processedAuditions.length) *
                  100
              ) / 100
            : 0,
      }

      return {
        auditions: processedAuditions,
        stats,
        lastUpdate: DateTime.now().toISO(),
      }
    } catch (error) {
      throw error
    }
  }

  async uploadPdfForSection({ request, response, params }: HttpContext) {
    try {
      const data = await request.validateUsing(
        vine.compile(
          vine.object({
            file: vine.file({
              size: '25mb',
              extnames: ['pdf'],
            }),
            title: vine.string().trim().minLength(1).maxLength(255),
            description: vine.string().optional(),
            section_id: vine.number(),
            order: vine.number().optional(),
          })
        )
      )
      const { file, title, description, section_id, order } = data

      await Project.findOrFail(params.id)
      const section = await Section.findOrFail(section_id)

      const uniqueFileName = `project_${params.id}_section_${section_id}_${cuid()}.pdf`

      const uploadsPath = app.makePath('uploads', 'audition_pdfs')

      await file.move(uploadsPath, {
        name: uniqueFileName,
        overwrite: true,
      })

      if (!file.isValid) {
        return response.status(400).json({
          error: 'PDF upload failed',
          details: file.errors,
        })
      }

      const savedFile = await File.create({
        name: file.clientName,
        type: file.type || 'application/pdf',
        content: '',
        path: file.filePath,
        size: file.size || 0,
      })

      const sectionPdf = await SectionPdf.create({
        project_id: params.id,
        section_id: section_id,
        file_id: savedFile.id,
        title: title,
        description: description || '',
        order: order || 0,
      })

      const auditions = await Audition.query()
        .where('auditions.project_id', params.id)
        .where('auditions.is_submitted', false)
        .join('participants', 'auditions.participant_id', 'participants.id')
        .where('participants.section_id', section_id)
        .select('auditions.*')

      let associationCount = 0
      const errors: string[] = []

      for (const audition of auditions) {
        try {
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
              order: order || 0,
            })
            associationCount++
          }
        } catch (associationError) {
          errors.push(`Audition ${audition.id}: ${associationError.message}`)
        }
      }

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
          size: savedFile.size ?? 0,
        },
        section_pdf: {
          id: sectionPdf.id,
          stored_in_section: true,
        },
        stats: {
          auditions_associated: associationCount,
          total_auditions_found: auditions.length,
          errors: errors.length > 0 ? errors : null,
        },
      })
    } catch (error) {
      return response.status(500).json({
        error: 'Error uploading PDF',
        details: error.message || 'Unknown error',
      })
    }
  }

  async getProjectPdfs({ params, response }: HttpContext) {
    try {
      const project = await Project.query()
        .where('id', params.id)
        .preload('sectionGroup', (query) => {
          query.preload('sections')
        })
        .firstOrFail()

      const sectionPdfs = await SectionPdf.query()
        .where('project_id', params.id)
        .preload('file')
        .preload('section')
        .orderBy('section_id')
        .orderBy('order')
        .orderBy('title')

      const pdfsBySection: Record<
        number,
        {
          section_id: number
          section_name: string
          pdfs: any[]
          auditions_count: number
        }
      > = {}

      if (project.sectionGroup && project.sectionGroup.sections) {
        for (const section of project.sectionGroup.sections) {
          pdfsBySection[section.id] = {
            section_id: section.id,
            section_name: section.name,
            pdfs: [],
            auditions_count: 0,
          }
        }
      }

      const auditionsPerSection = await Audition.query()
        .where('auditions.project_id', params.id)
        .where('auditions.is_submitted', false)
        .join('participants', 'auditions.participant_id', 'participants.id')
        .groupBy('participants.section_id')
        .select('participants.section_id')
        .count('* as total')

      for (const sectionCount of auditionsPerSection) {
        const sectionId = Number(sectionCount.$extras.section_id)
        if (pdfsBySection[sectionId]) {
          pdfsBySection[sectionId].auditions_count = Number.parseInt(
            String(sectionCount.$extras.total)
          )
        }
      }

      for (const sectionPdf of sectionPdfs) {
        const sectionId = sectionPdf.section_id

        if (!pdfsBySection[sectionId]) {
          pdfsBySection[sectionId] = {
            section_id: sectionId,
            section_name: sectionPdf.section.name,
            pdfs: [],
            auditions_count: 0,
          }
        }

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
            size: sectionPdf.file.size ?? 0,
          },
          usage_count: Number.parseInt(String(usageCount[0].$extras.total || '0')),
        })
      }

      const sectionsArray = Object.values(pdfsBySection).sort((a, b) =>
        a.section_name.localeCompare(b.section_name)
      )

      return response.ok({
        project_id: params.id,
        project_name: project.name,
        sections: sectionsArray,
        total_sections: sectionsArray.length,
        total_unique_pdfs: sectionPdfs.length,
      })
    } catch (error) {
      return response.status(500).json({
        error: 'Error retrieving project PDFs',
        details: error.message || 'Unknown error',
      })
    }
  }

  async bulkSendPdfsToSection({ request, response, params }: HttpContext) {
    try {
      const data = await request.validateUsing(
        vine.compile(
          vine.object({
            section_id: vine.number(),
            pdf_files: vine
              .array(
                vine.object({
                  file_id: vine.number(),
                  title: vine.string().trim().minLength(1),
                  description: vine.string().optional(),
                  order: vine.number().optional(),
                })
              )
              .minLength(1),
          })
        )
      )

      const { section_id, pdf_files } = data

      await Project.findOrFail(params.id)
      const section = await Section.findOrFail(section_id)

      const auditions = await Audition.query()
        .where('auditions.project_id', params.id)
        .where('auditions.is_submitted', false)
        .join('participants', 'auditions.participant_id', 'participants.id')
        .where('participants.section_id', section_id)
        .select('auditions.*')
        .preload('participant', (query) => {
          query.preload('contact')
        })

      let successCount = 0
      let errorCount = 0
      let associationCount = 0
      const errors: string[] = []

      for (const audition of auditions) {
        try {
          for (const pdfData of pdf_files) {
            await File.findOrFail(pdfData.file_id)

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
                order: pdfData.order || 0,
              })
              associationCount++
            }
          }
          successCount++
        } catch (associationError) {
          errorCount++
          errors.push(`Audition ${audition.id}: ${associationError.message}`)
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
          total_associations_created: associationCount,
        },
        errors: errors.length > 0 ? errors : null,
      })
    } catch (error) {
      return response.status(500).json({
        error: 'Error sending PDFs to section',
        details: error.message || 'Unknown error',
      })
    }
  }

  async removePdfFromSection({ params, response }: HttpContext) {
    try {
      const { pdfFileId } = params

      const sectionPdf = await SectionPdf.query()
        .where('project_id', params.id)
        .where('file_id', pdfFileId)
        .preload('file')
        .first()

      if (!sectionPdf) {
        return response.status(404).json({
          error: 'PDF not found in this project',
        })
      }

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

      await sectionPdf.delete()

      const file = sectionPdf.file
      if (file && file.path) {
        try {
          const fs = await import('node:fs/promises')
          await fs.unlink(file.path)
          await file.delete()
        } catch (fileError) {
          // Continue without blocking
        }
      }

      return response.ok({
        message: 'PDF removed from section and all auditions',
        stats: {
          section_pdf_deleted: true,
          associations_deleted: deletedAssociations,
          file_deleted: true,
        },
      })
    } catch (error) {
      return response.status(500).json({
        error: 'Error removing PDF',
        details: error.message || 'Unknown error',
      })
    }
  }

  async associateSectionPdfsToAudition(
    auditionId: number,
    sectionId: number,
    projectId: number
  ): Promise<number> {
    try {
      const sectionPdfs = await SectionPdf.query()
        .where('project_id', projectId)
        .where('section_id', sectionId)
        .preload('file')
        .orderBy('order', 'asc')

      let associatedCount = 0

      for (const sectionPdf of sectionPdfs) {
        try {
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
              order: sectionPdf.order || 0,
            })
            associatedCount++
          }
        } catch (associationError) {
          // Continue without blocking
        }
      }

      return associatedCount
    } catch (error) {
      return 0
    }
  }

  async debugFiles({ params, response }: HttpContext) {
    try {
      const allPdfFiles = await File.query()
        .where('type', 'like', '%pdf%')
        .orderBy('created_at', 'desc')

      const sectionPdfs = await SectionPdf.query()
        .where('project_id', params.id)
        .preload('file')
        .preload('section')

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

      const allAuditions = await Audition.query()
        .where('project_id', params.id)
        .preload('participant', (query) => {
          query.preload('section').preload('contact')
        })

      return response.ok({
        debug_info: {
          project_id: params.id,
          total_pdf_files: allPdfFiles.length,
          section_pdfs: sectionPdfs.length,
          total_associations: allAssociations.length,
          total_auditions: allAuditions.length,
        },
        pdf_files: allPdfFiles.map((file) => ({
          id: file.id,
          name: file.name,
          type: file.type,
          path: file.path,
          size: file.size ?? 0,
          created_at: file.createdAt,
        })),
        section_pdfs: sectionPdfs.map((sp) => ({
          id: sp.id,
          project_id: sp.project_id,
          section_id: sp.section_id,
          file_id: sp.file_id,
          title: sp.title,
          description: sp.description,
          order: sp.order,
          section_name: sp.section.name,
          file_name: sp.file.name,
        })),
        associations: allAssociations.map((assoc) => ({
          id: assoc.id,
          audition_id: assoc.audition_id,
          file_id: assoc.file_id,
          section_id: assoc.section_id,
          title: assoc.title,
          description: assoc.description,
          order: assoc.order,
          file_name: assoc.file.name,
          participant_name: `${assoc.audition.participant.contact.first_name} ${assoc.audition.participant.contact.last_name}`,
          section_name: assoc.audition.participant.section?.name || 'No section',
        })),
        auditions: allAuditions.map((aud) => ({
          id: aud.id,
          participant_id: aud.participant_id,
          is_submitted: aud.is_submitted,
          participant_name: `${aud.participant.contact.first_name} ${aud.participant.contact.last_name}`,
          section_name: aud.participant.section?.name || 'No section',
          section_id: aud.participant.section?.id || null,
        })),
      })
    } catch (error) {
      return response.status(500).json({
        error: 'Debug error',
        details: error.message,
      })
    }
  }

  async getAuditionPage({ params, response }: HttpContext) {
    try {
      const { token } = params

      if (!token || token.length < 10) {
        return response.status(400).json({
          error: 'Invalid audition token format',
          message:
            'The audition link appears to be malformed. Please check the link and try again.',
        })
      }

      let audition
      try {
        audition = await Audition.query()
          .where('secure_token', token)
          .preload('participant', (query) => {
            query.preload('contact').preload('section')
          })
          .preload('project')
          .firstOrFail()
      } catch (auditionError) {
        return response.status(404).json({
          error: 'Audition not found',
          message:
            'This audition link is invalid or has expired. Please contact the project organizers for assistance.',
          token: token,
        })
      }

      const now = DateTime.now()
      if (audition.deadline && audition.deadline < now) {
        return response.status(410).json({
          error: 'Audition deadline has passed',
          message:
            'The deadline for this audition has passed. Please contact the project organizers if you need assistance.',
          deadline: audition.deadline,
        })
      }

      const auditionFiles = await AuditionFile.query()
        .where('audition_id', audition.id)
        .preload('file')
        .orderBy('uploaded_at', 'desc')

      let auditionPdfs: any[] = []
      try {
        auditionPdfs = await AuditionPdfFile.query()
          .where('audition_id', audition.id)
          .preload('file')
          .preload('section')
          .orderBy('order', 'asc')
      } catch (pdfError) {
        // Continue without PDFs
      }

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
            email: audition.participant.contact.email,
          },
          section: {
            id: audition.participant.section?.id,
            name: audition.participant.section?.name || 'Non définie',
          },
        },
        project: {
          id: audition.project.id,
          name: audition.project.name,
        },
        files: auditionFiles.map((af) => ({
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
            size: af.file.size ?? 0,
          },
        })),
        pdfs: auditionPdfs.map((apf) => ({
          id: apf.id,
          title: apf.title,
          description: apf.description,
          order: apf.order,
          section: apf.section?.name || 'Section inconnue',
          file: {
            id: apf.file.id,
            name: apf.file.name,
            type: apf.file.type,
            size: apf.file.size ?? 0,
          },
        })),
      })
    } catch (error) {
      return response.status(500).json({
        error: 'Error retrieving audition',
        message: 'An unexpected error occurred while loading the audition. Please try again later.',
        details: error.message || 'Unknown error',
      })
    }
  }

  async uploadAuditionFile({ request, response, params }: HttpContext) {
    try {
      const { token } = params

      const audition = await Audition.query().where('secure_token', token).firstOrFail()

      if (audition.is_submitted) {
        return response.status(403).json({
          error: 'Audition already submitted',
        })
      }

      const now = DateTime.now()
      if (audition.deadline && audition.deadline < now) {
        return response.status(403).json({
          error: 'Audition deadline has passed',
        })
      }

      const data = await request.validateUsing(uploadAuditionFileValidator)
      const { file, fileType, description } = data

      const uniqueFileName = `audition_${audition.id}_${cuid()}.${file.extname}`
      const uploadsPath = app.makePath('uploads', 'auditions')

      await file.move(uploadsPath, {
        name: uniqueFileName,
        overwrite: true,
      })

      if (!file.isValid) {
        return response.status(400).json({
          error: 'File upload failed',
          details: file.errors,
        })
      }

      const savedFile = await File.create({
        name: file.clientName,
        type: file.type || 'application/octet-stream',
        content: '',
        path: file.filePath,
        size: file.size || 0,
      })

      const auditionFile = await AuditionFile.create({
        audition_id: audition.id,
        file_id: savedFile.id,
        file_type: fileType,
        description: description || '',
        uploaded_at: DateTime.now(),
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
            size: savedFile.size ?? 0,
          },
        },
      })
    } catch (error) {
      return response.status(500).json({
        error: 'Error uploading file',
        details: error.message || 'Unknown error',
      })
    }
  }

  async deleteAuditionFile({ params, response }: HttpContext) {
    try {
      const { token, fileId } = params

      const audition = await Audition.query().where('secure_token', token).firstOrFail()

      if (audition.is_submitted) {
        return response.status(403).json({
          error: 'Cannot delete files from submitted audition',
        })
      }

      const auditionFile = await AuditionFile.query()
        .where('id', fileId)
        .where('audition_id', audition.id)
        .preload('file')
        .firstOrFail()

      if (auditionFile.file.path) {
        try {
          const fs = await import('node:fs/promises')
          await fs.unlink(auditionFile.file.path)
        } catch (fileError) {
          // Continue without blocking
        }
      }

      await auditionFile.file.delete()
      await auditionFile.delete()

      return response.ok({
        message: 'File deleted successfully',
      })
    } catch (error) {
      return response.status(500).json({
        error: 'Error deleting file',
        details: error.message || 'Unknown error',
      })
    }
  }

  async saveTemporaryNotes({ request, response, params }: HttpContext) {
    try {
      const { token } = params
      const { notes } = await request.validateUsing(
        vine.compile(
          vine.object({
            notes: vine.string().maxLength(2000),
          })
        )
      )

      const audition = await Audition.query().where('secure_token', token).firstOrFail()

      if (audition.is_submitted) {
        return response.status(403).json({
          error: 'Cannot modify submitted audition',
        })
      }

      audition.candidate_notes = notes
      await audition.save()

      return response.ok({
        message: 'Notes saved successfully',
      })
    } catch (error) {
      return response.status(500).json({
        error: 'Error saving notes',
        details: error.message || 'Unknown error',
      })
    }
  }

  async submitAudition({ request, response, params }: HttpContext) {
    try {
      const { token } = params
      const data = await request.validateUsing(submitAuditionValidator)

      const audition = await Audition.query()
        .where('secure_token', token)
        .preload('participant')
        .firstOrFail()

      if (audition.is_submitted) {
        return response.status(409).json({
          error: 'Audition already submitted',
        })
      }

      const now = DateTime.now()
      if (audition.deadline && audition.deadline < now) {
        return response.status(403).json({
          error: 'Audition deadline has passed',
        })
      }

      audition.is_submitted = true
      audition.submitted_at = DateTime.now()
      audition.candidate_notes = data.notes || audition.candidate_notes
      await audition.save()

      const participant = audition.participant
      participant.audition_status = 'completed' as 'completed'
      await participant.save()

      return response.ok({
        message: 'Audition submitted successfully',
        submitted_at: formatDateSafely(audition.submitted_at),
      })
    } catch (error) {
      return response.status(500).json({
        error: 'Error submitting audition',
        details: error.message || 'Unknown error',
      })
    }
  }

  async getAuditionPdfs({ params, response }: HttpContext) {
    try {
      const { token } = params

      if (!token || token.length < 10) {
        return response.status(400).json({
          error: 'Invalid token format',
          message: 'The audition token appears to be malformed.',
        })
      }

      let audition
      try {
        audition = await Audition.query().where('secure_token', token).firstOrFail()
      } catch (auditionError) {
        return response.status(404).json({
          error: 'Audition not found',
          message: 'This audition link is invalid or has expired.',
          token: token,
        })
      }

      let auditionPdfs = []
      try {
        auditionPdfs = await AuditionPdfFile.query()
          .where('audition_id', audition.id)
          .preload('file')
          .preload('section')
          .orderBy('order', 'asc')
      } catch (pdfError) {
        return response.ok([])
      }

      return response.ok(
        auditionPdfs.map((apf) => ({
          id: apf.id,
          title: apf.title,
          description: apf.description,
          order: apf.order,
          section: apf.section?.name || 'Section inconnue',
          file: {
            id: apf.file.id,
            name: apf.file.name,
            type: apf.file.type,
            size: apf.file.size ?? 0,
          },
        }))
      )
    } catch (error) {
      return response.status(500).json({
        error: 'Error retrieving PDFs',
        message: 'An error occurred while loading the PDFs.',
        details: error.message || 'Unknown error',
      })
    }
  }

  async downloadAuditionPdf({ params, response }: HttpContext) {
    try {
      const { token, pdfFileId } = params

      const audition = await Audition.query().where('secure_token', token).firstOrFail()

      const auditionPdf = await AuditionPdfFile.query()
        .where('audition_id', audition.id)
        .where('file_id', pdfFileId)
        .preload('file')
        .firstOrFail()

      const file = auditionPdf.file

      if (!file.path) {
        return response.status(404).json({
          error: 'File path not found',
        })
      }

      const fs = await import('node:fs/promises')

      try {
        await fs.access(file.path)
      } catch (accessError) {
        return response.status(404).json({
          error: 'Physical file not found',
          path: file.path,
        })
      }

      const fileName = file.name || `document_${pdfFileId}.pdf`

      response.header('Content-Type', 'application/pdf')
      response.header('Content-Disposition', `attachment; filename="${fileName}"`)
      response.header('Cache-Control', 'no-cache')

      return response.download(file.path)
    } catch (error) {
      return response.status(500).json({
        error: 'Error downloading PDF',
        details: error.message || 'Unknown error',
      })
    }
  }

  async uploadPdfForAudition({ request, response, params }: HttpContext) {
    try {
      const data = await request.validateUsing(uploadAuditionPdfValidator)
      const { file, title, description, section_id, order } = data

      await Project.findOrFail(params.id)
      const section = await Section.findOrFail(section_id)

      const uniqueFileName = `audition_pdf_${params.id}_${cuid()}.${file.extname}`
      const uploadsPath = app.makePath('uploads', 'audition_pdfs')

      await file.move(uploadsPath, {
        name: uniqueFileName,
        overwrite: true,
      })

      if (!file.isValid) {
        return response.status(400).json({
          error: 'PDF upload failed',
          details: file.errors,
        })
      }

      const savedFile = await File.create({
        name: file.clientName,
        type: file.type || 'application/pdf',
        content: '',
        path: file.filePath,
        size: file.size || 0,
      })

      const sectionPdf = await SectionPdf.create({
        project_id: params.id,
        section_id: section_id,
        file_id: savedFile.id,
        title: title,
        description: description || '',
        order: order || 0,
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
            size: savedFile.size ?? 0,
          },
        },
      })
    } catch (error) {
      return response.status(500).json({
        error: 'Error uploading PDF',
        details: error.message || 'Unknown error',
      })
    }
  }

  async deleteAuditionPdf({ params, response }: HttpContext) {
    try {
      const { pdfFileId } = params

      const auditionPdf = await AuditionPdfFile.query()
        .where('file_id', pdfFileId)
        .whereHas('audition', (query) => {
          query.where('project_id', params.id)
        })
        .preload('file')
        .firstOrFail()

      const file = auditionPdf.file

      if (file.path) {
        try {
          const fs = await import('node:fs/promises')
          await fs.unlink(file.path)
        } catch (fileError) {
          // Continue without blocking
        }
      }

      await file.delete()
      await auditionPdf.delete()

      return response.ok({
        message: 'PDF deleted successfully',
      })
    } catch (error) {
      return response.status(500).json({
        error: 'Error deleting PDF',
        details: error.message || 'Unknown error',
      })
    }
  }
}
