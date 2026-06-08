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
import ProjectPolicy from '#policies/project_policy'

export default class MailingsController {

  private async getAuthorizedProject(bouncer: any, projectId: number, action: 'view' | 'update' | 'delete' = 'update') {
    const project = await Project.findOrFail(projectId)
    await bouncer.with(ProjectPolicy).authorize(action, project)
    return project
  }

  async sendUnique({ request, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    const { listContacts, subject, content } = request.only(['listContacts', 'subject', 'content'])

    let listDb = await List.find(listContacts.id)
    let allContacts = await listDb?.related('contacts').query()

    if (allContacts) {
      for (let contact of allContacts) {
        if (contact.email && contact.subscribed === true && contact.validated === true) {
          const uniqueMail = new UniquePreparation(content, subject, contact)
          const outgoingMail = await OutgoingMail.create({ type: 'unique', receiver_id: contact.id, sent: false, createdAt: DateTime.local(), updatedAt: DateTime.local() })
          await mail.send(uniqueMail)
          await this.updateOutgoingMail(outgoingMail)
        }
      }
      return response.json({ message: 'Email sent successfully' })
    }
    return response.json({ message: 'List not found' })
  }

  async sendMailToParticipants({ request, response, bouncer }: HttpContext) {
    const { projectId, type, templateId, subject, content } = request.only(['projectId', 'type', 'templateId', 'subject', 'content'])
    const project = await this.getAuthorizedProject(bouncer, projectId, 'update')

    let participants = await project.related('participants').query().where('accepted', true)

    if (type === 'template') {
      let templateDb = await mail_template.find(templateId)
      let htmlFromDb = templateDb?.content || ''
      let callsheet = await Callsheet.query().where('project_id', project.id).orderBy('created_at', 'desc').first()
      let responsibles = await Responsibles.query().where('project_id', project.id).preload('contact')

      let toContact = responsibles.map(r => ({ firstName: r.contact.first_name, lastName: r.contact.last_name, email: r.contact.email, phone: r.contact.phone, messenger: r.contact.messenger }))

      // CORRECTION DU TYPAGE ICI
      let registrationId = (project as any).registration_id || (project as any).registration?.id || null

      for (let participant of participants) {
        let contact = await Contact.find(participant.contact_id)
        if (contact?.email && contact?.subscribed === true && contact?.validated === true) {
          const templatePreparation = new TemplatePreparation(htmlFromDb, contact, project, callsheet, toContact[0], registrationId)
          const outgoingMail = await OutgoingMail.create({ type: 'template', receiver_id: contact.id, project_id: project.id, mail_template_id: templateId, sent: false, createdAt: DateTime.local(), updatedAt: DateTime.local() })
          await mail.send(templatePreparation)
          await this.updateOutgoingMail(outgoingMail)
        }
      }
    } else if (type === 'unique') {
      for (let participant of participants) {
        let contact = await Contact.find(participant.contact_id)
        if (contact?.email && contact?.subscribed === true && contact?.validated === true) {
          const uniqueMail = new UniquePreparation(content, subject, contact)
          const outgoingMail = await OutgoingMail.create({ type: 'unique', receiver_id: contact.id, project_id: project.id, sent: false, createdAt: DateTime.local(), updatedAt: DateTime.local() })
          await mail.send(uniqueMail)
          await this.updateOutgoingMail(outgoingMail)
        }
      }
    }
    return response.json({ message: 'Email sent successfully' })
  }

  async sendAuditionRequest({ request, response, bouncer }: HttpContext) {
    const { projectId, participantId, auditionId } = request.only(['projectId', 'participantId', 'auditionId'])
    if (!projectId || !participantId) return response.status(400).json({ error: 'Missing required fields' })

    const project = await this.getAuthorizedProject(bouncer, projectId, 'update')

    try {
      let participant = await Participant.query().where('id', participantId).where('project_id', project.id).preload('contact').preload('section').first()
      if (!participant || !participant.contact || !participant.section) return response.status(404).json({ error: 'Participant/Contact not found' })

      let audition = auditionId ? await Audition.query().where('id', auditionId).first() : await Audition.query().where('participant_id', participantId).where('project_id', project.id).orderBy('created_at', 'desc').first()
      if (!audition) return response.status(404).json({ error: 'No audition found' })

      let responsibles = await Responsibles.query().where('project_id', project.id).preload('contact')
      let responsibleContact = responsibles.length > 0 ? { first_name: responsibles[0].contact.first_name, last_name: responsibles[0].contact.last_name, email: responsibles[0].contact.email, phone: responsibles[0].contact.phone, messenger: responsibles[0].contact.messenger } : null

      const AuditionRequest = (await import('#mails/audition_request')).default
      const auditionRequestMail = new AuditionRequest(participant.contact, project, participant.section, audition, responsibleContact)

      await mail.send(auditionRequestMail)
      await OutgoingMail.create({ type: 'audition_request', receiver_id: participant.contact.id, project_id: project.id, sent: true, createdAt: DateTime.local(), updatedAt: DateTime.local() })

      return response.ok({ message: "Email d'audition envoyé avec succès", audition_id: audition.id })
    } catch (error) {
      return response.status(500).json({ error: "Erreur serveur", details: error.message })
    }
  }

  async sendTemplateToList({ request, response, bouncer }: HttpContext) {
    const { template, listContacts, hasProject, hasCallsheet, project, toContact } = request.only(['template', 'listContacts', 'hasProject', 'hasCallsheet', 'project', 'toContact'])

    if (hasProject) {
      await this.getAuthorizedProject(bouncer, project.id, 'update')
    } else {
      await (bouncer as any).authorize('adminRights')
    }

    let templateDb = await mail_template.find(template.id)
    let listDb = await List.find(listContacts.id)
    let allContacts = await listDb?.related('contacts').query()
    let htmlFromDb = templateDb?.content || ''

    let projectDb = hasProject ? await Project.find(project.id) : project
    let callsheet = (hasProject && hasCallsheet && projectDb?.callsheet_id) ? await Callsheet.find(projectDb.callsheet_id) : null

    // CORRECTION DU TYPAGE ICI
    let registrationId = projectDb ? ((projectDb as any).registration_id || (projectDb as any).registration?.id || null) : null

    if (allContacts) {
      for (let contact of allContacts) {
        let contactDb = await Contact.find(contact.id)
        if (htmlFromDb !== '' && contactDb?.email && contactDb?.subscribed === true && contactDb?.validated === true) {
          const templatePreparation = new TemplatePreparation(htmlFromDb, contact, projectDb, callsheet, toContact, registrationId)
          const outgoingMail = await OutgoingMail.create({ type: 'template', receiver_id: contact.id, project_id: hasProject ? project.id : null, mail_template_id: template.id, sent: false, createdAt: DateTime.local(), updatedAt: DateTime.local() })
          await mail.send(templatePreparation)
          await this.updateOutgoingMail(outgoingMail)
        }
      }
      return response.json({ message: 'Email sent successfully' })
    }
    return response.json({ message: 'List not found' })
  }

  async sendRefusalEmailToParticipant({ request, response, bouncer }: HttpContext) {
    const { projectId, participantId, customMessage } = request.only(['projectId', 'participantId', 'customMessage'])
    if (!projectId || !participantId) return response.status(400).json({ error: 'Missing required fields' })

    const project = await this.getAuthorizedProject(bouncer, projectId, 'update')

    try {
      let participant = await Participant.query().where('id', participantId).where('project_id', project.id).preload('contact').preload('section').first()
      if (!participant || !participant.contact || !participant.section) return response.status(404).json({ error: 'Participant/Contact not found' })

      let responsibles = await Responsibles.query().where('project_id', project.id).preload('contact')
      let responsibleContact = responsibles.length > 0 ? { first_name: responsibles[0].contact.first_name, last_name: responsibles[0].contact.last_name, email: responsibles[0].contact.email, phone: responsibles[0].contact.phone, messenger: responsibles[0].contact.messenger } : null

      const refusalMail = new RefusalNotification(participant.contact, project, participant.section, customMessage, responsibleContact)
      await mail.send(refusalMail)

      await OutgoingMail.create({ type: 'refusal', receiver_id: participant.contact.id, project_id: project.id, sent: true, createdAt: DateTime.local(), updatedAt: DateTime.local() })
      return response.ok({ message: 'Email de refus envoyé' })
    } catch (error) {
      return response.status(500).json({ error: "Erreur serveur", details: error.message })
    }
  }

  async sendCallsheetNotification({ request, response, bouncer }: HttpContext) {
    const { projectId } = request.only(['projectId'])
    const project = await this.getAuthorizedProject(bouncer, projectId, 'update')

    await project.load('participants', q => q.where('accepted', true))
    let callsheet = await Callsheet.query().where('project_id', project.id).orderBy('created_at', 'desc').first()
    let responsibles = await Responsibles.query().where('project_id', project.id).preload('contact')

    if (!callsheet || !responsibles || !project.participants) return response.status(400).json({ message: 'Missing data' })

    let toContact = responsibles.map(r => ({ first_name: r.contact.first_name, last_name: r.contact.last_name, email: r.contact.email, phone: r.contact.phone, messenger: r.contact.messenger }))

    for (let participant of project.participants) {
      let contact = await Contact.find(participant.contact_id)
      if (contact?.email && contact?.subscribed === true && contact?.validated === true) {
        const callsheetNotificationMail = new CallsheetNotification(contact, project, callsheet, toContact)
        const outgoingMail = await OutgoingMail.create({ type: 'callsheet_notification', receiver_id: contact.id, project_id: project.id, sent: false, createdAt: DateTime.local(), updatedAt: DateTime.local() })
        await mail.send(callsheetNotificationMail)
        await this.updateOutgoingMail(outgoingMail)
      }
    }
    return response.json({ message: 'Email sent successfully' })
  }

  async sendRecruitmentNotification({ request, response, bouncer }: HttpContext) {
    const { projectId } = request.only(['projectId'])
    const project = await this.getAuthorizedProject(bouncer, projectId, 'update')

    let contacts = await Contact.query().where('subscribed', true).where('validated', true)
    let registration = await project.related('registration').query().orderBy('created_at', 'desc').first()
    let responsibles = await Responsibles.query().where('project_id', project.id).preload('contact')

    if (!responsibles || !contacts || !registration) return response.status(400).json({ message: 'Missing data' })

    let toContact = responsibles.map(r => ({ first_name: r.contact.first_name, last_name: r.contact.last_name, email: r.contact.email, phone: r.contact.phone, messenger: r.contact.messenger }))

    for (let contact of contacts) {
      if (contact?.email) {
        const recruitmentNotification = new RecruitmentNotification(contact, registration, project, toContact)
        const outgoingMail = await OutgoingMail.create({ type: 'recruitment_notification', receiver_id: contact.id, project_id: project.id, sent: false, createdAt: DateTime.local(), updatedAt: DateTime.local() })
        await mail.send(recruitmentNotification)
        await this.updateOutgoingMail(outgoingMail)
      }
    }
    return response.json({ message: 'Email sent successfully' })
  }

  async sendRecommendedNotification({ request, response, bouncer }: HttpContext) {
    const { projectId, recommendedId } = request.only(['projectId', 'recommendedId'])
    const project = await this.getAuthorizedProject(bouncer, projectId, 'update')
    await project.load('registration')

    let recommended = await Contact.findOrFail(recommendedId)
    let responsibles = await Responsibles.query().where('project_id', project.id).preload('contact')

    let toContact = responsibles.map(r => ({ first_name: r.contact.first_name, last_name: r.contact.last_name, email: r.contact.email, phone: r.contact.phone, messenger: r.contact.messenger }))

    const recommendedNotification = new RecommendedNotification(recommended, project.registration, project, toContact)
    const outgoingMail = await OutgoingMail.create({ type: 'recommendation_notification', receiver_id: recommended.id, sent: false, createdAt: DateTime.local(), updatedAt: DateTime.local() })
    await mail.send(recommendedNotification)
    await this.updateOutgoingMail(outgoingMail)
    return response.json({ message: 'Email sent' })
  }

  async sendParticipationValidationNotification({ request, response, bouncer }: HttpContext) {
    const { projectId, contactId } = request.only(['projectId', 'contactId'])
    const project = await this.getAuthorizedProject(bouncer, projectId, 'update')

    let contact = await Contact.findOrFail(contactId)
    let responsibles = await Responsibles.query().where('project_id', project.id).preload('contact')
    let callsheet = await Callsheet.query().where('project_id', project.id).orderBy('created_at', 'desc').firstOrFail()

    let toContact = responsibles.map(r => ({ first_name: r.contact.first_name, last_name: r.contact.last_name, email: r.contact.email, phone: r.contact.phone, messenger: r.contact.messenger }))

    const participationValidationNotification = new ParticipationValidationNotification(contact, project, callsheet, toContact)
    const outgoingMail = await OutgoingMail.create({ type: 'participation_validation_notification', receiver_id: contact.id, sent: false, createdAt: DateTime.local(), updatedAt: DateTime.local() })
    await mail.send(participationValidationNotification)
    await this.updateOutgoingMail(outgoingMail)
    return response.json({ message: 'Email sent' })
  }

  async getOutgoing({ params, bouncer }: HttpContext) {
    const project = await this.getAuthorizedProject(bouncer, params.id, 'view')

    let lastCallsheetNotificationSent = await OutgoingMail.query().where('type', 'callsheet_notification').where('project_id', project.id).where('sent', true).orderBy('created_at', 'desc').first()
    let lastRecruitmentNotificationSent = await OutgoingMail.query().where('type', 'recruitment_notification').where('project_id', project.id).where('sent', true).orderBy('created_at', 'desc').first()

    return {
      lastCallsheetNotificationSent: lastCallsheetNotificationSent ? lastCallsheetNotificationSent.createdAt.toISO() : null,
      lastRecruitmentNotificationSent: lastRecruitmentNotificationSent ? lastRecruitmentNotificationSent.createdAt.toISO() : null,
    }
  }

  async updateOutgoingMail(outgoingMail: OutgoingMail) {
    try {
      let updateMail = await OutgoingMail.findOrFail(outgoingMail.id)
      updateMail.sent = true
      updateMail.updatedAt = DateTime.local()
      await updateMail.save()
    } catch (error) {}
  }
}