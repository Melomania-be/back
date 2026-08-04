import Company from '#models/company'
import type { HttpContext } from '@adonisjs/core/http'
import { createCompanyValidator } from '#validators/company'

export default class CompaniesController {
  async getAll({}: HttpContext) {
    return await Company.all()
  }

  async create({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(createCompanyValidator)

      const company = await Company.create(payload)

      return response.created(company)
    } catch (error: any) {
      if (error.code === '23505') {
        return response.conflict({
          message: 'Company already exists',
        })
      }

      throw error
    }
  }

  async update({ params, request, response }: HttpContext) {
    try {
      const company = await Company.findOrFail(params.id)

      const payload = await request.validateUsing(createCompanyValidator)

      company.merge(payload)

      await company.save()

      return company
    } catch (error: any) {
      if (error.code === '23505') {
        return response.conflict({
          message: 'Company already exists',
        })
      }

      throw error
    }
  }

  async delete({ params, response }: HttpContext) {
    try {
      const company = await Company.findOrFail(params.id)

      await company.delete()

      return response.ok({
        message: 'Company deleted',
      })
    } catch (error: any) {
      if (error.code === '23503') {
        return response.conflict({
          message: 'Cannot delete company because it is assigned to one or more contractors.',
        })
      }

      throw error
    }
  }
}