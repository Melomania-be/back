import { HttpContext } from '@adonisjs/core/http'
import ContractorContact from '#models/contractor_contact'
import { createContractorValidator } from '#validators/contractor'


export default class ContractorsController {
  async getAll() {
    return await ContractorContact.query()
      .preload('company')
      .preload('categories')
  }

  async getOne({ params }: HttpContext) {
    return await ContractorContact.query()
      .where('id', params.id)
      .preload('company')
      .preload('categories')
      .firstOrFail()
  }

  async create({ request }: HttpContext) {
    const data = await request.validateUsing(createContractorValidator)

    const contractor = await ContractorContact.create({
      first_name: data.first_name,
      last_name: data.last_name,
      email_1: data.email_1,
      email_2: data.email_2,
      email_3: data.email_3,
      phone_1: data.phone_1,
      phone_2: data.phone_2,
      phone_3: data.phone_3,
      comments: data.comments,
      organization_id: data.organization_id,
    })

    if (data.category_ids?.length) {
      await contractor.related('categories').sync(data.category_ids)
    }

    return contractor
  }

  async update({ params, request }: HttpContext) {
    const contractor = await ContractorContact.findOrFail(params.id)

    const data = await request.validateUsing(createContractorValidator)

    contractor.merge({
      first_name: data.first_name,
      last_name: data.last_name,
      email_1: data.email_1,
      email_2: data.email_2,
      email_3: data.email_3,
      phone_1: data.phone_1,
      phone_2: data.phone_2,
      phone_3: data.phone_3,
      comments: data.comments,
      organization_id: data.organization_id,
    })

    await contractor.save()

    if (data.category_ids) {
      await contractor.related('categories').sync(data.category_ids)
    }

    return contractor
  }

  async delete({ params }: HttpContext) {
    const contractor = await ContractorContact.findOrFail(params.id)

    await contractor.delete()

    return {
      success: true,
    }
  }
}