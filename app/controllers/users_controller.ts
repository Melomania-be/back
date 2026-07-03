// app/controllers/users_controller.ts - Version avec rate limiting V-07
import { adminRights } from '#abilities/main'
import User from '#models/user'
import { userCreationValidator, userLoginValidator, userUpdateValidator } from '#validators/user'
import { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'

// ✅ CORRECTION V-07 : Stockage en mémoire des tentatives de connexion par IP
// Structure : IP -> { count, firstAttempt, blockedUntil? }
const loginAttempts = new Map<string, {
  count: number
  firstAttempt: number
  blockedUntil?: number
}>()

const RATE_LIMIT = {
  maxAttempts: 5,                    // max tentatives avant 429
  windowMs: 60 * 1000,              // fenêtre glissante de 1 minute
  blockDurationMs: 15 * 60 * 1000,  // blocage 15 min après 10 échecs
  hardBlockAfter: 10,               // échecs avant blocage dur
}

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
    const ip = ctx.request.ip()
    const now = Date.now()

    // ✅ Récupérer ou initialiser le compteur pour cette IP
    let record = loginAttempts.get(ip) ?? { count: 0, firstAttempt: now }

    // ✅ Vérifier si l'IP est bloquée pendant 15 minutes (après 10 échecs)
    if (record.blockedUntil && now < record.blockedUntil) {
      const remainingMinutes = Math.ceil((record.blockedUntil - now) / 60000)
      ctx.logger.warn(
        { event: 'AUTH_BLOCKED', ip },
        `IP bloquée — ${remainingMinutes} minute(s) restante(s)`
      )
      return ctx.response.tooManyRequests({
        error: `Trop de tentatives. Compte bloqué. Réessayez dans ${remainingMinutes} minute(s).`,
      })
    }

    // ✅ Réinitialiser le compteur si la fenêtre de 1 minute est expirée
    if (now - record.firstAttempt > RATE_LIMIT.windowMs) {
      record = { count: 0, firstAttempt: now }
    }

    // ✅ Bloquer si plus de 5 tentatives dans la fenêtre d'1 minute
    if (record.count >= RATE_LIMIT.maxAttempts) {
      // Blocage dur de 15 min si 10 échecs cumulés
      if (record.count >= RATE_LIMIT.hardBlockAfter) {
        record.blockedUntil = now + RATE_LIMIT.blockDurationMs
      }
      loginAttempts.set(ip, record)
      ctx.logger.warn(
        { event: 'AUTH_RATE_LIMITED', ip, attempts: record.count },
        `Rate limit atteint pour ${ip} — ${record.count} tentatives`
      )
      return ctx.response.tooManyRequests({
        error: 'Trop de tentatives de connexion. Attendez 1 minute avant de réessayer.',
      })
    }

    try {
      const credentials = await ctx.request.validateUsing(userLoginValidator)
      const user = await User.verifyCredentials(credentials.email, credentials.password)
      const token = await User.accessTokens.create(user)

      // ✅ Connexion réussie : réinitialiser le compteur pour cette IP
      loginAttempts.delete(ip)

      return token

    } catch (error) {
      // ✅ Échec : incrémenter le compteur et logger l'événement de sécurité
      record.count += 1
      loginAttempts.set(ip, record)

      ctx.logger.warn({
        event: 'AUTH_FAILURE',
        ip,
        attempts: record.count,
        maxAttempts: RATE_LIMIT.maxAttempts,
        email: ctx.request.body()?.email ?? 'unknown',
      }, `Échec connexion depuis ${ip} — tentative ${record.count}/${RATE_LIMIT.maxAttempts}`)

      throw error
    }
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

  async update(ctx: HttpContext) {
    if (!ctx.auth.user) {
      ctx.response.abort('You must be authenticated to update a user', 401)
    }

    if (await ctx.bouncer.denies(adminRights)) {
      ctx.response.abort('You cannot update a user', 403)
    }

    const data = await ctx.request.validateUsing(userUpdateValidator)
    const user = await User.find(ctx.params.id)

    if (!user) {
      return ctx.response.notFound({ message: 'User not found' })
    }

    if (data.email && data.email !== user.email) {
      const existingUser = await User.findBy('email', data.email)
      if (existingUser && existingUser.id !== user.id) {
        return ctx.response.badRequest({ message: 'Email already exists' })
      }
    }

    await user.merge(data).save()
    return user.serialize()
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

  async getCurrentUser(ctx: HttpContext) {
    try {
      const user = await ctx.auth.use('api').authenticate()
      return ctx.response.json({
        id: user.id,
        email: user.email,
        fullName: user.fullName || user.email || 'Utilisateur actuel'
      })
    } catch (error) {
      return ctx.response.status(401).json({
        error: 'Not authenticated',
        fullName: 'Utilisateur actuel'
      })
    }
  }
}
