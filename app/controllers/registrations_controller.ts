import { HttpContext } from '@adonisjs/core/http'
import Registration from '#models/registration'
import { createRegistrationValidator, userRegistrationValidator } from '#validators/registration'
import Contact from '#models/contact'
import Participant from '#models/participant'
import Answer from '#models/answer'

export default class RegistrationsController {
  async getAll() {
    return await Registration.query()
  }

  async getOne({ params, response }: HttpContext) {
    console.log('params???', params)
    const registrationId = Number(params.id)

    if (Number.isNaN(registrationId)) {
      return response.send('Invalid registration ID')
    }

    const data = await Registration.query()
      .where('id', registrationId)
      .preload('content')
      .preload('project', (projectQuery) => {
        projectQuery
          .preload('rehearsals')
          .preload('pieces')
          .preload('sectionGroup', (sectionQuery) => {
            sectionQuery.preload('sections')
          })
      })
      .preload('form')
      .first()

    console.log('data : ', data)

    if (!data) {
      return response.send('Registration not found')
    }
    return response.json(data)
  }

  async create(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createRegistrationValidator)
    const registration = await Registration.create(data)

    return registration.related('content').createMany(data.content)
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
    if (!data.answer) {
      return ctx.response.json({ success: true, participant })
    }

    const answer = await Answer.create({
      text: data.answer.text,
      form_id: data.answer.form_id,
      participant_id: participant.id,
    })

    return ctx.response.json({ success: true, participant, answer })
  }
}
