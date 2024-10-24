import { DateTime } from 'luxon'
import { BaseModel, column, hasOne, hasMany, manyToMany, belongsTo } from '@adonisjs/lucid/orm'
import SectionGroup from './section_group.js'
import Registration from './registration.js'
import Rehearsal from '#models/rehearsal'
import Piece from '#models/piece'
import type { HasOne, HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import Callsheet from './callsheet.js'
import Participant from './participant.js'
import Concert from './concert.js'
import Contact from './contact.js'
import Folder from './folder.js'

export default class Project extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare section_group_id: number

  @column()
  declare folder_id: number

  @manyToMany(() => Contact, {
    pivotTable: 'responsibles',
    pivotTimestamps: true,
  })
  declare responsibles: ManyToMany<typeof Contact>

  @belongsTo(() => Folder, {
    foreignKey: 'folder_id',
  })
  declare folder: BelongsTo<typeof Folder>

  @hasMany(() => Concert, {
    foreignKey: 'project_id',
  })
  declare concerts: HasMany<typeof Concert>

  @belongsTo(() => SectionGroup, {
    foreignKey: 'section_group_id',
  })
  declare sectionGroup: BelongsTo<typeof SectionGroup>

  @hasOne(() => Registration, {
    foreignKey: 'project_id',
  })
  declare registration: HasOne<typeof Registration>

  @hasMany(() => Rehearsal, {
    foreignKey: 'project_id',
  })
  declare rehearsals: HasMany<typeof Rehearsal>

  @manyToMany(() => Piece, {
    pivotTable: 'performed_ins',
    pivotTimestamps: true,
    pivotColumns: ['order'],
  })
  declare pieces: ManyToMany<typeof Piece>

  @hasMany(() => Callsheet, {
    foreignKey: 'project_id',
  })
  declare callsheets: HasMany<typeof Callsheet>

  @hasMany(() => Participant, {
    foreignKey: 'project_id',
  })
  declare participants: HasMany<typeof Participant>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  serializeExtras() {
    return { pivot_order: this.$extras.pivot_order }
  }
}
