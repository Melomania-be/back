import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, manyToMany } from '@adonisjs/lucid/orm'
import Project from '#models/project'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import Participant from '#models/participant'

export default class Rehearsal extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare project_id: number

  @column()
  declare date: DateTime

  @column()
  declare comment: string

  @belongsTo(() => Project)
  declare project: BelongsTo<typeof Project>

  @manyToMany(() => Participant, {
    pivotTable: 'participates_ins',
    pivotForeignKey: 'rehearsal_id',
    pivotRelatedForeignKey: 'participant_id',
    pivotTimestamps: true,
  })
  declare participants: ManyToMany<typeof Participant>

  @column()
  declare place: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
