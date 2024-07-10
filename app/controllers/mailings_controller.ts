import Contact from '#models/contact'
import mail from '@adonisjs/mail/services/main'
import CallsheetNotification from '../mails/callsheet_notification.js'
import { HttpContext } from '@adonisjs/core/http'
import { mailCallsheetValidator } from '#validators/mail'
import env from '#start/env'
import RegistrationNotification from '#mails/recommendation_notification'


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
    console.log('sendCallsheetNotification called')
    console.log(request.all())


    const { contact, project, callsheet, to_contact } = request.only([
      'contact',
      'project',
      'callsheet',
      'to_contact'
    ]);

    if (!contact.email) {
      return response.status(400).json({ message: 'Contact email is required' })
    }
  
    const callsheetNotificationMail = new CallsheetNotification(contact, project, callsheet, to_contact);
    await mail.send(callsheetNotificationMail)  ;
  
    return response.json({ message: 'Email sent successfully' });
  }

  async sendRegistrationNotification({ request, response } : HttpContext) {
    console.log('sendRegistrationNotification called')
    console.log(request.all())

    const { contact, registration, project } = request.only([
      'contact',
      'registration',
      'project'
    ]);

    if (!contact.email) {
      return response.status(400).json({ message: 'Contact email is required' })
    }

    const registrationNotificationMail = new RegistrationNotification(contact, registration, project);
    await mail.send(registrationNotificationMail);

    return response.json({ message: 'Email sent successfully' });
  }

}