import { BaseMail } from '@adonisjs/mail'
import env from '#start/env'

export default class PasswordResetNotification extends BaseMail {
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
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
          <h2 style="color: #4F46E5;">Melomania</h2>
          <p>You requested a password reset. Click the button or link below to set a new password.</p>
          
          <p style="margin: 24px 0;">
            <a href="${this.resetUrl}" target="_blank" style="background-color: #4F46E5; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
              Reset your password
            </a>
          </p>

          <p>Or copy and paste this link into your browser:</p>
          <p><a href="${this.resetUrl}" target="_blank">${this.resetUrl}</a></p>
          
          <p style="color: #666; font-size: 0.9em; margin-top: 24px;">This link expires in 30 minutes.</p>
        </div>
      `)
  }
}
