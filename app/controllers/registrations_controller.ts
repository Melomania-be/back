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
    console.log('Submit endpoint reached')
    const data = await ctx.request.validateUsing(userRegistrationValidator)
    console.log('Data sent : ', data)

    let searchContact = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
    }

    let saveContact = {
      phone: data.phone,
      messenger: data.messenger,
      validated: false,
    }

    // Create or retrieve the contact
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

    //Checking if the contact is already in the participant db with this project, if not its added
    let participant = await Participant.firstOrCreate(searchParticipant, saveParticipant)

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
    console.log('Rehearsals sent : ', rehearsalsWithComments)
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
    console.log('Concerts sent : ', concertsWithComments)
    await participant.related('concerts').sync(concertsWithComments)

    ///Puting the answer in the answer table if there is a form to fill
    // if (data.answers.length === 0) {
    //   return ctx.response.json({ success: true, participant })
    // }

    const answer = await Answer.createMany(
      data.answers.map((answerIt) => {
        return {
          text: answerIt.text ?? '',
          form_id: answerIt.form_id,
          participant_id: participant.id,
        }
      })
    )

    // Load the complete project for the email
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

    // Get the first responsible as the recruiter
    const responsibles = (project as any).responsibles
    const recruiter =
      responsibles && responsibles.length > 0
        ? {
            name: responsibles[0].first_name + ' ' + responsibles[0].last_name,
            email: responsibles[0].email,
          }
        : { name: 'Melomania Team', email: 'noreply@melomania.be' }

    // Add contents from registration to project for the email
    const projectData = project as any
    if (projectData.registration?.content) {
      projectData.contents = projectData.registration.content
    }

    // Send confirmation email
    try {
      console.log('About to send registration email...')
      console.log('Contact email:', contact.email)
      console.log('Recruiter:', recruiter)

      const mailInstance = new RegistrationEmail(contact, project as any, recruiter)
      console.log('RegistrationEmail instance created')

      await mail.send(mailInstance)
      console.log('Registration email sent successfully!')
    } catch (error) {
      console.error('Failed to send registration email:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
    }

    return ctx.response.json({
      success: true,
      participant,
      answer,
    })
  }
}
