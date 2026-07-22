import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class OrganizationMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user

    if (!user) {
      return ctx.response.unauthorized({ message: 'User not authenticated' })
    }

    // Allow users without an organization to proceed during migration
    // organizationId will be null and controllers will return all data unfiltered
    await next()
  }
}