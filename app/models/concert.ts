import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Project from '#models/project'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Concert extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare date: DateTime

  @column()
  declare comment: string

  @column()
  declare project_id: number

  @belongsTo(() => Project)
  declare project: BelongsTo<typeof Project>

  @column()
  declare place: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
