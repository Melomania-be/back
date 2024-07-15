import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, manyToMany } from '@adonisjs/lucid/orm'
import Instrument from './instrument.js'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import Project from './project.js'

export default class Recommended extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare first_name: string

  @column()
  declare last_name: string

  @column()
  declare email: string

  @column()
  declare phone: string

  @column()
  declare messenger: string

  @column()
  declare comment: string

  @column()
  declare project_id: number

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @manyToMany(() => Instrument, {
    pivotTable: 'recommendeds_instruments',
  })
  declare instruments: ManyToMany<typeof Instrument>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
