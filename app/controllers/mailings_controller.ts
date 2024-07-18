import Contact from '#models/contact'
import mail from '@adonisjs/mail/services/main'
import CallsheetNotification from '../mails/callsheet_notification.js'
import { HttpContext } from '@adonisjs/core/http'
import { createTemplateValidator, mailCallsheetValidator } from '#validators/mail'
import env from '#start/env'
import RegistrationNotification from '#mails/registration_notification'
import RecommendationNotification from '#mails/recommendation_notification'
import mail_template from '#models/mail_template'
import TemplatePreparation from '#mails/template_preparation'
import Callsheet from '#models/callsheet'
import List from '#models/list'
import OutgoingMail from '#models/outgoing_mail'
import { DateTime } from 'luxon'


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

  async sendLaterTemplateToList({ request, response } : HttpContext) {
    const {template, list_contacts, project, to_contact } = request.only([
      'template',
      'list_contacts',
      'project',
      'to_contact'
    ]);

    let template_db = await mail_template.find(template.id)
    let list_db = await List.find(list_contacts.id)
    let htmlFromDb = template_db?.content || ''
    let project_db = await project.find(project.id)
    let callsheet = await Callsheet.find(project_db.callsheet_id)
    let registration_id = project_db.registration_id

    if (list_db != null) {
      for (let contact of list_db.contacts) {
        if (contact.email) {
          let contact_db = await Contact.find(contact.id)
          if (htmlFromDb != '' && callsheet != null && registration_id != null) {
            if (contact_db?.subscribed == true) {
              const registrationNotificationMail = new TemplatePreparation(htmlFromDb, subject, contact, project, callsheet, to_contact, registration_id);
              
              const outgoing_mail = new OutgoingMail();
              outgoing_mail.type = 'template';
              outgoing_mail.receiver_id = contact.id;
              outgoing_mail.project_id = project.id;
              outgoing_mail.template_id = template.id;
              outgoing_mail.sent = false;
              outgoing_mail.createdAt = DateTime.local();
              outgoing_mail.updatedAt = DateTime.local();

              await OutgoingMail.create(outgoing_mail)

              await mail.sendLater(registrationNotificationMail, async () => {
                outgoing_mail.sent = true;
                outgoing_mail.updatedAt = DateTime.local();
                await outgoing_mail.save();
              });
            }   
          }
        }
      }
    }
    else {
      return response.json({ message: 'List not found' });
    }

  }

  async sendTemplate({ request, response } : HttpContext) {
    const {template, subject, contact, project, to_contact } = request.only([
      'template',
      'subject',
      'contact',
      'project',
      'to_contact'
    ]);

    if (!contact.email) {
      return response.status(400).json({ message: 'Contact email is required' })
    }

    let contact_db = await Contact.find(contact.id)
    let template_db = await mail_template.find(template.id)
    let htmlFromDb = template_db?.content || ''
    let project_db = await project.find(project.id)
    let callsheet = await Callsheet.find(project_db.callsheet_id)
    let registration_id = project_db.registration_id    
    
    if (htmlFromDb != '' && callsheet != null && registration_id != null) {
      if (contact_db?.subscribed == true) {
        const registrationNotificationMail = new TemplatePreparation(htmlFromDb, subject, contact, project, callsheet, to_contact, registration_id);
        await mail.send(registrationNotificationMail);

      return response.json({ message: 'Email sent successfully' });
      }
      else {
        return response.json({ message: 'Contact is not subscribed' });
      }
    }
    else {
      return response.json({ message: 'Template not found or incomplete (callsheet not found or registration form not found)' });
    }
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

  async sendRecommendationNotification({ request, response } : HttpContext) {
    console.log('sendRecommendationNotification called')
    console.log(request.all())

    const { contact, registration, project } = request.only([
      'contact',
      'registration',
      'project'
    ]);

    if (!contact.email) {
      return response.status(400).json({ message: 'Contact email is required' })
    }

    const recommendationNotificationMail = new RecommendationNotification(contact, registration, project);
    await mail.send(recommendationNotificationMail);

    return response.json({ message: 'Email sent successfully' });
  }

  async sendRegistrationNotification({ request, response } : HttpContext) {
    console.log('sendRecommendationNotification called')

    const { contact, project, callsheet, to_contact } = request.only([
      'contact',
      'project',
      'callsheet',
      'to_contact'
    ]);

    if (!contact.email) {
      return response.status(400).json({ message: 'Contact email is required' })
    }

    const registrationNotificationMail = new RegistrationNotification(contact, project, callsheet, to_contact);
    await mail.send(registrationNotificationMail);

    return response.json({ message: 'Email sent successfully' });

    
  }

}