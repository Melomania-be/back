import { DateTime } from 'luxon'
import { BaseModel, column, hasOne } from '@adonisjs/lucid/orm'

export default class OutgoingMail extends BaseModel {
  @column({ isPrimary: true })
  declare id: number | null

  @column()
  declare type: string

  @column()
  declare receiver_id: number

  @column()
  declare project_id: number | null

  @column()
  declare mail_template_id: number

  @column()
  declare sent: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
