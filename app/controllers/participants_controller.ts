import Participant from '#models/participant'
import { HttpContext } from '@adonisjs/core/http'
import { createParticipantValidator, validateParticipantValidator } from '#validators/participant'
import { simpleFilter } from 'adonisjs-filters'
import Section from '#models/section'
import RecruitmentContact from '#models/recruitment_contact'
import Contact from '#models/contact'

export default class ParticipantsController {
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
      [
        { relationColumns: ['first_name', 'last_name','email','phone','messenger'] as any, relationName: 'contact' },
        { relationColumns: ['name'] as any, relationName: 'section' }
      ]
    )
  }

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

    if (data.id) {
      participant.merge({ is_section_leader: data.is_section_leader })
    }

    await participant.save()

    return response.send('Participant created')
  }

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

  async validateParticipant({ request, response, auth }: HttpContext) {
    const data = await request.validateUsing(validateParticipantValidator)

    const participant = await Participant.query()
      .where('id', data.id)
      .andWhere('project_id', data.params.id)
      .preload('contact')
      .first()

    if (!participant) return response.send("Couldn't find the participant")

    participant.accepted = true
    await participant.save()

    if (participant.contact && participant.contact.id) {
      await this.addToRecruitmentIfNotExists(
        data.params.id,
        participant.contact,
        auth
      )
    }

    return response.send('Participant validated')
  }

  async delete({ params, response }: HttpContext) {
    const { id, participantId } = params

    const participant = await Participant.query()
      .where('id', participantId)
      .andWhere('project_id', id)
      .preload('contact')
      .first()

    if (!participant) {
      return response.send("Can't find this participant in this project")
    }

    if (participant.contact && participant.contact.id) {
      await this.updateRecruitmentStatusOnDeletion(id, participant.contact.id)
    }

    await participant.related('concerts').detach()
    await participant.related('rehearsals').detach()

    await participant.delete()

    return response.send('Participant deleted from the project')
  }

  async getParticipantsCountBySection(ctx: HttpContext) {
    const projectId = ctx.params.id

    const baseQuery = Participant.query()
      .where('project_id', projectId)
      .andWhere('accepted', true)
      .select('section_id')
      .count('id as participants_count')
      .groupBy('section_id')
      .preload('section', (query) => {
        query.select('id', 'name')
      })

    const counts = await baseQuery

    const result = counts.map((item) => ({
      section_id: item.section_id,
      section_name: item.section ? item.section.name : null,
      participants_count: Number(item.$extras.participants_count) || 0,
    }))

    return result
  }

  async getParticipantsAnswers({ params }: HttpContext) {
    const projectId = params.id

    const participants = await Participant.query()
      .where('project_id', projectId)
      .preload('answers')

    return participants
  }

  private async getCurrentUserName(auth: any): Promise<string> {
    try {
      const user = await auth.authenticate()
      return user.fullName || user.email || 'System'
    } catch (error) {
      return 'System'
    }
  }

  private async addToRecruitmentIfNotExists(projectId: number, contact: Contact, auth: any) {
    try {
      const existingRecruitment = await RecruitmentContact.query()
        .where('project_id', projectId)
        .where('contact_id', contact.id)
        .first()

      if (existingRecruitment) {
        if (existingRecruitment.status !== 'recruited') {
          await existingRecruitment.merge({ status: 'recruited' }).save()
        }
        return
      }

      const currentUserName = await this.getCurrentUserName(auth)

      await RecruitmentContact.create({
        project_id: projectId,
        contact_id: contact.id,
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || null,
        phone: contact.phone || null,
        messenger: contact.messenger || null,
        source: 'participant_validation',
        status: 'recruited',
        contact_method: 'manual',
        is_duplicate: false,
        contacted_by: currentUserName
      })

    } catch (error) {
      console.error('Error adding to recruitment:', error)
    }
  }

  private async updateRecruitmentStatusOnDeletion(projectId: number, contactId: number) {
    try {
      const recruitmentContact = await RecruitmentContact.query()
        .where('project_id', projectId)
        .where('contact_id', contactId)
        .first()

      if (recruitmentContact) {
        recruitmentContact.status = 'cancelled'
        await recruitmentContact.save()
        console.log(`Updated recruitment contact ${recruitmentContact.id} status to cancelled`)
      }
    } catch (error) {
      console.error('Error updating recruitment status on participant deletion:', error)
    }
  }
}
