import { DateTime } from 'luxon'
import { column } from '@adonisjs/lucid/orm'
import TenantModel from '#models/tenant_model'

export default class MailTemplate extends TenantModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare content: string

  @column()
  declare is_default: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
