import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany, belongsTo } from '@adonisjs/lucid/orm'
import Piece from './piece.js'
import File from './file.js'
import Project from './project.js'
import type { HasMany, ManyToMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'

export default class Folder extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare parent_id: number | null

  @column()
  declare project_id: number | null

  @column()
  declare piece_id: number | null

  @column()
  declare is_system_generated: boolean

  @belongsTo(() => Folder, {
    foreignKey: 'parent_id',
  })
  declare parent: BelongsTo<typeof Folder>

  @hasMany(() => Folder, {
    foreignKey: 'parent_id',
  })
  declare children: HasMany<typeof Folder>

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => Piece, {
    foreignKey: 'piece_id',
  })
  declare piece: BelongsTo<typeof Piece>

  @manyToMany(() => File, {
    pivotTable: 'contains',
    pivotForeignKey: 'folder_id',
    pivotRelatedForeignKey: 'file_id',
    pivotTimestamps: true,
  })
  declare files: ManyToMany<typeof File>

  @hasMany(() => Piece)
  declare pieces: HasMany<typeof Piece>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare organizationId: number | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
