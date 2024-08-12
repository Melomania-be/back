// import type { HttpContext } from '@adonisjs/core/http'

import Participant from '#models/participant'
import { HttpContext } from '@adonisjs/core/http'
import { createParticipantValidator, validateParticipantValidator } from '#validators/participant'
import { Filter, RelationFilter, simpleFilter } from '#services/simple_filter'
import Contact from '#models/contact'

export default class ParticipantsController {
  //getAll : gets list of all of the (accepted) participants of this project at /projects/:id/management/participants
  async getAll(ctx: HttpContext) {
    const baseQuery = Participant.query()
      .preload('contact')
      .preload('section')
      .where('project_id', ctx.params.id)
      .andWhere('accepted', true)

    return await simpleFilter(
      ctx,
      Participant,
      baseQuery,
      new Filter(Participant, ['contact_id']),
      [new RelationFilter('contact', Contact, ['first_name', 'last_name'])]
    )
  }

  //getOne : gets a participant at /projects/:id/management/participants/unique/:id
  async getOne({ params }: HttpContext) {
    const { id, participantId } = params
    return await Participant.query()
      .where('id', participantId)
      .andWhere('project_id', id)
      .preload('contact')
      .preload('section')
      .preload('answers')
      .preload('concerts')
      .preload('rehearsals')
      .preload('project')
      .first()
  }

  //createOrUpdate : creates a participant at /projects/:id/management/participants
  async createOrUpdate({ request, response }: HttpContext) {
    const data = await request.validateUsing(createParticipantValidator)

    let participant: Participant | null

    if (data.id) {
      participant = await Participant.find(data.id)
      if (!participant) return response.abort('Participant not found')
    } else {
      participant = await Participant.query()
        .where('project_id', data.project.id)
        .andWhere('contact_id', data.contact.id)
        .first()
      if (participant) return response.abort('This person already is a participant')
      else
        participant = await Participant.create({
          accepted: data.accepted,
          contact_id: data.contact.id,
          project_id: data.project.id,
          section_id: data.section.id,
        })
    }

    await participant.related('answers').query().delete()

    await participant.related('answers').createMany(
      data.answers.map((answers) => ({
        text: answers.text ? answers.text : '',
        form_id: answers.formId,
      }))
    )

    await participant.related('concerts').detach()
    await participant.related('rehearsals').detach()
    await participant.related('concerts').sync(data.concerts.map((concert) => concert.id))
    await participant.related('rehearsals').sync(data.rehearsals.map((rehearsal) => rehearsal.id))

    return response.send('Participant created')
  }

  //getApplications : gets list of all contacts that want to be participants at /projects/:id/management/validation
  async getApplications({ params }: HttpContext) {
    return await Participant.query()
      .where('project_id', params.id)
      .andWhere('accepted', false)
      .preload('contact')
      .preload('section')
      .preload('answers', (query) => query.preload('form'))
      .preload('concerts')
      .preload('rehearsals')
  }

  //validateParticipant : transforms the accepted field to true at /projects/:id/management/validation/:id
  async validateParticipant({ request, response }: HttpContext) {
    const data = await request.validateUsing(validateParticipantValidator)

    const participant = await Participant.query()
      .where('id', data.id)
      .andWhere('project_id', data.params.id)
      .first()

    if (!participant) return response.send("Couldn't find the participant")

    participant.accepted = true
    await participant.save()

    return response.send('Participant validated')
  }

  //delete : deletes a participant from the given project at /projects/:id/management/participants/:id
  async delete({ params, response }: HttpContext) {
    const { id, participantId } = params
    const participant = await Participant.query()
      .where('id', participantId)
      .andWhere('project_id', id)
      .first()

    if (!participant) {
      return response.send("Can't find this participant in this project")
    }

    await participant.delete()
    return response.send('Participant deleted from the project')
  }
}
