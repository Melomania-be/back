import { DateTime } from 'luxon'
import { BaseModel, column, hasOne } from '@adonisjs/lucid/orm'
import Contact from './contact.js'
import Project from './project.js'
import MailTemplate from './mail_template.js'
import type { HasOne } from '@adonisjs/lucid/types/relations'

export default class OutgoingMail extends BaseModel {
  @column({ isPrimary: true })
  declare id: number | null

  @column()
  declare type: string

  /*
  @hasOne(() => Contact)
  declare receiver_id: HasOne<typeof Contact>
  
  @hasOne(() => Project)
  declare project_id: HasOne<typeof Project>

  @hasOne(() => MailTemplate)
  declare template_id: HasOne<typeof MailTemplate>

  */
  @column()
  declare receiver_id: number

  @column()
  declare project_id: number

  @column()
  declare template_id: number

  @column()
  declare sent : boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
