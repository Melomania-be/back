import mail from '@adonisjs/mail/services/main'
import PasswordResetNotification from '#mails/password_reset_notification'
import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import PasswordResetToken from '#models/password_reset_token'
import stringHelpers from '@adonisjs/core/helpers/string'
import { DateTime } from 'luxon'

export default class PasswordRecoveriesController {
  async forgotPassword({ request, response }: HttpContext) {
    const email = request.input('email')
    const user = await User.findBy('email', email)
    if (!user) {
      return response.json({ message: 'If an account exists, a recovery email has been sent.' })
    }
    await PasswordResetToken.query().where('userId', user.id).delete()
    const token = stringHelpers.generateRandom(64)
    await PasswordResetToken.create({
      userId: user.id,
      token: token,
      expiresAt: DateTime.now().plus({ minutes: 30 }),
    })
    const resetUrl = `${env.get('FRONTEND_URL')}/reset-password?token=${token}`
    await mail.send(new PasswordResetNotification({ email: user.email, resetUrl }))

    return response.json({ message: 'If an account exists, a recovery email has been sent.' })
  }

  async resetPassword({ request, response }: HttpContext) {
    const plainPassword = request.input('password')
    const token = request.input('token')
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/

    if (!plainPassword || !passwordRegex.test(plainPassword)) {
      return response.status(422).send({
        message:
          'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.',
      })
    }

    // Find the token in the database
    const resetRecord = await PasswordResetToken.findBy('token', token)

    if (!resetRecord) {
      return response.status(400).json({ message: 'Invalid or expired token.' })
    }

    if (resetRecord.expiresAt < DateTime.now()) {
      await resetRecord.delete() // Clean up expired token
      return response.status(400).json({ message: 'Token has expired. Please request a new one.' })
    }

    const user = await User.findOrFail(resetRecord.userId)

    user.password = plainPassword
    await user.save()

    await resetRecord.delete()

    return response.json({ message: 'Password has been successfully reset. You can now log in.' })
  }
}
