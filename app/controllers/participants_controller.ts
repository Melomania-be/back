// import type { HttpContext } from '@adonisjs/core/http'

import Participant from '#models/participant'
import { HttpContext } from '@adonisjs/core/http'
import { createParticipantValidator } from '#validators/participant'
import { Filter, RelationFilter, simpleFilter } from '#services/simple_filter'
import Contact from '#models/contact'

export default class ParticipantsController {
  //getAll : gets list of all of the (accepted) participants of this project at /projects/:id/management/participants
  async getAll(ctx: HttpContext) {
    const baseQuery = Participant.query()
      .preload('contact')
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

    participant.related('answers').createMany(
      data.answers.map((answers) => ({
        text: answers.text ? answers.text : '',
        form_id: answers.formId,
      }))
    )

    participant.related('concerts').sync(data.concerts.map((concert) => concert.id))
    participant.related('rehearsals').sync(data.rehearsals.map((rehearsal) => rehearsal.id))

    return response.send('Participant created')
  }

  //getApplications : gets list of all contacts that want to be participants at /projects/:id/management/validation
  async getApplications({ params }: HttpContext) {
    return await Participant.query()
      .where('project_id', params.id)
      .andWhere('accepted', false)
      .preload('contact')
      .preload('section')
      .preload('answers')
  }

  //validateParticipant : transforms the accepted field to true at /projects/:id/management/validation/:id
  async validateParticipant({ params, response }: HttpContext) {
    const { projectId, participantId } = params

    const participant = await Participant.query()
      .where('id', participantId)
      .andWhere('project_id', projectId)
      .first()

    if (!participant) return response.send("Couldn't find the participant")

    participant.accepted = true
    await participant.save()

    return response.send('Participant validated')
  }

  //delete : deletes a participant from the given project at /projects/:id/management/participants/:id
  async delete({ params, response }: HttpContext) {
    const { projectId, participantId } = params
    const participant = await Participant.query()
      .where('id', participantId)
      .andWhere('project_id', projectId)
      .first()

    if (!participant) {
      return response.send("Can't find this participant in this project")
    }

    await participant.delete()
    return response.send('Participant deleted from the project')
  }

  // public async getAttendants({params} : HttpContext) {
  //   return await Participant.query()
  //     .select('participants.*', 'participates_ins.rehearsal_id')
  //     .innerJoin('participates_ins', 'participants.id', 'participates_ins.participant_id')
  //     .innerJoin('rehearsals', 'rehearsals.id', 'participates_ins.rehearsal_id')
  //     .where('rehearsals.project_id', params.id);
  // }
}
