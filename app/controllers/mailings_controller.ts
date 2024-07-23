import Contact from '#models/contact'
import mail from '@adonisjs/mail/services/main'
import CallsheetNotification from '../mails/callsheet_notification.js'
import { HttpContext } from '@adonisjs/core/http'
//import { createTemplateValidator, mailCallsheetValidator } from '#validators/mail'
//import env from '#start/env'
import RegistrationNotification from '#mails/registration_notification'
import RecommendationNotification from '#mails/recommendation_notification'
import mail_template from '#models/mail_template'
import TemplatePreparation from '#mails/template_preparation'
import Callsheet from '#models/callsheet'
import List from '#models/list'
import OutgoingMail from '#models/outgoing_mail'
import { DateTime } from 'luxon'
import Project from '#models/project'
import Responsibles from '#models/responsibles'
import { emitKeypressEvents } from 'node:readline'

export default class MailingsController {
  async send() {
    console.log('send called')

    await mail.send((message) => {
      message
        .to('')
        .from('info@melomania.be')
        .subject('Verify your email address')
        .html('<p>Please verify your email address by clicking on the link below.</p>')
    })
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
        if (contact.email) {
          let contactDb = await Contact.find(contact.id)
          if (htmlFromDb !== '') {
            if (contactDb?.subscribed === true) {
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
            }
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
        if (contact?.email && contact?.subscribed === true) {
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

  async sendRecommendationNotification({ request, response }: HttpContext) {
    console.log('sendRecommendationNotification called')
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
          if (contact?.email && contact?.subscribed === true) {
            const recommendationNotification = new RecommendationNotification(
              contact,
              registration,
              project,
              toContact
            )
            const outgoingMail = new OutgoingMail()
            outgoingMail.type = 'recommendation_notification'
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
            await mail.sendLater(recommendationNotification)
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

  async sendRegistrationNotification({ request, response }: HttpContext) {
    console.log('sendRecommendationNotification called')

    const { contact, project, callsheet, toContact } = request.only([
      'contact',
      'project',
      'callsheet',
      'toContact',
    ])

    if (!contact.email) {
      return response.status(400).json({ message: 'Contact email is required' })
    }

    const registrationNotificationMail = new RegistrationNotification(
      contact,
      project,
      callsheet,
      toContact
    )
    await mail.send(registrationNotificationMail)

    return response.json({ message: 'Email sent successfully' })
  }

  async getOutgoing(ctx: HttpContext) {
    let data: {
      lastCallsheetNotificationSent: string | null
      lastRecommendationNotificationSent: string | null
    }
    console.log('getOutgoing called')
    let lastCallsheetNotificationSent = await OutgoingMail.query()
      .where('type', 'callsheet_notification')
      .where('project_id', ctx.params.id)
      .where('sent', true)
      .orderBy('created_at', 'desc')
      .first()

    let lastRecommendationNotificationSent = await OutgoingMail.query()
      .where('type', 'recommendation_notification')
      .where('project_id', ctx.params.id)
      .where('sent', true)
      .orderBy('created_at', 'desc')
      .first()

    data = {
      lastCallsheetNotificationSent: lastCallsheetNotificationSent
        ? lastCallsheetNotificationSent.createdAt.toISO()
        : null,
      lastRecommendationNotificationSent: lastRecommendationNotificationSent
        ? lastRecommendationNotificationSent.createdAt.toISO()
        : null,
    }

    return data
  }
}
