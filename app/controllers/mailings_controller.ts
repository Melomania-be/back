import type { HttpContext } from '@adonisjs/core/http'
import mail from '@adonisjs/mail/services/main'

export default class MailingsController {
  async send(ctx: HttpContext) {
    console.log('send called')

    await mail.send((message) => {
      message
        .to('iemelian.rambeau@student.junia.com')
        .from('info@melomania.be')
        .subject('Verify your email address')
        .html('<p>Please verify your email address by clicking on the link below.</p>')
    })

    const listeMail: string[] = []

    for (const tmpMail of listeMail) {
      await mail.sendLater((message) => {
        message.to('').from('').subject('').html('')
      })
    }
  }
}
