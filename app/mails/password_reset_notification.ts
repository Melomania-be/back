import { BaseMail } from '@adonisjs/mail'
import env from '#start/env'

export default class PasswordResetMail extends BaseMail {
  email: string
  resetUrl: string

  constructor(payload: { email: string; resetUrl: string }) {
    super()
    this.email = payload.email
    this.resetUrl = payload.resetUrl
  }

  prepare() {
    const fromEmail = env.get('SMTP_USERNAME')

    this.message.to(this.email).from(`Melomania <${fromEmail}>`).subject('Password Reset Request')
      .html(`
        
          Melomania
          You requested a password reset. Click the button below to set a new password.
          Reset your password
          Or copy and paste this link:  ${this.resetUrl}
          This link expires in 30 minutes.
        
      `)
  }
}
