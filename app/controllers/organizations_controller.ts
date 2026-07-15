import Organization from '#models/organization'
import type { HttpContext } from '@adonisjs/core/http'

export default class OrganizationsController {
  async getAll({}: HttpContext) {
    return await Organization.all()
  }
}