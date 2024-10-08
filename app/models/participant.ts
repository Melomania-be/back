import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Project from '#models/project'
import Section from '#models/section'
import Answer from '#models/answer'
import Contact from '#models/contact'
import Rehearsal from '#models/rehearsal'
import Callsheet from './callsheet.js'
import Concert from './concert.js'

export default class Participant extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare last_activity: Date

  @column()
  declare accepted: boolean

  @column()
  declare project_id: number

  @column()
  declare contact_id: number

  @column()
  declare section_id: number

  @column()
  declare is_section_leader: boolean

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => Section, {
    foreignKey: 'section_id',
  })
  declare section: BelongsTo<typeof Section>

  @belongsTo(() => Contact, {
    foreignKey: 'contact_id',
  })
  declare contact: BelongsTo<typeof Contact>

  @manyToMany(() => Rehearsal, {
    pivotTable: 'participates_ins',
    pivotForeignKey: 'participant_id',
    pivotRelatedForeignKey: 'rehearsal_id',
    pivotColumns: ['comment'],
    pivotTimestamps: true,
  })
  declare rehearsals: ManyToMany<typeof Rehearsal>

  @manyToMany(() => Concert, {
    pivotTable: 'participates_in_concerts',
    pivotForeignKey: 'participant_id',
    pivotRelatedForeignKey: 'concert_id',
    pivotColumns: ['comment'],
    pivotTimestamps: true,
  })
  declare concerts: ManyToMany<typeof Concert>

  @manyToMany(() => Callsheet, {
    pivotTable: 'seens',
    pivotTimestamps: true,
  })
  declare hasSeenCallsheets: ManyToMany<typeof Callsheet>

  @hasMany(() => Answer, {
    foreignKey: 'participant_id',
  })
  declare answers: HasMany<typeof Answer>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  serializeExtras() {
    return { pivot_comment: this.$extras.pivot_comment }
  }
}
