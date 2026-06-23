import { DateTime } from 'luxon'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import TenantModel from '#models/tenant_model'
import Registration from '#models/registration'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Form extends TenantModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare text: string

  @column()
  declare type: string

  @column()
  declare registration_id: number

  @belongsTo(() => Registration, {
    foreignKey: 'registration_id',
  })
  declare registration: BelongsTo<typeof Registration>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
