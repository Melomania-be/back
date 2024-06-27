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
