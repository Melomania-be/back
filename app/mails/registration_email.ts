import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import MailTemplate from '#models/mail_template'
import Project from '#models/project'
import Contact from '#models/contact'

export default class RegistrationEmail extends BaseMail {
  contact: {
    first_name: string
    last_name: string
    email: string
  }

  project: {
    id: number
    name: string
    events?: Array<{
      id: number
      type: 'concert' | 'rehearsal'
      start_date: string
      end_date: string | null
      place: string
      comment: string
    }>
    pieces?: Array<{
      id: number
      name: string
      composer: { name: string }
    }>
    contents?: Array<{
      title: string
      text: string
    }>
  }

  recruiter: {
    name: string
    email: string
  }

  subject: string

  constructor(
    contact: { first_name: string; last_name: string; email: string },
    project: { id: number; name: string },
    recruiter: { name: string; email: string },
    recommendedBy?: string
  ) {
    super()
    this.from = env.get('SMTP_USERNAME')
    this.contact = contact
    this.project = project
    this.recruiter = recruiter
    this.subject = `Invitation à rejoindre le projet "${project.name}"`
  }

  private getFrontendUrl(): string {
    const envUrl = env.get('FRONTEND_URL')
    const nodeEnv = env.get('NODE_ENV', 'development')
    const host = env.get('HOST', 'localhost')

    if (envUrl && !envUrl.includes('localhost') && envUrl.trim() !== '') {
      return envUrl
    }

    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      if (nodeEnv === 'development' || host.includes('universe.wf')) {
        return 'http://tool.sc1ciro3903.universe.wf'
      }

      const isProduction = nodeEnv === 'production'
      if (isProduction || host.includes('melomania.be')) {
        return 'https://tool.melomania.be'
      }

      const protocol = isProduction ? 'https' : 'http'
      return `${protocol}://${host}`
    }

    return 'http://localhost:5173'
  }

  private replaceTemplateVariables(htmlContent: string, variables: Record<string, string>): string {
    let result = htmlContent

    Object.entries(variables).forEach(([key, value]) => {
      const safeValue = (value || '').replace(/\$/g, '$$')

      const patterns = [
        new RegExp(`\\$\\{${key}\\}`, 'g'),
        new RegExp(`\\\\\\$\\{${key}\\}`, 'g'),
        new RegExp(`\\{${key}\\}`, 'g'),
      ]

      patterns.forEach((pattern) => {
        result = result.replace(pattern, safeValue)
      })
    })

    return result
  }

  private formatEvents(): string {
    const events = this.project.events || []

    if (events.length === 0) {
      return '<p style="color: #666;">No events scheduled.</p>'
    }

    return events
      .slice()
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .map((event) => {
        const eventDate = new Date(event.start_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        const eventTime = event.end_date
          ? `${new Date(event.start_date).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })} - ${new Date(event.end_date).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}`
          : new Date(event.start_date).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })

        const eventLabel = event.type === 'rehearsal' ? 'Rehearsal' : 'Concert'
        const background = event.type === 'rehearsal' ? '#e8f4ff' : '#f3e8ff'
        const borderColor = event.type === 'rehearsal' ? '#6b9ad9' : '#a584d2'

        return `<div style="padding: 15px; margin: 10px 0; background-color: ${background}; border-left: 4px solid ${borderColor};">
        <p style="margin: 5px 0; font-weight: bold;">${eventLabel} • ${eventDate}</p>
        <p style="margin: 5px 0; color: #555;">${eventTime}</p>
        <p style="margin: 5px 0; color: #555;">${event.place}</p>
        ${event.comment ? `<p style="margin: 5px 0; color: #555; font-size: 14px;">${event.comment}</p>` : ''}
      </div>`
      })
      .join('')
  }

  private formatProgram(): string {
    if (!this.project.pieces || this.project.pieces.length === 0) {
      return '<p style="color: #666;">No program information available.</p>'
    }

    return this.project.pieces
      .map(
        (piece) =>
          `<div style="padding: 12px; margin: 8px 0; background-color: #fffaf0; border-left: 3px solid #999;">
        <p style="margin: 5px 0; font-weight: bold;">${piece.composer?.name || 'Unknown Composer'}</p>
        <p style="margin: 5px 0; color: #666; font-size: 14px;">${piece.name}</p>
      </div>`
      )
      .join('')
  }

  private formatInformation(): string {
    if (!this.project.contents || this.project.contents.length === 0) {
      return '<p style="color: #666;">No project information available.</p>'
    }

    return this.project.contents
      .map(
        (content) =>
          `<div style="margin: 10px 0; padding: 15px; background-color: #f4f6f8; border: 1px solid #ddd; border-radius: 4px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #333;">${content.title}</h3>
        <p style="margin: 0; color: #555; line-height: 1.5;">${content.text}</p>
      </div>`
      )
      .join('')
  }

  private getDefaultTemplate(): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration - \${PROJECT}</title>
    <style>
        @media screen and (max-width: 600px) {
            .container { width: 100% !important; margin: 10px auto !important; padding: 15px !important; }
            .button { display: block !important; width: 100% !important; margin: 10px 0 !important; }
        }

        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }

        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border: 1px solid #ddd;
            border-radius: 5px;
            overflow: hidden;
        }

        .header {
            background-color: #ffffff;
            color: #333;
            padding: 30px;
            text-align: center;
            border-bottom: 2px solid #ddd;
        }

        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: normal;
            color: #333;
        }

        .content {
            padding: 30px;
        }

        .button {
            display: inline-block;
            padding: 12px 25px;
            background-color: #333;
            color: white;
            text-decoration: none;
            border-radius: 3px;
            font-weight: normal;
            margin: 8px 4px;
            font-size: 14px;
        }

        .button:hover {
            background-color: #555;
        }

        .button.secondary {
            background-color: #666;
        }

        .button.secondary:hover {
            background-color: #777;
        }

        .footer {
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
            background-color: #f9f9f9;
            border-top: 1px solid #ddd;
        }

        .project-highlight {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            margin: 20px 0;
            text-align: center;
        }

        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-top: 25px;
            margin-bottom: 15px;
            border-bottom: 2px solid #ddd;
            padding-bottom: 10px;
        }

        .signature {
            margin-top: 30px;
            padding: 15px;
            background-color: #f9f9f9;
            border-left: 3px solid #333;
        }

        .signature p {
            margin: 5px 0;
        }

        .signature .name {
            font-weight: bold;
            color: #333;
        }

        .signature .email {
            color: #333;
            text-decoration: none;
        }

        .divider {
            height: 1px;
            background-color: #ddd;
            margin: 25px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Music Project Registration Confirmation</h1>
        </div>

        <div class="content">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello \${NAME},</p>

            <p style="font-size: 15px; margin-bottom: 20px;">
                Details of the project are as follows :
            </p>

            <div class="project-highlight">
                <h2 style="color: #333; margin: 0; font-size: 22px; font-weight: bold;">
                    \${PROJECT}
                </h2>
            </div>

            <div class="divider"></div>

            <div class="section-title">Events</div>
            <div>
                \${EVENTS_HTML}
            </div>

            <div class="section-title">Program</div>
            <div>
                \${PROGRAM_HTML}
            </div>

            <div class="section-title">Information</div>
            <div>
                \${INFORMATION_HTML}
            </div>

            <div class="divider"></div>

            <p style="margin-bottom: 20px; font-size: 15px;">
                We would be delighted to count on your participation.
            </p>

            <p style="margin-bottom: 30px;">
                Kind Regards,
            </p>

            <div class="signature">
                <p class="name">\${COMPANY_NAME}</p>
                <p>
                    <a href="mailto:\${COMPANY_EMAIL}" class="email">
                        \${COMPANY_EMAIL}
                    </a>
                </p>
            </div>
        </div>

        <div class="footer">
            <p style="margin: 0 0 10px 0;">
                You are receiving this email because you have registered for the project "<strong>\${PROJECT}</strong>".
            </p>
            <p style="margin: 0;">
                <a href="\${UNSUBSCRIBE_URL}" style="color: #666; text-decoration: none;">
                   Unsubscribe
                </a>
            </p>
        </div>
    </div>
</body>
</html>`
  }

  async prepare() {
    try {
      const url = this.getFrontendUrl()

      let template = await MailTemplate.query().where('name', 'registration_email.html').first()

      if (!template) {
        template = await MailTemplate.query().where('name', 'default_registration.html').first()
      }

      let htmlContent = ''

      if (template) {
        htmlContent = template.content
      } else {
        htmlContent = this.getDefaultTemplate()
      }

      const eventsHtml = this.formatEvents()
      const programHtml = this.formatProgram()
      const informationHtml = this.formatInformation()

      const templateVariables = {
        URL: url,
        NAME: `${this.contact.first_name} ${this.contact.last_name}`,
        PROJECT: this.project.name,
        COMPANY_NAME: this.recruiter.name,
        COMPANY_EMAIL: this.recruiter.email,
        REGISTRATION_URL: `${url}/registration/${this.project.id}`,
        UNSUBSCRIBE_URL: `${url}/unsubscribe?email=${encodeURIComponent(this.contact.email)}&project=${this.project.id}`,
      }

      htmlContent = this.replaceTemplateVariables(htmlContent, templateVariables)

      // Replace HTML content directly to avoid escaping issues with $ signs
      htmlContent = htmlContent.replace(/\${EVENTS_HTML}/g, eventsHtml)
      htmlContent = htmlContent.replace(/\${PROGRAM_HTML}/g, programHtml)
      htmlContent = htmlContent.replace(/\${INFORMATION_HTML}/g, informationHtml)

      const fromAddress = env.get('MAIL_FROM_ADDRESS', env.get('SMTP_USERNAME'))

      this.message
        .to(this.contact.email)
        .from(`${this.recruiter.name} <${fromAddress}>`)
        .replyTo(this.recruiter.email)
        .subject(this.subject)
        .html(htmlContent)
    } catch (error) {
      throw error
    }
  }
}
