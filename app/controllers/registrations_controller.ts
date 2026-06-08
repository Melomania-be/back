import { HttpContext } from '@adonisjs/core/http'
import Registration from '#models/registration'
import { createRegistrationValidator, userRegistrationValidator } from '#validators/registration'
import Contact from '#models/contact'
import Participant from '#models/participant'
import Answer from '#models/answer'
import Project from '#models/project'
import ProjectPolicy from '#policies/project_policy'

export default class RegistrationsController {

  async getAll({ bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    return await Registration.query()
  }

  async getOne({ params, response, bouncer }: HttpContext) {
    const project = await Project.findOrFail(params.id)
    await bouncer.with(ProjectPolicy).authorize('view', project)

    const registration = await Registration.query()
      .whereHas('project', (q) => q.where('id', project.id))
      .preload('content')
      .preload('project', (pq) => {
        pq.preload('rehearsals', (rq) =>
          rq.preload('participants', (paq) => paq.pivotColumns(['comment'])) // CORRIGÉ : paq
        )
          .preload('concerts', (cq) =>
            cq.preload('participants', (paq) => paq.pivotColumns(['comment'])) // CORRIGÉ : paq
          )
          .preload('pieces', (piq) => piq.preload('composer'))
          .preload('sectionGroup', (sq) => sq.preload('sections'))
      })
      .preload('form')
      .first()

    if (!registration) return response.abort('Registration not found', 404)
    return registration
  }

  async createOrUpdate({ request, bouncer }: HttpContext) {
    const data = await request.validateUsing(createRegistrationValidator)
    const project = await Project.findOrFail(data.params.id)
    await bouncer.with(ProjectPolicy).authorize('update', project)

    let registration = await project.related('registration').query().first()
    if (registration) {
      await registration.related('content').query().delete()
      registration.related('content').createMany(data.content)
      for (const form of data.form) {
        if (form.id) await registration.related('form').query().where('id', form.id).update({ text: form.text, type: form.type })
        else await registration.related('form').create({ text: form.text, type: form.type })
      }
    } else {
      registration = await project.related('registration').create({})
      registration.related('content').createMany(data.content)
      registration.related('form').createMany(data.form)
    }
    return registration
  }

  async delete({ params, response, bouncer }: HttpContext) {
    const project = await Project.findOrFail(params.id)
    await bouncer.with(ProjectPolicy).authorize('update', project)

    const registration = await Registration.query().where('project_id', project.id).firstOrFail()
    await registration.delete()
    return response.send('Registration deleted')
  }

  async submit({ request, response }: HttpContext) {
    const data = await request.validateUsing(userRegistrationValidator)

    let contact = await Contact.firstOrCreate({ first_name: data.first_name, last_name: data.last_name, email: data.email }, { phone: data.phone, messenger: data.messenger, validated: false })
    let participant = await Participant.firstOrCreate({ contact_id: contact.id, project_id: data.project_id }, { section_id: data.section_id, accepted: false, last_activity: new Date() })

    const rehearsalsWithComments = data.rehearsals.reduce((acc, r) => { acc[r.id] = { comment: r.comment ?? '' }; return acc }, {} as Record<number, { comment: string }>)
    await participant.related('rehearsals').sync(rehearsalsWithComments)

    const concertsWithComments = data.concerts.reduce((acc, c) => { acc[c.id] = { comment: c.comment ?? '' }; return acc }, {} as Record<number, { comment: string }>)
    await participant.related('concerts').sync(concertsWithComments)

    if (data.answers.length > 0) {
      const answer = await Answer.createMany(data.answers.map((a) => ({ text: a.text ?? '', form_id: a.form_id, participant_id: participant.id })))
      return response.json({ success: true, participant, answer })
    }
    return response.json({ success: true, participant })
  }
}
