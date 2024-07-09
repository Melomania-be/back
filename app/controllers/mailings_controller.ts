import Contact from '#models/contact'
import mail from '@adonisjs/mail/services/main'
import CallsheetNotification from '../mails/callsheet_notification.js'
import { HttpContext } from '@adonisjs/core/http'
import { mailCallsheetValidator } from '#validators/mail'

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



  async sendCallsheetNotification({ request, response } : HttpContext) {
    const { contact, project, callsheet, to_contact } = request.only([
      'contact',
      'project',
      'callsheet',
      'to_contact'
    ]);
  
    const callsheetNotificationMail = new CallsheetNotification(contact, project, callsheet, to_contact);
    await mail.send(callsheetNotificationMail.prepare.bind(callsheetNotificationMail));
  
    return response.json({ message: 'Email sent successfully' });
  }

}