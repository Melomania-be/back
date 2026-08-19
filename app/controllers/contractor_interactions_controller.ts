import { HttpContext } from '@adonisjs/core/http'
import ContractorInteraction from '#models/contractor_interaction'
import { createContractorInteractionValidator } from '#validators/contractor_interaction'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import { cuid } from '@adonisjs/core/helpers'
import fs from 'node:fs'
import path from 'node:path'

import File from '#models/file'
import ContractorInteractionFile from '#models/contractor_interaction_file'

export default class ContractorInteractionsController {
async getByContractor({ params }: HttpContext) {
  return await ContractorInteraction.query()
    .where('contractor_contact_id', params.contractorId)
    .preload('files', (query) => {
      query.preload('file')
    })
    .orderBy('interaction_date', 'desc')
}

  async upload({ params, request, response }: HttpContext) {
  const interaction = await ContractorInteraction.find(params.id)

  if (!interaction) {
    return response.notFound({
      message: 'Interaction not found',
    })
  }

const file = request.file('file')

  if (!file) {
    return response.badRequest({
      message: 'No file uploaded',
    })
  }

  await file.move(app.makePath('uploads'), {
    name: `${cuid()}.${file.extname}`,
  })

  const createdFile = await File.create({
    name: file.clientName,
    type: file.type,
    content: '',
    path: file.filePath,
    size: file.size || 0,
  })

  const interactionFile = await ContractorInteractionFile.create({
    contractorInteractionId: interaction.id,
    fileId: createdFile.id,
  })

  await interactionFile.load('file')

  return interactionFile
}

async download({ params, response }: HttpContext) {
    console.log('=== DOWNLOAD ===')
  console.log(params.filename)
  const filePath = path.join(app.makePath('uploads'), params.filename)
   console.log(filePath)
  console.log(fs.existsSync(filePath))

  if (!fs.existsSync(filePath)) {
    return response.notFound({
      message: 'File not found',
    })
  }

  return response.download(filePath)
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
