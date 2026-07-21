import Organization from '#models/organization'
import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'

export default class OrganizationsController {
  async getAll({}: HttpContext) {
    return await Organization.all()

  }

  async create({ request, response }: HttpContext) {
    const { name, admin_email, admin_password, admin_full_name } = request.only([
      'name',
      'admin_email',
      'admin_password',
      'admin_full_name',
    ])

    if (!name) {
      return response.status(400).json({ error: 'Organization name is required' })
    }

    if (!admin_email || !admin_password) {
      return response.status(400).json({ error: 'Admin email and password are required' })
    }

    const existingOrg = await Organization.findBy('name', name)
    if (existingOrg) {
      return response.status(400).json({ error: 'An organization with this name already exists' })
    }

    const existingUser = await User.findBy('email', admin_email)
    if (existingUser) {
      return response.status(400).json({ error: 'A user with this email already exists' })
    }

    const organization = await Organization.create({ name })

    const adminUser = await User.create({
      fullName: admin_full_name || null,
      email: admin_email,
      password: await hash.make(admin_password),
      organizationId: organization.id,
    })

    return response.status(201).json({
      organization: organization.serialize(),
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        fullName: adminUser.fullName,
        organizationId: adminUser.organizationId,
      },
    })
  }
     async create({ request, response }: HttpContext) {
    const organization = await Organization.create({
      name: request.input('name')
    })

    return response.created(organization)
  }
}