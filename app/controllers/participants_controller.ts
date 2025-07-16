// import type { HttpContext } from '@adonisjs/core/http'

import Participant from '#models/participant'
import { HttpContext } from '@adonisjs/core/http'
import { createParticipantValidator, validateParticipantValidator } from '#validators/participant'
import { simpleFilter } from 'adonisjs-filters'
import Section from '#models/section'

export default class ParticipantsController {
  //getAll : gets list of all of the (accepted) participants of this project at /projects/:id/management/participants
  async getAll(ctx: HttpContext) {
    const baseQuery = Participant.query()
      .preload('contact')
      .preload('section')
      .preload('concerts', (concertsQuery) => {
        concertsQuery.pivotColumns(['comment'])
      })
      .preload('rehearsals', (rehearsalsQuery) => {
        rehearsalsQuery.pivotColumns(['comment'])
      })
      .where('project_id', ctx.params.id)
      .andWhere('accepted', true)

    return await simpleFilter(
      ctx,
      baseQuery,
      ['contact_id'],
      [{ relationColumns: ['first_name', 'last_name','email','phone','messenger'] as any, relationName: 'contact' },
      { relationColumns: ['name'] as any, relationName: 'section' }]
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
      .preload('concerts', (concertsQuery) => {
        concertsQuery.pivotColumns(['comment'])
      })
      .preload('rehearsals', (rehearsalsQuery) => {
        rehearsalsQuery.pivotColumns(['comment'])
      })
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
          is_section_leader: data.is_section_leader,
        })
    }

    await participant.related('section').dissociate()

    const section = await Section.findOrFail(data.section.id)

    await participant.related('section').associate(section)

    await participant.related('answers').query().delete()

    await participant.related('answers').createMany(
      data.answers.map((answers) => ({
        text: answers.text ? answers.text : '',
        form_id: answers.formId,
      }))
    )

    if (data.concerts) {
      let toSync = Object.assign(
        {},
        ...data.concerts.map((concert) => {
          return {
            [concert.id]: {
              comment: concert.pivot_comment,
            },
          }
        })
      )

      await participant.related('concerts').sync(toSync)
    }

    if (data.rehearsals) {
      let toSync = Object.assign(
        {},
        ...data.rehearsals.map((rehearsal) => {
          return {
            [rehearsal.id]: {
              comment: rehearsal.pivot_comment,
            },
          }
        })
      )

      await participant.related('rehearsals').sync(toSync)
    }

    // Update is_section_leader
    if (data.id) {
      participant.merge({ is_section_leader: data.is_section_leader })
    }

    await participant.save()

    return response.send('Participant created')
  }

  //getApplications : gets list of all contacts that want to be participants at /projects/:id/management/validation
  // Modifier la méthode getApplications pour inclure les auditions :
  async getApplications({ params }: HttpContext) {
    return await Participant.query()
      .where('project_id', params.id)
      .andWhere('accepted', false)
      .preload('contact')
      .preload('section')
      .preload('answers', (query) => query.preload('form'))
      .preload('concerts', (concertsQuery) => {
        concertsQuery.pivotColumns(['comment'])
      })
      .preload('rehearsals', (rehearsalsQuery) => {
        rehearsalsQuery.pivotColumns(['comment'])
      })
      .preload('auditions', (auditionQuery) => {
        auditionQuery.preload('files', (fileQuery) => {
          fileQuery.preload('file')
        })
      })
  }
  // Ajouter cette nouvelle méthode pour gérer l'affichage des auditions dans la validation :
  async getParticipantWithAuditions({ params }: HttpContext) {
    const { id, participantId } = params
    return await Participant.query()
      .where('id', participantId)
      .andWhere('project_id', id)
      .preload('contact')
      .preload('section')
      .preload('answers')
      .preload('concerts', (concertsQuery) => {
        concertsQuery.pivotColumns(['comment'])
      })
      .preload('rehearsals', (rehearsalsQuery) => {
        rehearsalsQuery.pivotColumns(['comment'])
      })
      .preload('project')
      .preload('auditions', (auditionQuery) => {
        auditionQuery
          .preload('files', (fileQuery) => {
            fileQuery.preload('file')
          })
          .orderBy('created_at', 'desc')
      })
      .first()
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

    await participant.related('concerts').detach()
    await participant.related('rehearsals').detach()

    await participant.delete()

    return response.send('Participant deleted from the project')
  }

  async getParticipantsCountBySection(ctx: HttpContext) {
    const projectId = ctx.params.id;

    // On construit la requête sur Participant
    const baseQuery = Participant.query()
      .where('project_id', projectId)
      .andWhere('accepted', true)
      .select('section_id')
      .count('id as participants_count')
      .groupBy('section_id')
      .preload('section', (query) => {
        query.select('id', 'name');
      });

    const counts = await baseQuery;

    // On mappe le résultat pour ne garder que l'essentiel
    const result = counts.map((item) => ({
      section_id: item.section_id,
      section_name: item.section ? item.section.name : null,
      participants_count: Number(item.$extras.participants_count) || 0,
    }));

    return result;
  }


  //get all the participants answers for a project
  async getParticipantsAnswers({ params }: HttpContext) {
    const projectId = params.id;

    // On récupère tous les participants du projet avec leurs réponses preloadées
    const participants = await Participant.query()
      .where('project_id', projectId)
      .preload('answers')   // preload les réponses de chaque participant

    return participants;
  }

}
