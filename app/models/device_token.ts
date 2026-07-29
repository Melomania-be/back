import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Contact from '#models/contact'

export default class DeviceToken extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare user_id: number | null

  @column()
  declare contact_id: number | null

  @column()
  declare platform: string

  @column()
  declare provider: string

  @column()
  declare token: string

  @column()
  declare device_label: string | null

  @column()
  declare app_version: string | null

  @column.dateTime()
  declare last_seen_at: DateTime | null

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Contact, {
    foreignKey: 'contact_id',
  })
  declare contact: BelongsTo<typeof Contact>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
