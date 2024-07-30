import { HttpContext } from '@adonisjs/core/http'
import Registration from '#models/registration'
import { createRegistrationValidator, userRegistrationValidator } from '#validators/registration'
import Contact from '#models/contact'
import Participant from '#models/participant'
import Answer from '#models/answer'
import Project from '#models/project'

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
          .preload('rehearsals')
          .preload('concerts')
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
      await registration.related('form').query().delete()
    } else {
      registration = await project.related('registration').create({})
    }
    registration.related('content').createMany(data.content)
    registration.related('form').createMany(data.form)

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
    let searchContact = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
    }
    let saveContact = { phone: data.phone, messenger: data.messenger, validated: false }

    //Checking if the user entering his info is already in the db, if not it creates a new contact
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
    await participant.related('rehearsals').sync(data.rehearsals)

    //Puting the answer in the answer table if there is a form to fill
    if (data.answers.length === 0) {
      return ctx.response.json({ success: true, participant })
    }

    const answer = await Answer.createMany(
      data.answers.map((answerIt) => {
        return {
          text: answerIt.text,
          form_id: answerIt.form_id,
          participant_id: participant.id,
        }
      })
    )

    return ctx.response.json({ success: true, participant, answer })
  }
}
