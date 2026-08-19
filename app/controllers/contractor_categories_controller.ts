import ContractorCategory from '#models/contractor_category'
import type { HttpContext } from '@adonisjs/core/http'
import { createContractorCategoryValidator } from '#validators/contractor_category'

export default class ContractorCategoriesController {
  async getAll({}: HttpContext) {
    return await ContractorCategory.all()
  }

  async create({ request }: HttpContext) {

    const data = await request.validateUsing(createContractorCategoryValidator)

    return await ContractorCategory.create({
      name: data.name,
    })
  }

  async update({ params, request }: HttpContext) {
    const category = await ContractorCategory.findOrFail(params.id)

    const data = await request.validateUsing(createContractorCategoryValidator)

    category.merge({
      name: data.name,
    })

    await category.save()

    return category
  }

  async delete({ params }: HttpContext) {
    const category = await ContractorCategory.findOrFail(params.id)

    await category.delete()

    return {
      success: true,
    }
  }
}