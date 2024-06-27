// import type { HttpContext } from '@adonisjs/core/http'

import Participant from '#models/participant'
import { HttpContext } from '@adonisjs/core/http'
import { createParticipantValidator } from '#validators/participant'

export default class ParticipantsController {
  //getAll : gets list of all of the (accepted) participants of this project at /projects/:id/management/participants
  async getAll({ params }: HttpContext) {
    return await Participant.query().where('project_id', params.id).andWhere('accepted', true)
  }

  //create : posts a participant in a given project at /projects/:id/management/participants/link
  async create(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createParticipantValidator)
    const existingParticipant = await Participant.query()
      .where('contact', data.contact)
      .andWhere('project', data.project)
      .first()

    if (existingParticipant) {
      return ctx.response
        .status(400)
        .send({ message: 'This participant is already associated with this project.' })
    }

    return await Participant.create(data)
  }

  //unlinkParticipant : transforms the accepted field to true at /projects/:id/management/validation/:id
  async unlinkParticipant({ params, response }: HttpContext) {
    const { projectId, participantId } = params

    const participant = await Participant.query()
      .where('id', participantId)
      .andWhere('project_id', projectId)
      .first()

    if (!participant) return response.send("Couldn't find the participant")

    participant.accepted = false
    await participant.save()

    return response.send('Participant validated')
  }

  //getOne : gets a participant at /projects/:id/management/participants/unique/:id
  async getOne({ params }: HttpContext) {
    const { projectId, participantId } = params
    return await Participant.query()
      .where('id', participantId)
      .andWhere('project_id', projectId)
      .preload('contact')
      .preload('section')
      .preload('answer')
      .first()
  }

  //modify : patch a participant at /projects/:id/management/participants/unique/:id
  async modify({ params, request, response }: HttpContext) {
    const { projectId, participantId } = params
    const data = await request.validateUsing(createParticipantValidator)

    const participant = await Participant.query()
      .where('id', participantId)
      .andWhere('project_id', projectId)
      .first()

    if (!participant) {
      return response.send('Participant not found')
    }

    await participant.merge(data).save()

    return response.send('Participant modified : ' + participant)
  }

  //getApplications : gets list of all contacts that want to be participants at /projects/:id/management/validation
  async getApplications({ params }: HttpContext) {
    return await Participant.query()
      .where('project_id', params.id)
      .andWhere('accepted', false)
      .preload('contact')
      .preload('section')
      .preload('answer')
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
