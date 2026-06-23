import { DateTime } from 'luxon'
import { column } from '@adonisjs/lucid/orm'
import TenantModel from '#models/tenant_model'

export default class Save extends TenantModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare variable: string

  @column()
  declare value: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
