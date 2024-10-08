import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, manyToMany } from '@adonisjs/lucid/orm'
import Project from '#models/project'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import Participant from './participant.js'

export default class Concert extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare start_date: DateTime

  @column()
  declare end_date: DateTime | null

  @column()
  declare comment: string

  @column()
  declare project_id: number

  @belongsTo(() => Project)
  declare project: BelongsTo<typeof Project>

  @manyToMany(() => Participant, {
    pivotTable: 'participates_in_concerts',
    pivotForeignKey: 'concert_id',
    pivotRelatedForeignKey: 'participant_id',
    pivotColumns: ['comment'],
    pivotTimestamps: true,
  })
  declare participants: ManyToMany<typeof Participant>

  @column()
  declare place: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  serializeExtras() {
    return { pivot_comment: this.$extras.pivot_comment }
  }
}
