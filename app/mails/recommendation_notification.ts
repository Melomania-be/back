import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'

//demande de participation au projet => mail registration

export default class RegistrationNotification extends BaseMail {
  from = ''
  subject = ''

  /**
   * The "prepare" method is called automatically when
   * the email is sent or queued.
   */
  prepare() {
    this.message.to('user@example.com')
  }
}