import Contact from '#models/contact'
import mail from '@adonisjs/mail/services/main'
import CallsheetNotification from '../mails/callsheet_notification.js'
import { HttpContext } from '@adonisjs/core/http'

//CE FICHIER EST POPO

export default class MailingsController {
  async send() {
    console.log('send called')

    await mail.send((message) => {
      message
        .to('')
        .from('info@melomania.be')
        .subject('Verify your email address')
        .html('<p>Please verify your email address by clicking on the link below.</p>')
    })
  }

  async sendCallsheetNotification({params, response} : HttpContext) {
    let email = params.email
    let contact = params.contact
    let project = params.project
    let callsheet = params.callsheet
    let to_contact = params.to_contact
      
    const notificationMail = new CallsheetNotification(email, contact, project, callsheet, to_contact)

    await mail.send(notificationMail.prepare.bind(notificationMail))

    return response.json({ message: 'Email sent successfully' })
  }

}