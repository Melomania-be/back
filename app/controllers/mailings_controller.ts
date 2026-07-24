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
  private normalizeEmail(email: string | null | undefined): string | null {
    const normalizedEmail = email?.trim().toLowerCase()
    return normalizedEmail || null
  }

  private canSendToContact(
    contact: Contact | null | undefined,
    sentEmails: Set<string>
  ): contact is Contact {
    if (!contact?.email || contact.subscribed !== true || contact.validated !== true) {
      return false
    }

    const normalizedEmail = this.normalizeEmail(contact.email)
    if (!normalizedEmail || sentEmails.has(normalizedEmail)) {
      return false
    }

    sentEmails.add(normalizedEmail)
    return true
  }

  async sendUnique({ request, response }: HttpContext) {
    console.log('sendUnique called')
    const { listContacts, subject, content } = request.only(['listContacts', 'subject', 'content'])

    let listDb = await List.find(listContacts.id)
    let allContacts = await listDb?.related('contacts').query()

    console.log('listDb', listDb)
    console.log('allContacts', allContacts)

    if (allContacts !== null && allContacts !== undefined) {
      const sentEmails = new Set<string>()
      for (let contact of allContacts) {
        console.log('contact', contact)
        if (this.canSendToContact(contact, sentEmails)) {
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
        const sentEmails = new Set<string>()
        for (let participant of participants) {
          if (participant.accepted === true) {
            let contact = await Contact.find(participant.contact_id)
            if (this.canSendToContact(contact, sentEmails)) {
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
        const sentEmails = new Set<string>()
        for (let participant of participants) {
          if (participant.accepted === true) {
            let contact = await Contact.find(participant.contact_id)
            if (this.canSendToContact(contact, sentEmails)) {
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

  async sendMailToIndividualContacts({ request, response }: HttpContext) {
    console.log('sendMailToIndividualContacts called')
    const { contactIds, type, templateId, subject, content } = request.only([
      'contactIds',
      'type',
      'templateId',
      'subject',
      'content',
    ])

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return response.status(400).json({ message: 'No contact IDs provided' })
    }

    const contacts = await Contact.query().whereIn('id', contactIds)

    if (type === 'unique') {
      const sentEmails = new Set<string>()
      for (let contact of contacts) {
        if (this.canSendToContact(contact, sentEmails)) {
          const uniqueMail = new UniquePreparation(content, subject, contact)

          const outgoingMail = new OutgoingMail()
          outgoingMail.type = 'unique'
          outgoingMail.receiver_id = contact.id
          outgoingMail.project_id = null
          outgoingMail.mail_template_id = null
          outgoingMail.sent = false
          outgoingMail.createdAt = DateTime.local()
          outgoingMail.updatedAt = DateTime.local()

          await OutgoingMail.create(outgoingMail)
          await mail.send(uniqueMail)
          await this.updateOutgoingMail(outgoingMail)
        }
      }
      return response.json({ message: 'Email sent successfully' })
    }

    if (type === 'template') {
      let templateDb = await mail_template.find(templateId)
      let htmlFromDb = templateDb?.content || ''
      const sentEmails = new Set<string>()

      for (let contact of contacts) {
        if (this.canSendToContact(contact, sentEmails)) {
          const templatePreparation = new TemplatePreparation(
            htmlFromDb,
            contact,
            null,
            null,
            { firstName: '', lastName: '', email: '', phone: '', messenger: '' },
            null
          )

          const outgoingMail = new OutgoingMail()
          outgoingMail.type = 'template'
          outgoingMail.receiver_id = contact.id
          outgoingMail.project_id = null
          outgoingMail.mail_template_id = templateId
          outgoingMail.sent = false
          outgoingMail.createdAt = DateTime.local()
          outgoingMail.updatedAt = DateTime.local()

          await OutgoingMail.create(outgoingMail)
          await mail.send(templatePreparation)
          await this.updateOutgoingMail(outgoingMail)
        }
      }
      return response.json({ message: 'Email sent successfully' })
    }

    return response.status(400).json({ message: 'Invalid type' })
  }

  // ✅ FONCTION CORRIGÉE : sendAuditionRequest - Version simplifiée sans preload
  async sendAuditionRequest({ request, response }: HttpContext) {
    console.log('📧 sendAuditionRequest called')

    const { projectId, participantId, auditionId } = request.only([
      'projectId',
      'participantId',
      'auditionId',
    ])

    if (!projectId || !participantId) {
      return response.status(400).json({
        error: 'Missing required fields',
        received: { projectId, participantId, auditionId },
      })
    }

    try {
      // ✅ SOLUTION SIMPLE : Charger le projet sans preload
      let project = await Project.find(projectId)

      let participant = await Participant.query()
        .where('id', participantId)
        .preload('contact')
        .preload('section')
        .first()

      let audition = null
      if (auditionId) {
        audition = await Audition.query().where('id', auditionId).first()
      }

      if (!project || !participant) {
        return response.status(404).json({ error: 'Project or participant not found' })
      }

      // Vérifier que le contact et la section sont bien chargés
      if (!participant.contact || !participant.section) {
        return response.status(404).json({ error: 'Participant contact or section not found' })
      }

      // ✅ SOLUTION SIMPLE : Charger les responsables séparément
      let responsibles = await Responsibles.query()
        .where('project_id', projectId)
        .preload('contact')

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
        }
      }

      // Si pas d'audition spécifique fournie, essayer de la trouver
      if (!audition) {
        audition = await Audition.query()
          .where('participant_id', participantId)
          .where('project_id', projectId)
          .orderBy('created_at', 'desc')
          .first()
      }

      if (!audition) {
        return response.status(404).json({ error: 'No audition found for this participant' })
      }

      // Créer et envoyer l'email d'audition
      const auditionRequestModule = await import('#mails/audition_request')
      const AuditionRequest = auditionRequestModule.default
      const auditionRequestMail = new AuditionRequest(
        participant.contact,
        project,
        participant.section,
        audition,
        responsibleContact
      )

      await mail.send(auditionRequestMail)

      // Créer une trace de l'envoi
      const outgoingMail = new OutgoingMail()
      outgoingMail.type = 'audition_request'
      outgoingMail.receiver_id = participant.contact.id
      outgoingMail.project_id = projectId
      outgoingMail.mail_template_id = null
      outgoingMail.sent = true
      outgoingMail.createdAt = DateTime.local()
      outgoingMail.updatedAt = DateTime.local()
      await outgoingMail.save()

      return response.ok({
        message: "Email d'audition envoyé avec succès",
        audition_id: audition.id,
        participant_email: participant.contact.email,
      })
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi de l'email d'audition :", error)
      return response.status(500).json({
        error: "Erreur serveur lors de l'envoi de l'email d'audition",
        details: error.message || 'Erreur inconnue',
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
      const sentEmails = new Set<string>()
      for (let contact of allContacts) {
        console.log('contact', contact)
        let contactDb = await Contact.find(contact.id)
        if (htmlFromDb !== '') {
          if (this.canSendToContact(contactDb, sentEmails)) {
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
      const sentEmails = new Set<string>()
      for (let participant of acceptedParticipants) {
        let contact = await Contact.find(participant.contact_id)
        if (this.canSendToContact(contact, sentEmails)) {
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
        const sentEmails = new Set<string>()
        for (let contact of contacts) {
          if (this.canSendToContact(contact, sentEmails)) {
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
    outgoingMail.project_id = projectId
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
    outgoingMail.project_id = projectId
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

    const outgoingMails = await OutgoingMail.query()
      .where('project_id', ctx.params.id)
      .where('sent', true)
      .preload('receiver', (query) => {
        query.preload('instruments')
      })
      .preload('mailTemplate')
      .orderBy('created_at', 'desc')

    const data = {
      lastCallsheetNotificationSent: lastCallsheetNotificationSent
        ? lastCallsheetNotificationSent.createdAt.toISO()
        : null,
      lastRecruitmentNotificationSent: lastRecruitmentNotificationSent
        ? lastRecruitmentNotificationSent.createdAt.toISO()
        : null,
      outgoingMails: outgoingMails.map((outgoingMail) => ({
        id: outgoingMail.id,
        type: outgoingMail.type,
        sent: outgoingMail.sent,
        createdAt: outgoingMail.createdAt.toISO(),
        updatedAt: outgoingMail.updatedAt.toISO(),
        receiver: outgoingMail.receiver
          ? {
              id: outgoingMail.receiver.id,
              firstName: outgoingMail.receiver.first_name,
              lastName: outgoingMail.receiver.last_name,
              email: outgoingMail.receiver.email,
              instruments:
                outgoingMail.receiver.instruments?.map((instrument) => ({
                  id: instrument.id,
                  name: instrument.name,
                  family: instrument.family,
                })) || [],
            }
          : null,
        mailTemplate: outgoingMail.mailTemplate
          ? {
              id: outgoingMail.mailTemplate.id,
              name: outgoingMail.mailTemplate.name,
            }
          : null,
      })),
    }

    return data
  }
}
