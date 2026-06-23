import { DateTime } from 'luxon'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import TenantModel from '#models/tenant_model'
import Registration from './registration.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class ContentRegistration extends TenantModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare text: string

  @column()
  declare registration_id: number

  @belongsTo(() => Registration)
  declare registration: BelongsTo<typeof Registration>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
