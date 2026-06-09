import ContractorCategory from '#models/contractor_category'

export default class ContractorCategoriesController {
  async getAll() {
    return await ContractorCategory.query()
  }
}