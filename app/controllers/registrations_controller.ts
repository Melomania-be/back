import { HttpContext } from '@adonisjs/core/http'
import Registration from '#models/registration'
import { createRegistrationValidator, userRegistrationValidator } from '#validators/registration'
import Contact from '#models/contact'
import Participant from '#models/participant'
import Answer from '#models/answer'
import Project from '#models/project'
import mail from '@adonisjs/mail/services/main'
import RegistrationEmail from '#mails/registration_email'

export default class RegistrationsController {
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
      registration.related('content').createMany(data.content)

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
      registration.related('content').createMany(data.content)
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

    const searchContact = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
    }

    const saveContact = {
      phone: data.phone,
      messenger: data.messenger,
      validated: false,
    }

    // Create or retrieve the contact
    const contact = await Contact.firstOrCreate(searchContact, saveContact)

    const searchParticipant = {
      contact_id: contact.id,
      project_id: data.project_id,
    }

    const saveParticipant = {
      section_id: data.section_id,
      accepted: false,
      last_activity: new Date(),
    }

    // Create or retrieve the participant
    const participant = await Participant.firstOrCreate(searchParticipant, saveParticipant)

    // Save rehearsals
    const rehearsalsWithComments = data.rehearsals.reduce(
      (acc, rehearsal) => {
        acc[rehearsal.id] = {
          comment: rehearsal.comment ?? '',
        }

        return acc
      },
      {} as Record<number, { comment: string }>
    )

    await participant.related('rehearsals').sync(rehearsalsWithComments)

    // Save concerts
    const concertsWithComments = data.concerts.reduce(
      (acc, concert) => {
        acc[concert.id] = {
          comment: concert.comment ?? '',
        }

        return acc
      },
      {} as Record<number, { comment: string }>
    )

    await participant.related('concerts').sync(concertsWithComments)

    // Save answers only when the registration form contains answers
    let answers: Answer[] = []

    if (data.answers.length > 0) {
      answers = await Answer.createMany(
        data.answers.map((answerIt) => ({
          text: answerIt.text ?? '',
          form_id: answerIt.form_id,
          participant_id: participant.id,
        }))
      )
    }

    // Load all project information required by the email
    const project = await Project.query()
      .where('id', data.project_id)
      .preload('responsibles')
      .preload('pieces', (query) => {
        query.preload('composer')
      })
      .preload('registration', (query) => {
        query.preload('content')
      })
      .preload('rehearsals')
      .preload('concerts')
      .firstOrFail()

    // Use the first project responsible as the email contact
    const responsible = project.responsibles?.[0]

    const recruiter = {
      name: 'Melomania',
      email: 'noreply@melomania.be',
    }

    const projectData = {
      id: project.id,
      name: project.name,

      rehearsals: project.rehearsals.map((rehearsal) => ({
        id: rehearsal.id,
        start_date: rehearsal.start_date,
        end_date: rehearsal.end_date,
        place: rehearsal.place,
        comment: rehearsal.comment,
      })),

      concerts: project.concerts.map((concert) => ({
        id: concert.id,
        start_date: concert.start_date,
        end_date: concert.end_date,
        place: concert.place,
        comment: concert.comment,
      })),

      pieces: project.pieces.map((piece) => ({
        id: piece.id,
        name: piece.name,
        composer: piece.composer
          ? {
              short_name: piece.composer.short_name,
              long_name: piece.composer.long_name,
            }
          : undefined,
      })),

      contents:
        project.registration?.content?.map((content) => ({
          title: content.title,
          text: content.text,
        })) ?? [],
    }

    // Send the registration confirmation email
    try {
      await mail.send(new RegistrationEmail(contact, projectData, recruiter))
    } catch (error) {
      console.error('Failed to send registration confirmation email:', error)
    }

    return ctx.response.json({
      success: true,
      participant,
      answers,
    })
  }
}
