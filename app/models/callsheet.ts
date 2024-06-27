import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import ContentCallsheet from './content_callsheet.js'
import Project from './project.js'
import Participant from './participant.js'
export default class Callsheet extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare version: string

  @column()
  declare project_id: number

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @hasMany(() => ContentCallsheet, {
    foreignKey: 'callsheet_id',
  })
  declare contents: HasMany<typeof ContentCallsheet>

  @manyToMany(() => Participant, {
    pivotTable: 'seens',
    pivotTimestamps: true,
  })
  declare participants: ManyToMany<typeof Participant>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
