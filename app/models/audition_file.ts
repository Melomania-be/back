import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Audition from './audition.js'
import File from './file.js'

export default class AuditionFile extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare audition_id: number

  @column()
  declare file_id: number

  @column()
  declare file_type: string

  @column()
  declare description: string

  @column.dateTime()
  declare uploaded_at: DateTime

  @belongsTo(() => Audition, {
    foreignKey: 'audition_id',
  })
  declare audition: BelongsTo<typeof Audition>

  @belongsTo(() => File, {
    foreignKey: 'file_id',
  })
  declare file: BelongsTo<typeof File>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
