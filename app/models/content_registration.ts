import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Registration from './registration.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class ContentRegistration extends BaseModel {
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
