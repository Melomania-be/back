import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Contact from './contact.js'
import MailTemplate from './mail_template.js'

export default class OutgoingMail extends BaseModel {
  @column({ isPrimary: true })
  declare id: number | null

  @column()
  declare type: string

  @column()
  declare receiver_id: number | null

  @column()
  declare project_id: number | null | undefined

  @column()
  declare mail_template_id: number | null

  @column()
  declare sent: boolean

  @belongsTo(() => Contact, {
    foreignKey: 'receiver_id',
  })
  declare receiver: BelongsTo<typeof Contact>

  @belongsTo(() => MailTemplate, {
    foreignKey: 'mail_template_id',
  })
  declare mailTemplate: BelongsTo<typeof MailTemplate>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
