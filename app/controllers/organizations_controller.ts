import Organization from '#models/organization'
import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'

import { createOrganizationValidator } from '#validators/organization'

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
	try {
		const payload = await request.validateUsing(createOrganizationValidator)

const organization = await Organization.create(payload)

		return response.created(organization);
	} catch (error) {
		if (error.code === '23505') {
			return response.conflict({
				message: 'Organization already exists'
			});
		}

		throw error;
	}
}
async update({ params, request, response }: HttpContext) {
	try {
		const organization = await Organization.findOrFail(params.id);

		const payload = await request.validateUsing(createOrganizationValidator)

organization.merge(payload)

		await organization.save();

		return organization;
	} catch (error) {
		if (error.code === '23505') {
			return response.conflict({
				message: 'Organization already exists'
			});
		}

		throw error;
	}
}

async delete({ params, response }: HttpContext) {
	try {
		const organization = await Organization.findOrFail(params.id);

		await organization.delete();

		return response.ok({
			message: 'Organization deleted'
		});
	} catch (error) {
		if (error.code === '23503') {
			return response.conflict({
				message: 'Cannot delete organization because it is assigned to one or more contractors.'
			});
		}

		throw error;
	}
}
}