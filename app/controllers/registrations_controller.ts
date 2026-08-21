import { HttpContext } from '@adonisjs/core/http'
import Registration from '#models/registration'
import { createRegistrationValidator, userRegistrationValidator } from '#validators/registration'
import Contact from '#models/contact'
import Participant from '#models/participant'
import Answer from '#models/answer'
import Project from '#models/project'
import NotificationService from '#services/notification_service'

export default class RegistrationsController {
  private async createProjectRegistrationNotifications(params: {
    projectId: number
    applicantContact: Contact
    participantId: number
  }) {
    const project = await Project.query()
      .where('id', params.projectId)
      .preload('responsibles')
      .first()

    if (!project || project.responsibles.length === 0) {
      return
    }

    const applicantName = [params.applicantContact.first_name, params.applicantContact.last_name]
      .filter(Boolean)
      .join(' ')
      .trim()

    for (const responsible of project.responsibles) {
      await NotificationService.createForContact(responsible.id, {
        type: 'project_application_submitted',
        title: `New application for ${project.name}`,
        body: applicantName
          ? `${applicantName} submitted an application for the project ${project.name}.`
          : `A new application was submitted for the project ${project.name}.`,
        projectId: project.id,
        data: {
          project_id: project.id,
          participant_id: params.participantId,
          applicant_contact_id: params.applicantContact.id,
          type: 'project_application_submitted',
        },
      })
    }
  }

  async getAll() {
    return await Registration.query()
  }

  async getOne({ params, response }: HttpContext) {
    const projectId = Number(params.id)

    if (Number.isNaN(projectId)) {
      return response.send('Invalid registration ID')
    }

    const registration = await Registration.query()
      .whereHas('project', (query) => {
        query.where('id', projectId)
      })
      .preload('content')
      .preload('project', (projectQuery) => {
        projectQuery
          .preload('rehearsals', (rehearsalQuery) => {
            rehearsalQuery.preload('participants', (participantQuery) => {
              participantQuery.pivotColumns(['comment'])
            })
          })
          .preload('concerts', (concertQuery) => {
            concertQuery.preload('participants', (participantQuery) => {
              participantQuery.pivotColumns(['comment'])
            })
          })
          .preload('pieces', (pieceQuery) => {
            pieceQuery.preload('composer')
          })
          .preload('sectionGroup', (sectionQuery) => {
            sectionQuery.preload('sections')
          })
      })
      .preload('form')
      .first()

    if (!registration) {
      return response.abort('Registration not found', 404)
    }

    return registration
  }

  async createOrUpdate(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createRegistrationValidator)

    let project = await Project.findOrFail(data.params.id)

    let registration = await project.related('registration').query().first()

    if (registration) {
      await registration.related('content').query().delete()
      registration.related('content').createMany(
        data.content.map((c, index) => ({
          title: c.title,
          text: c.text,
          order: c.order ?? index,
          position: c.position ?? 'below'
        }))
      )

      for (const form of data.form) {
        if (form.id) {
          await registration.related('form').query().where('id', form.id).update({
            text: form.text,
            type: form.type,
          })
        } else {
          await registration.related('form').create({
            text: form.text,
            type: form.type,
          })
        }
      }
    } else {
      registration = await project.related('registration').create({})
      registration.related('content').createMany(
        data.content.map((c, index) => ({
          title: c.title,
          text: c.text,
          order: c.order ?? index,
          position: c.position ?? 'below'
        }))
      )
      registration.related('form').createMany(data.form)
    }

    return registration
  }

  async delete({ params, response }: HttpContext) {
    const projectId = Number(params.id)

    if (Number.isNaN(projectId)) {
      return response.send('Invalid project ID')
    }

    const registration = await Registration.query().where('project_id', projectId).firstOrFail()

    await registration.delete()
    return response.send('Registration deleted')
  }

  async submit(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(userRegistrationValidator)
    console.log('Data sent : ', data)

    let searchContact = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
    }
    let saveContact = { phone: data.phone, messenger: data.messenger, validated: false }

    let contact = await Contact.firstOrCreate(searchContact, saveContact)
    console.log('Contact sent : ', contact)

    let searchParticipant = {
      contact_id: contact.id,
      project_id: data.project_id,
    }

    let saveParticipant = {
      section_id: data.section_id,
      accepted: false,
      last_activity: new Date(),
    }

    let participant = await Participant.firstOrCreate(searchParticipant, saveParticipant)

    const rehearsalsWithComments = data.rehearsals.reduce(
      (acc, rehearsal) => {
        acc[rehearsal.id] = { comment: rehearsal.comment ?? '' }
        return acc
      },
      {} as Record<number, { comment: string }>
    )
    console.log('Rehearsals sent : ', rehearsalsWithComments)
    await participant.related('rehearsals').sync(rehearsalsWithComments)

    const concertsWithComments = data.concerts.reduce(
      (acc, concert) => {
        acc[concert.id] = { comment: concert.comment ?? '' }
        return acc
      },
      {} as Record<number, { comment: string }>
    )
    console.log('Concerts sent : ', concertsWithComments)
    await participant.related('concerts').sync(concertsWithComments)

    const createNotifications = async () => {
      try {
        await this.createProjectRegistrationNotifications({
          projectId: data.project_id,
          applicantContact: contact,
          participantId: participant.id,
        })
      } catch (error) {
        console.error('Failed to create project registration notifications', error)
      }
    }

    if (data.answers.length === 0) {
      await createNotifications()

      return ctx.response.json({ success: true, participant })
    }

    const answer = await Answer.createMany(
      data.answers.map((answerIt) => {
        return {
          text: answerIt.text ?? '',
          form_id: answerIt.form_id,
          participant_id: participant.id,
        }
      })
    )

    await createNotifications()

    return ctx.response.json({ success: true, participant, answer })
  }
}
