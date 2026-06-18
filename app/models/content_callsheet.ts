import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Callsheet from '#models/callsheet'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class ContentCallsheet extends BaseModel {
  static table = 'content_callsheets'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare callsheet_id: number

  @column()
  declare title: string

  @column()
  declare text: string

  @column()
  declare order: number

  @column()
  declare position: string

  @belongsTo(() => Callsheet, {
    foreignKey: 'callsheet_id',
    localKey: 'id',
  })
  declare callsheet: BelongsTo<typeof Callsheet>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}