import type { HttpContext } from '@adonisjs/core/http'

import ContractorParticipant from '#models/contractor_participant'

export default class ContractorParticipantsController {
  async getByProject({ params }: HttpContext) {
    return await ContractorParticipant.query()
      .where('project_id', params.projectId)
      .preload('contractor')
      .orderBy('id', 'desc')
  }

  async create({ request }: HttpContext) {
    const data = request.only(['project_id', 'contractor_contact_id'])

    return await ContractorParticipant.create({
      projectId: data.project_id,
      contractorContactId: data.contractor_contact_id,
    })
  }

  async delete({ params }: HttpContext) {
    const participant = await ContractorParticipant.findOrFail(params.id)

    await participant.delete()

    return {
      success: true,
    }
  }
}
