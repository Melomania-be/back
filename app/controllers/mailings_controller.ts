import Contact from '#models/contact'
import mail from '@adonisjs/mail/services/main'
import CallsheetNotification from '../mails/callsheet_notification.js'
import { HttpContext } from '@adonisjs/core/http'
import RecommendedNotification from '#mails/recommended_notification'
import mail_template from '#models/mail_template'
import TemplatePreparation from '#mails/template_preparation'
import Callsheet from '#models/callsheet'
import RefusalNotification from '#mails/refusal_notification'
import List from '#models/list'
import OutgoingMail from '#models/outgoing_mail'
import { DateTime } from 'luxon'
import Project from '#models/project'
import Responsibles from '#models/responsibles'
import ParticipationValidationNotification from '#mails/participation_validation_notification'
import RecruitmentNotification from '#mails/recruitment_notification'
import UniquePreparation from '#mails/unique_preparation'
import Participant from '#models/participant'
import Audition from '#models/audition'

export default class MailingsController {
  async sendUnique({ request, response }: HttpContext) {
    console.log('sendUnique called')
    const { listContacts, subject, content } = request.only(['listContacts', 'subject', 'content'])

    let listDb = await List.find(listContacts.id)
    let allContacts = await listDb?.related('contacts').query()

    console.log('listDb', listDb)
    console.log('allContacts', allContacts)

    if (allContacts !== null && allContacts !== undefined) {
      for (let contact of allContacts) {
        console.log('contact', contact)
        if (contact.email && contact.subscribed === true && contact.validated === true) {
          const uniqueMail = new UniquePreparation(content, subject, contact)

          const outgoingMail = new OutgoingMail()
          outgoingMail.type = 'unique'
          outgoingMail.receiver_id = contact.id
          outgoingMail.sent = false
          outgoingMail.createdAt = DateTime.local()
          outgoingMail.updatedAt = DateTime.local()

          await OutgoingMail.create(outgoingMail)

          await mail.send(uniqueMail)
          await this.updateOutgoingMail(outgoingMail)
        }
      }
      return response.json({ message: 'Email sent successfully' })
    } else {
      return response.json({ message: 'List not found' })
    }
  }

  async sendMailToParticipants({ request, response }: HttpContext) {
    console.log('sendMailToParticipants called')
    const { projectId, type, templateId, subject, content } = request.only([
      'projectId',
      'type',
      'templateId',
      'subject',
      'content',
    ])

    let project = await Project.find(projectId)
    let participants = await project?.related('participants').query().where('accepted', true)

    if (type === 'template') {
      let templateDb = await mail_template.find(templateId)
      let htmlFromDb = templateDb?.content || ''
      let callsheet = await Callsheet.query()
        .where('project_id', projectId)
        .orderBy('created_at', 'desc')
        .first()

      let responsibles = await Responsibles.query()
        .where('project_id', projectId)
        .preload('contact')

      let toContact: Array<{
        firstName: string
        lastName: string
        email: string
        phone: string
        messenger: string
      }> = []

      for (let responsible of responsibles) {
        toContact.push({
          firstName: responsible.contact.first_name,
          lastName: responsible.contact.last_name,
          email: responsible.contact.email,
          phone: responsible.contact.phone,
          messenger: responsible.contact.messenger,
        })
      }

      let registrationId = project?.registration

      if (participants !== null && participants !== undefined) {
        for (let participant of participants) {
          if (participant.accepted === true) {
            let contact = await Contact.find(participant.contact_id)
            if (contact?.email && contact?.subscribed === true && contact?.validated === true) {
              const templatePreparation = new TemplatePreparation(
                htmlFromDb,
                contact,
                project,
                callsheet,
                toContact[0],
                registrationId
              )

              const outgoingMail = new OutgoingMail()
              outgoingMail.type = 'template'
              outgoingMail.receiver_id = contact.id
              outgoingMail.project_id = project?.id
              outgoingMail.mail_template_id = templateId
              outgoingMail.sent = false
              outgoingMail.createdAt = DateTime.local()
              outgoingMail.updatedAt = DateTime.local()

              await OutgoingMail.create(outgoingMail)

              await mail.send(templatePreparation)
              await this.updateOutgoingMail(outgoingMail)
            }
          }
        }
      } else {
        return response.json({ message: 'No participants found' })
      }
    }

    if (type === 'unique') {
      if (participants !== null && participants !== undefined) {
        for (let participant of participants) {
          if (participant.accepted === true) {
            let contact = await Contact.find(participant.contact_id)
            if (contact?.email && contact?.subscribed === true && contact?.validated === true) {
              const uniqueMail = new UniquePreparation(content, subject, contact)

              const outgoingMail = new OutgoingMail()
              outgoingMail.type = 'unique'
              outgoingMail.receiver_id = contact.id
              outgoingMail.project_id = project?.id
              outgoingMail.mail_template_id = null
              outgoingMail.sent = false
              outgoingMail.createdAt = DateTime.local()
              outgoingMail.updatedAt = DateTime.local()

              await OutgoingMail.create(outgoingMail)

              await mail.send(uniqueMail)
              await this.updateOutgoingMail(outgoingMail)
            }
          }
        }
        return response.json({ message: 'Email sent successfully' })
      } else {
        return response.json({ message: 'No participants found' })
      }
    }
  }

  // ✅ FONCTION CORRIGÉE : sendAuditionRequest - Version simplifiée sans preload
  async sendAuditionRequest({ request, response }: HttpContext) {
    console.log('📧 sendAuditionRequest called')

    const { projectId, participantId, auditionId } = request.only([
      'projectId',
      'participantId',
      'auditionId',
    ])

    console.log('📥 Request data:', { projectId, participantId, auditionId })

    if (!projectId || !participantId) {
      console.error('❌ Missing required fields:', { projectId, participantId, auditionId })
      return response.status(400).json({
        error: 'Missing required fields',
        received: { projectId, participantId, auditionId },
      })
    }

    try {
      console.log('🔍 Loading project and participant data...')

      // Charger le projet
      let project = await Project.find(projectId)
      if (!project) {
        console.error('❌ Project not found:', projectId)
        return response.status(404).json({ error: 'Project not found' })
      }
      console.log('✅ Project loaded:', project.name)

      // Charger le participant avec ses relations
      let participant = await Participant.query()
        .where('id', participantId)
        .preload('contact')
        .preload('section')
        .first()

      if (!participant) {
        console.error('❌ Participant not found:', participantId)
        return response.status(404).json({ error: 'Participant not found' })
      }
      console.log('✅ Participant loaded:', participant.contact.first_name, participant.contact.last_name)

      // Vérifier que le contact et la section sont bien chargés
      if (!participant.contact || !participant.section) {
        console.error('❌ Participant missing contact or section:', {
          hasContact: !!participant.contact,
          hasSection: !!participant.section
        })
        return response.status(404).json({ error: 'Participant contact or section not found' })
      }

      // Charger l'audition
      let audition = null
      if (auditionId) {
        audition = await Audition.query().where('id', auditionId).first()
        console.log('🎭 Audition loaded by ID:', auditionId)
      }

      // Si pas d'audition spécifique fournie, essayer de la trouver
      if (!audition) {
        audition = await Audition.query()
          .where('participant_id', participantId)
          .where('project_id', projectId)
          .orderBy('created_at', 'desc')
          .first()
        console.log('🎭 Audition found by participant/project:', !!audition)
      }

      if (!audition) {
        console.error('❌ No audition found for participant:', participantId, 'in project:', projectId)
        return response.status(404).json({ error: 'No audition found for this participant' })
      }

      console.log('✅ Audition loaded:', {
        id: audition.id,
        secure_token: audition.secure_token ? 'present' : 'missing',
        instructions: audition.instructions ? 'present' : 'empty',
        deadline: audition.deadline?.toISO() || 'none'
      })

      // Charger les responsables
      let responsibles = await Responsibles.query()
        .where('project_id', projectId)
        .preload('contact')

      console.log('👥 Responsibles loaded:', responsibles.length)

      let responsibleContact = null
      if (responsibles && responsibles.length > 0) {
        const firstResponsible = responsibles[0]
        if (firstResponsible.contact) {
          responsibleContact = {
            first_name: firstResponsible.contact.first_name,
            last_name: firstResponsible.contact.last_name,
            email: firstResponsible.contact.email,
            phone: firstResponsible.contact.phone,
            messenger: firstResponsible.contact.messenger,
          }
          console.log('✅ Responsible contact prepared:', responsibleContact.email)
        }
      }

      console.log('📧 Preparing audition email...')

      // Créer et envoyer l'email d'audition
      const AuditionRequest = (await import('#mails/audition_request')).default
      const auditionRequestMail = new AuditionRequest(
        participant.contact,
        project,
        participant.section,
        audition,
        responsibleContact
      )

      console.log('📤 Sending audition email to:', participant.contact.email)

      try {
        await mail.send(auditionRequestMail)
        console.log('✅ Audition email sent successfully')
      } catch (emailError) {
        console.error('❌ Email sending failed:', emailError)

        // Log des détails de l'erreur
        if (emailError instanceof Error) {
          console.error('Email error details:', {
            message: emailError.message,
            stack: emailError.stack
          })
        }

        return response.status(500).json({
          error: "Failed to send audition email",
          details: emailError instanceof Error ? emailError.message : 'Unknown email error',
          participant_email: participant.contact.email,
          audition_id: audition.id
        })
      }

      // Créer une trace de l'envoi
      console.log('📝 Creating outgoing mail record...')
      try {
        const outgoingMail = new OutgoingMail()
        outgoingMail.type = 'audition_request'
        outgoingMail.receiver_id = participant.contact.id
        outgoingMail.project_id = projectId
        outgoingMail.mail_template_id = null
        outgoingMail.sent = true
        outgoingMail.createdAt = DateTime.local()
        outgoingMail.updatedAt = DateTime.local()
        await outgoingMail.save()
        console.log('✅ Outgoing mail record created')
      } catch (dbError) {
        console.warn('⚠️ Failed to create outgoing mail record:', dbError)
        // Ne pas faire échouer la requête pour ça
      }

      console.log('🎉 Audition request completed successfully')

      return response.ok({
        message: "Email d'audition envoyé avec succès",
        audition_id: audition.id,
        participant_email: participant.contact.email,
        participant_name: `${participant.contact.first_name} ${participant.contact.last_name}`,
        project_name: project.name
      })

    } catch (error) {
      console.error("❌ Erreur lors de l'envoi de l'email d'audition :", error)

      // Log détaillé de l'erreur
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        })
      }

      return response.status(500).json({
        error: "Erreur serveur lors de l'envoi de l'email d'audition",
        details: error instanceof Error ? error.message : 'Erreur inconnue',
        timestamp: new Date().toISOString()
      })
    }
  }

  async sendTemplateToList({ request, response }: HttpContext) {
    console.log('sendTemplateToList called')
    const { template, listContacts, hasProject, hasCallsheet, project, toContact } = request.only([
      'template',
      'listContacts',
      'hasProject',
      'hasCallsheet',
      'project',
      'toContact',
    ])

    let templateDb = await mail_template.find(template.id)
    let listDb = await List.find(listContacts.id)
    let allContacts = await listDb?.related('contacts').query()
    let htmlFromDb = templateDb?.content || ''
    let projectDb = project
    let callsheet = null
    let registrationId = null

    console.log('templateDb', templateDb)
    console.log('listDb', listDb)
    console.log('allContacts', allContacts)

    if (hasProject) {
      projectDb = await Project.find(project.id)
      registrationId = projectDb.registration_id
    }

    if (hasCallsheet) {
      if (projectDb.callsheet_id) callsheet = await Callsheet.find(projectDb.callsheet_id)
    }

    if (allContacts !== null && allContacts !== undefined) {
      for (let contact of allContacts) {
        console.log('contact', contact)
        let contactDb = await Contact.find(contact.id)
        if (htmlFromDb !== '') {
          if (contactDb?.email && contactDb?.subscribed === true && contactDb?.validated === true) {
            const templatePreparation = new TemplatePreparation(
              htmlFromDb,
              contact,
              projectDb,
              callsheet,
              toContact,
              registrationId
            )

            const outgoingMail = new OutgoingMail()
            outgoingMail.type = 'template'
            outgoingMail.receiver_id = contact.id
            if (hasProject) {
              outgoingMail.project_id = project.id
            } else {
              outgoingMail.project_id = null
            }
            outgoingMail.mail_template_id = template.id
            outgoingMail.sent = false
            outgoingMail.createdAt = DateTime.local()
            outgoingMail.updatedAt = DateTime.local()

            await OutgoingMail.create(outgoingMail)

            await mail.send(templatePreparation)
            await this.updateOutgoingMail(outgoingMail)
          }
        }
      }
      return response.json({ message: 'Email sent successfully' })
    } else {
      return response.json({ message: 'List not found' })
    }
  }

  async sendRefusalEmailToParticipant({ request, response }: HttpContext) {
    const { projectId, participantId, customMessage } = request.only([
      'projectId',
      'participantId',
      'customMessage',
    ])

    if (!projectId || !participantId) {
      return response.status(400).json({
        error: 'Missing required fields',
        received: { projectId, participantId, customMessage },
      })
    }

    try {
      // Récupérer les données nécessaires
      let project = await Project.find(projectId)
      let participant = await Participant.query()
        .where('id', participantId)
        .preload('contact')
        .preload('section')
        .first()

      if (!project || !participant) {
        return response.status(404).json({ error: 'Project or participant not found' })
      }

      // Vérifier que le contact et la section sont bien chargés
      if (!participant.contact || !participant.section) {
        return response.status(404).json({ error: 'Participant contact or section not found' })
      }

      let responsibles = await Responsibles.query()
        .where('project_id', projectId)
        .preload('contact')

      let responsibleContact = null
      if (responsibles && responsibles.length > 0) {
        responsibleContact = {
          first_name: responsibles[0].contact.first_name,
          last_name: responsibles[0].contact.last_name,
          email: responsibles[0].contact.email,
          phone: responsibles[0].contact.phone,
          messenger: responsibles[0].contact.messenger,
        }
      }

      // Créer et envoyer l'email avec le template
      const refusalMail = new RefusalNotification(
        participant.contact,
        project,
        participant.section,
        customMessage,
        responsibleContact
      )

      await mail.send(refusalMail)

      // Créer une trace de l'envoi
      const outgoingMail = new OutgoingMail()
      outgoingMail.type = 'refusal'
      outgoingMail.receiver_id = participant.contact.id
      outgoingMail.project_id = projectId
      outgoingMail.mail_template_id = null
      outgoingMail.sent = true
      outgoingMail.createdAt = DateTime.local()
      outgoingMail.updatedAt = DateTime.local()
      await outgoingMail.save()

      return response.ok({ message: 'Email de refus envoyé avec succès' })
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email :", error)
      return response.status(500).json({
        error: "Erreur serveur lors de l'envoi de l'email",
        details: error.message || 'Erreur inconnue',
      })
    }
  }

  async updateOutgoingMail(outgoingMail: OutgoingMail) {
    try {
      let updateMail = await OutgoingMail.findOrFail(outgoingMail.id)
      updateMail.sent = true
      updateMail.updatedAt = DateTime.local()
      await updateMail.save()
      console.log('updateMail AFTER', updateMail)
    } catch (error) {
      console.log('error', error)
    }

    return
  }

  async sendCallsheetNotification({ request, response }: HttpContext) {
    console.log('sendCallsheetNotification called')
    const { projectId } = request.only(['projectId'])

    let project = await Project.query()
      .where('id', projectId)
      .preload('participants', (participantQuery) => {
        participantQuery.where('accepted', true)
      })
      .first()

    const acceptedParticipants = project?.participants

    if (!project) {
      return { status: 400, message: 'No project found' }
    }
    let callsheet = await Callsheet.query()
      .where('project_id', projectId)
      .orderBy('created_at', 'desc')
      .first()
    let responsibles = await Responsibles.query().where('project_id', projectId).preload('contact')
    let toContact: Array<{
      first_name: string
      last_name: string
      email: string
      phone: string
      messenger: string
    }> = []

    if (!callsheet) {
      return response.status(400).json({ message: 'No callsheet found' })
    }
    if (!project) {
      return response.status(400).json({ message: 'No project found' })
    }
    if (!responsibles) {
      return response.status(400).json({ message: 'No responsibles found' })
    }
    if (!acceptedParticipants) {
      return response.status(400).json({ message: 'No participants found' })
    }

    for (let responsible of responsibles) {
      toContact.push({
        first_name: responsible.contact.first_name,
        last_name: responsible.contact.last_name,
        email: responsible.contact.email,
        phone: responsible.contact.phone,
        messenger: responsible.contact.messenger,
      })
    }

    if (acceptedParticipants !== null && acceptedParticipants !== undefined) {
      for (let participant of acceptedParticipants) {
        let contact = await Contact.find(participant.contact_id)
        if (contact?.email && contact?.subscribed === true && contact?.validated === true) {
          const callsheetNotificationMail = new CallsheetNotification(
            contact,
            project,
            callsheet,
            toContact
          )
          const outgoingMail = new OutgoingMail()
          outgoingMail.type = 'callsheet_notification'
          outgoingMail.receiver_id = contact.id
          if (project) {
            outgoingMail.project_id = project.id
          } else {
            outgoingMail.project_id = null
          }
          outgoingMail.mail_template_id = null
          outgoingMail.sent = false
          outgoingMail.createdAt = DateTime.local()
          outgoingMail.updatedAt = DateTime.local()

          await OutgoingMail.create(outgoingMail)
          await mail.send(callsheetNotificationMail)
          await this.updateOutgoingMail(outgoingMail)
        }
      }
    } else {
      return response.status(400).json({ message: 'No participants found' })
    }

    return response.json({ message: 'Email sent successfully' })
  }

  async sendRecruitmentNotification({ request, response }: HttpContext) {
    console.log('sendRecruitmentNotification called')
    const { projectId } = request.only(['projectId'])
    let project = await Project.query().where('id', projectId).first()

    let contacts = await Contact.query().where('subscribed', true).where('validated', true)
    let registrationQuery = await project
      ?.related('registration')
      .query()
      .orderBy('created_at', 'desc')
      .first()
    let registration = {
      id: registrationQuery?.id,
      project_id: registrationQuery?.project_id,
    }
    let responsibles = await Responsibles.query().where('project_id', projectId).preload('contact')
    let toContact: Array<{
      first_name: string
      last_name: string
      email: string
      phone: string
      messenger: string
    }> = []

    if (!project) {
      return response.status(400).json({ message: 'No project found' })
    }
    if (!responsibles) {
      return response.status(400).json({ message: 'No responsibles found' })
    }
    if (!contacts) {
      return response.status(400).json({ message: 'No validated and subscribed contacts found' })
    }
    if (!registration) {
      return response.status(400).json({ message: 'No registration form found' })
    }

    for (let responsible of responsibles) {
      toContact.push({
        first_name: responsible.contact.first_name,
        last_name: responsible.contact.last_name,
        email: responsible.contact.email,
        phone: responsible.contact.phone,
        messenger: responsible.contact.messenger,
      })
    }
    if (contacts !== null && contacts !== undefined) {
      if (registration.id !== null && registration.id !== undefined) {
        for (let contact of contacts) {
          if (contact?.email && contact?.subscribed === true && contact?.validated === true) {
            const recruitmentNotification = new RecruitmentNotification(
              contact,
              registration,
              project,
              toContact
            )
            const outgoingMail = new OutgoingMail()
            outgoingMail.type = 'recruitment_notification'
            outgoingMail.receiver_id = contact.id
            if (project) {
              outgoingMail.project_id = project.id
            } else {
              outgoingMail.project_id = null
            }
            outgoingMail.mail_template_id = null
            outgoingMail.sent = false
            outgoingMail.createdAt = DateTime.local()
            outgoingMail.updatedAt = DateTime.local()

            await OutgoingMail.create(outgoingMail)
            await mail.send(recruitmentNotification)
            this.updateOutgoingMail(outgoingMail)
          }
        }
      } else {
        return response.status(400).json({ message: 'No registration form found' })
      }
    } else {
      return response.status(400).json({ message: 'No contacts found' })
    }

    return response.json({ message: 'Email sent successfully' })
  }

  async sendRecommendedNotification({ request, response }: HttpContext) {
    //function to send a mail to a recommended person (recommendeds) to join a project
    console.log('sendRecommendedNotification called')
    const { projectId, recommendedId } = request.only(['projectId', 'recommendedId'])

    let project = await Project.query().where('id', projectId).preload('registration').first()
    let recommended = await Contact.find(recommendedId)
    let responsibles = await Responsibles.query().where('project_id', projectId).preload('contact')
    if (!project) {
      return response.status(400).json({ message: 'No project found' })
    }
    if (!recommended) {
      return response.status(400).json({ message: 'No recommended contact found' })
    }

    let toContact: Array<{
      first_name: string
      last_name: string
      email: string
      phone: string
      messenger: string
    }> = []

    for (let responsible of responsibles) {
      toContact.push({
        first_name: responsible.contact.first_name,
        last_name: responsible.contact.last_name,
        email: responsible.contact.email,
        phone: responsible.contact.phone,
        messenger: responsible.contact.messenger,
      })
    }

    const recommendedNotification = new RecommendedNotification(
      recommended,
      project.registration,
      project,
      toContact
    )

    const outgoingMail = new OutgoingMail()
    outgoingMail.type = 'recommendation_notification'
    outgoingMail.receiver_id = recommended.id
    outgoingMail.mail_template_id = null
    outgoingMail.sent = false
    outgoingMail.createdAt = DateTime.local()
    outgoingMail.updatedAt = DateTime.local()

    await OutgoingMail.create(outgoingMail)

    await mail.send(recommendedNotification)
    await this.updateOutgoingMail(outgoingMail)

    return response.json({
      message: 'Email ' + outgoingMail.type + ' sent successfully to' + recommended.email,
    })
  }

  async sendParticipationValidationNotification({ request, response }: HttpContext) {
    console.log('sendParticipationValidationNotification called')
    const { projectId, contactId } = request.only(['projectId', 'contactId'])

    let project = await Project.query().where('id', projectId).preload('callsheets').first()
    let contact = await Contact.find(contactId)
    let responsibles = await Responsibles.query().where('project_id', projectId).preload('contact')
    let callsheet = await Callsheet.query()
      .where('project_id', projectId)
      .orderBy('created_at', 'desc')
      .first()

    if (!project) {
      return response.status(400).json({ message: 'No project found' })
    }
    if (!contact) {
      return response.status(400).json({ message: 'No contact found' })
    }
    if (!callsheet) {
      return response.status(400).json({ message: 'No callsheet found' })
    }

    let toContact: Array<{
      first_name: string
      last_name: string
      email: string
      phone: string
      messenger: string
    }> = []

    for (let responsible of responsibles) {
      toContact.push({
        first_name: responsible.contact.first_name,
        last_name: responsible.contact.last_name,
        email: responsible.contact.email,
        phone: responsible.contact.phone,
        messenger: responsible.contact.messenger,
      })
    }

    const participationValidationNotification = new ParticipationValidationNotification(
      contact,
      project,
      callsheet,
      toContact
    )

    const outgoingMail = new OutgoingMail()
    outgoingMail.type = 'participation_validation_notification'
    outgoingMail.receiver_id = contact.id
    outgoingMail.mail_template_id = null
    outgoingMail.sent = false
    outgoingMail.createdAt = DateTime.local()
    outgoingMail.updatedAt = DateTime.local()

    await OutgoingMail.create(outgoingMail)

    await mail.send(participationValidationNotification)
    await this.updateOutgoingMail(outgoingMail)

    return response.json({
      message: 'Email ' + outgoingMail.type + ' sent successfully to' + contact.email,
    })
  }

  async getOutgoing(ctx: HttpContext) {
    let data: {
      lastCallsheetNotificationSent: string | null
      lastRecruitmentNotificationSent: string | null
    }
    console.log('getOutgoing called')
    let lastCallsheetNotificationSent = await OutgoingMail.query()
      .where('type', 'callsheet_notification')
      .where('project_id', ctx.params.id)
      .where('sent', true)
      .orderBy('created_at', 'desc')
      .first()

    let lastRecruitmentNotificationSent = await OutgoingMail.query()
      .where('type', 'recruitment_notification')
      .where('project_id', ctx.params.id)
      .where('sent', true)
      .orderBy('created_at', 'desc')
      .first()

    data = {
      lastCallsheetNotificationSent: lastCallsheetNotificationSent
        ? lastCallsheetNotificationSent.createdAt.toISO()
        : null,
      lastRecruitmentNotificationSent: lastRecruitmentNotificationSent
        ? lastRecruitmentNotificationSent.createdAt.toISO()
        : null,
    }

    return data
  }
}
