import Contact from '#models/contact'
import mail from '@adonisjs/mail/services/main'
import CallsheetNotification from '../mails/callsheet_notification.js'
import { HttpContext } from '@adonisjs/core/http'
import RecommendedNotification from '#mails/recommended_notification'
import mail_template from '#models/mail_template'
import TemplatePreparation from '#mails/template_preparation'
import Callsheet from '#models/callsheet'
import List from '#models/list'
import OutgoingMail from '#models/outgoing_mail'
import { DateTime } from 'luxon'
import Project from '#models/project'
import Responsibles from '#models/responsibles'
import ParticipationValidationNotification from '#mails/participation_validation_notification'
import RecruitmentNotification from '#mails/recruitment_notification'
import UniquePreparation from '#mails/unique_preparation'

export default class MailingsController {
  async sendUnique({ request, response }: HttpContext) {
    console.log('sendUnique called')
    const { listContacts, subject, content } = request.only(['listContacts', 'subject', 'content'])

    console.log('listContacts', listContacts)
    console.log('subject', subject)
    console.log('content', content)

    let listDb = await List.find(listContacts.id)
    let allContacts = await listDb?.related('contacts').query()

    console.log('listDb', listDb)
    console.log('allContacts', allContacts)

    if (allContacts !== null && allContacts !== undefined) {
      for (let contact of allContacts) {
        if (contact.email && contact.subscribed === true && contact.validated === true) {
          const uniqueMail = new UniquePreparation(content, subject, contact)

          const outgoingMail = new OutgoingMail()
          outgoingMail.type = 'unique'
          outgoingMail.receiver_id = contact.id
          outgoingMail.sent = false
          outgoingMail.createdAt = DateTime.local()
          outgoingMail.updatedAt = DateTime.local()

          await OutgoingMail.create(outgoingMail)

          await mail.sendLater(uniqueMail)
          await this.updateOutgoingMail(outgoingMail)

          return response.json({ message: 'Email sent successfully' })
        } else {
          return response.json({ message: 'List not found' })
        }
      }
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
              const registrationNotificationMail = new TemplatePreparation(
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

              await mail.sendLater(registrationNotificationMail)
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

              await mail.sendLater(uniqueMail)
              await this.updateOutgoingMail(outgoingMail)
            }
          }
        }
      } else {
        return response.json({ message: 'No participants found' })
      }
    }
  }

  async sendLaterTemplateToList({ request, response }: HttpContext) {
    console.log('sendLaterTemplateToList called')
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

    if (hasProject) {
      projectDb = await Project.find(project.id)
      registrationId = projectDb.registration_id
    }

    if (hasCallsheet) {
      if (projectDb.callsheet_id) callsheet = await Callsheet.find(projectDb.callsheet_id)
    }

    if (allContacts !== null && allContacts !== undefined) {
      for (let contact of allContacts) {
        let contactDb = await Contact.find(contact.id)
        if (htmlFromDb !== '') {
          if (contactDb?.email && contactDb?.subscribed === true && contactDb?.validated === true) {
            const registrationNotificationMail = new TemplatePreparation(
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

            await mail.sendLater(registrationNotificationMail)
            await this.updateOutgoingMail(outgoingMail)

            return response.json({ message: 'Email sent successfully' })
          }
        }
      }
    } else {
      return response.json({ message: 'List not found' })
    }
  }

  async updateOutgoingMail(outgoingMail: OutgoingMail) {
    try {
      let updateMail = await OutgoingMail.findOrFail(outgoingMail.id)
      updateMail.sent = true
      updateMail.updatedAt = DateTime.local()
      console.log('updateMail', updateMail)
      await updateMail.save()
    } catch (error) {
      console.log('error', error)
    }
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
          await mail.sendLater(callsheetNotificationMail)
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
            await mail.sendLater(recruitmentNotification)
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

    await mail.sendLater(recommendedNotification)
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

    await mail.sendLater(participationValidationNotification)
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
