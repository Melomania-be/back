import { HttpContext } from '@adonisjs/core/http'
import ContractorInteraction from '#models/contractor_interaction'
import { createContractorInteractionValidator } from '#validators/contractor_interaction'
import { DateTime } from 'luxon'

export default class ContractorInteractionsController {
  async getByContractor({ params }: HttpContext) {
    return await ContractorInteraction.query()
      .where('contractor_contact_id', params.contractorId)
      .orderBy('interaction_date', 'desc')
  }

  async create({ request }: HttpContext) {
    const data = await request.validateUsing(
      createContractorInteractionValidator
    )

    return await ContractorInteraction.create({
      contractorContactId: data.contractor_contact_id,
      interactionDate: DateTime.fromJSDate(data.interaction_date),
      description: data.description,
    })
  }

  async update({ params, request }: HttpContext) {
    const interaction = await ContractorInteraction.findOrFail(params.id)

    const data = await request.validateUsing(
      createContractorInteractionValidator
    )

    interaction.merge({
      contractorContactId: data.contractor_contact_id,
      interactionDate: DateTime.fromJSDate(data.interaction_date),
      description: data.description,
    })

    await interaction.save()

    return interaction
  }

  async delete({ params }: HttpContext) {
    const interaction = await ContractorInteraction.findOrFail(params.id)

    await interaction.delete()

    return {
      success: true,
    }
  }
}