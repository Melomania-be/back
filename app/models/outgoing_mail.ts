import { DateTime } from 'luxon'
import { column } from '@adonisjs/lucid/orm'
import TenantModel from '#models/tenant_model'

export default class OutgoingMail extends TenantModel {
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

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
