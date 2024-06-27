import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'

export default class CallsheetNotification extends BaseMail {
  from = env.get('SMTP_USERNAME')
  subject = 'New information about '

  /**
   * The "prepare" method is called automatically when
   * the email is sent or queued.
   */
  prepare() {
    this.message.to('user@example.com')
  }
}
