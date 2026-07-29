import mail from '@adonisjs/mail/services/main'
import PasswordResetMail from '#mails/password_reset_mail'
import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import PasswordResetToken from '#models/password_reset_token'
import stringHelpers from '@adonisjs/core/helpers/string'
import { DateTime } from 'luxon'

export default class PasswordRecoveriesController {
  // 1. User submits their email to get a reset link
  async forgotPassword({ request, response }: HttpContext) {
    const email = request.input('email')
    const user = await User.findBy('email', email)

    // Security best practice: Always return the same message even if the user doesn't exist.
    // This prevents hackers from using this form to guess valid email addresses.
    if (!user) {
      return response.json({ message: 'If an account exists, a recovery email has been sent.' })
    }

    // Delete any old tokens the user might have requested before
    await PasswordResetToken.query().where('userId', user.id).delete()

    // Generate a secure random token (e.g., 64 characters long)
    const token = stringHelpers.generateRandom(64)

    // Save the token to the database, set to expire in 30 minutes
    await PasswordResetToken.create({
      userId: user.id,
      token: token,
      expiresAt: DateTime.now().plus({ minutes: 30 }),
    })

    const resetUrl = `${env.get('URL')}/reset-password?token=${token}`
    await mail.send(new PasswordResetMail({ email: user.email, resetUrl }))

    return response.json({ message: 'If an account exists, a recovery email has been sent.' })
  }

  // 2. User submits the token and their new password
  async resetPassword({ request, response }: HttpContext) {
    const newPassword = request.input('password')
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/

    if (!newPassword || !passwordRegex.test(newPassword)) {
      return response.status(422).send({
        message:
          'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.',
      })
    }

    const { token, newPassword } = request.only(['token', 'newPassword'])

    // Find the token in the database
    const resetRecord = await PasswordResetToken.findBy('token', token)

    if (!resetRecord) {
      return response.status(400).json({ message: 'Invalid or expired token.' })
    }

    // Check if the token has expired
    if (resetRecord.expiresAt < DateTime.now()) {
      await resetRecord.delete() // Clean up expired token
      return response.status(400).json({ message: 'Token has expired. Please request a new one.' })
    }

    // Find the user, update password, and save
    const user = await User.findOrFail(resetRecord.userId)
    user.password = newPassword
    await user.save() // AdonisJS will automatically hash the password because of the User model setup!

    // Delete the token so it can never be used again
    await resetRecord.delete()

    return response.json({ message: 'Password has been successfully reset. You can now log in.' })
  }
}
