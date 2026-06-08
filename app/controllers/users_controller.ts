import User from '#models/user'
import { userCreationValidator, userLoginValidator, userUpdateValidator } from '#validators/user'
import { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'

export default class UsersController {
  async getAll({ bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    const users = await User.query()
    const reworkedUsers = []

    for (const user of users) {
      const plainUser = user.serialize()
      reworkedUsers.push({ ...plainUser })
    }
    return reworkedUsers
  }

  // Actions d'Authentification (sans Bouncer car c'est la porte d'entrée)
  async signIn(ctx: HttpContext) {
    const credentials = await ctx.request.validateUsing(userLoginValidator)
    const user = await User.verifyCredentials(credentials.email, credentials.password)
    return await User.accessTokens.create(user)
  }

  async signOut(ctx: HttpContext) {
    const user = await ctx.auth.use('api').authenticate()
    await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    return { revoked: true }
  }

  async getCurrentUser(ctx: HttpContext) {
    try {
      const user = await ctx.auth.use('api').authenticate()
      return ctx.response.json({ id: user.id, email: user.email, fullName: user.fullName || user.email || 'Utilisateur actuel' })
    } catch (error) {
      return ctx.response.status(401).json({ error: 'Not authenticated', fullName: 'Utilisateur actuel' })
    }
  }

  // Actions de Gestion Administrateur
  async create(ctx: HttpContext) {
    if (!ctx.auth.user) ctx.response.abort('You must be authenticated to create a new user', 401)
    await (ctx.bouncer as any).authorize('adminRights')

    const credentials = await ctx.request.validateUsing(userCreationValidator)
    const user = await User.findBy('email', credentials.email)
    if (user) return ctx.response.badRequest({ message: 'User already exists' })
    return await User.create(credentials)
  }

  async update(ctx: HttpContext) {
    if (!ctx.auth.user) ctx.response.abort('You must be authenticated to update a user', 401)
    await (ctx.bouncer as any).authorize('adminRights')

    const data = await ctx.request.validateUsing(userUpdateValidator)
    const user = await User.find(ctx.params.id)
    if (!user) return ctx.response.notFound({ message: 'User not found' })

    if (data.email && data.email !== user.email) {
      const existingUser = await User.findBy('email', data.email)
      if (existingUser && existingUser.id !== user.id) return ctx.response.badRequest({ message: 'Email already exists' })
    }

    await user.merge(data).save()
    return user.serialize()
  }

  async delete(ctx: HttpContext) {
    if (!ctx.auth.user) ctx.response.abort('You must be authenticated to delete a user', 401)
    await (ctx.bouncer as any).authorize('adminRights')

    const user = await User.find(ctx.params.id)
    if (!user) return
    if (user.email === env.get('ADMIN_EMAIL')) return ctx.response.badRequest({ message: 'You cannot delete the super admin' })

    user?.delete()
    return ctx.response.send('User deleted')
  }
}