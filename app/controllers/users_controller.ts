// import type { HttpContext } from '@adonisjs/core/http'

import { adminRights } from '#abilities/main'
import User from '#models/user'
import { userCreationValidator, userLoginValidator } from '#validators/user'
import { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'

export default class UsersController {
  async getAll() {
    const users = await User.query()

    const reworkedUsers = []

    for (const user of users) {
      const tokens = await User.accessTokens.all(user)

      const plainUser = user.serialize()

      let userWithoutPassword = { ...plainUser, password: 'hidden', token: tokens[0] }

      reworkedUsers.push(userWithoutPassword)
    }

    return reworkedUsers
  }


async me({ auth, response }: HttpContext) {
    try {
      // Authenticate the user using the 'api' guard (e.g., token-based auth)
      const user = await auth.use('api').authenticate()

      // Return a sanitized version of the user (e.g., without password hash)
      const userResponse = user.serialize()
      userResponse.password = 'hidden' // Ensure password hash is not sent to frontend

      return response.ok({ message: 'User details fetched successfully.', data: userResponse })
    } catch (error) {
      console.error('Error fetching current user details:', error)
      // If authentication fails (e.g., no token, invalid token), AdonisJS's global
      // exception handler will typically return a 401 Unauthorized.
      // For other unexpected errors, return a generic 500.
      if (error.code === 'E_UNAUTHORIZED_ACCESS') { // Specific AdonisJS auth error code
        return response.unauthorized({ message: 'Authentication required to access user details.' });
      }
      return response.internalServerError({ message: 'Failed to fetch user details.' })
    }
  }


  async getUsersForDropdown({ response }: HttpContext) {
    try {
      const users = await User.query().select('id', 'fullName').orderBy('fullName', 'asc')
      return response.ok(users)
    } catch (error) {
      console.error('Error fetching users for dropdown:', error)
      return response.internalServerError({ message: 'Failed to retrieve user list.' })
    }
  }
  

  async signIn(ctx: HttpContext) {
    const credentials = await ctx.request.validateUsing(userLoginValidator)
    const user = await User.verifyCredentials(credentials.email, credentials.password)
    const token = await User.accessTokens.create(user)
    return token
  }

  async signOut(ctx: HttpContext) {
    const user = await ctx.auth.use('api').authenticate()
    await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    return { revoked: true }
  }

  async create(ctx: HttpContext) {
    if (!ctx.auth.user) {
      ctx.response.abort('You must be authenticated to create a new user', 401)
    }

    if (await ctx.bouncer.denies(adminRights)) {
      ctx.response.abort('You cannot create a new user', 403)
    }

    const credentials = await ctx.request.validateUsing(userCreationValidator)
    const user = await User.findBy('email', credentials.email)

    if (user) {
      return ctx.response.badRequest({ message: 'User already exists' })
    }

    return await User.create(credentials)
  }

  async delete(ctx: HttpContext) {
    if (!ctx.auth.user) {
      ctx.response.abort('You must be authenticated to delete a user', 401)
    }

    if (await ctx.bouncer.denies(adminRights)) {
      ctx.response.abort('You cannot delete a user', 403)
    }

    const user = await User.find(ctx.params.id)

    if (!user) return

    if (user.email === env.get('ADMIN_EMAIL')) {
      return ctx.response.badRequest({ message: 'You cannot delete the super admin' })
    }

    user?.delete()
    return ctx.response.send('User deleted')
  }
}
