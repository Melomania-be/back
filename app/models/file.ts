import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany, belongsTo } from '@adonisjs/lucid/orm'
import type { ManyToMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import Folder from './folder.js'
import Project from './project.js'
import Piece from './piece.js'

export default class File extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare type: string

  @column()
  declare content: string

  @column()
  declare path: string

  @column()
  declare size: number | null

  // ✅ NOUVELLES COLONNES ÉTRANGÈRES
  @column()
  declare folder_id: number | null

  @column()
  declare project_id: number | null

  @column()
  declare piece_id: number | null

  // ✅ RELATIONS BELONGSTO POUR LES NOUVELLES COLONNES
  @belongsTo(() => Folder, {
    foreignKey: 'folder_id',
  })
  declare folder: BelongsTo<typeof Folder>

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => Piece, {
    foreignKey: 'piece_id',
  })
  declare piece: BelongsTo<typeof Piece>

  // ✅ CORRECTION : Relation many-to-many avec nom différent pour éviter le conflit
  @manyToMany(() => Folder, {
    pivotTable: 'contains',
    pivotForeignKey: 'file_id',
    pivotRelatedForeignKey: 'folder_id',
    pivotTimestamps: true,
  })
  declare folders: ManyToMany<typeof Folder>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
