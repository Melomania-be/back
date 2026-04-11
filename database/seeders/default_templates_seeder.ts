import MailTemplate from '#models/mail_template'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    // Only seed the Audition Request template (new feature)
    // Other system templates already exist in production
    // Uses {VAR} syntax (AuditionRequest class)
    await MailTemplate.firstOrCreate(
      { name: 'Audition Request' },
      {
        name: 'Audition Request',
        content: '<h2>Audition Request</h2>\n<p>Dear <strong>{NAME}</strong>,</p>\n<p>Your application for the project <strong>{PROJECT}</strong> has caught our attention.</p>\n<p>We would like to invite you to take an audition.</p>\n<h3>Instructions:</h3>\n<div>{AUDITION_INSTRUCTIONS}</div>\n{ATTACHMENTS_SECTION}\n{DEADLINE_BLOCK}\n<p style="text-align: center;">\n  <a href="{REGISTRATION}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Access Audition Portal</a>\n</p>\n<p>Good luck!</p>\n<div>{TO_CONTACT}</div>',
        is_default: true,
      }
    )

    console.log('✅ Audition Request template checked (existing one preserved)')
  }
}
