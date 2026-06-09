import Organization from '#models/organization'

export default class OrganizationsController {
  async getAll() {
    return await Organization.query()
  }
}