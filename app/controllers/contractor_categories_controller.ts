import ContractorCategory from '#models/contractor_category'
import type { HttpContext } from '@adonisjs/core/http'

export default class ContractorCategoriesController {
  async getAll({}: HttpContext) {
    return await ContractorCategory.all()
  }
}