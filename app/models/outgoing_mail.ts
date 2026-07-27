import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'

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

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare organizationId: number | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}