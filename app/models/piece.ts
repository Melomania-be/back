import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, manyToMany } from '@adonisjs/lucid/orm'
import Composer from '#models/composer'
import TypeOfPiece from '#models/type_of_piece'
import Folder from '#models/folder'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import Project from '#models/project'

export default class Piece extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare opus: string

  @column()
  declare year_of_composition: String

  @column()
  declare type_of_piece_id: number

  @column()
  declare composer_id: number

  @column()
  declare folder_id: number | null

  @manyToMany(() => Project, {
    pivotTable: 'performed_ins',
    pivotTimestamps: true,
  })
  declare sections: ManyToMany<typeof Project>

  @belongsTo(() => TypeOfPiece, {
    foreignKey: 'type_of_piece_id',
  })
  declare typeOfPiece: BelongsTo<typeof TypeOfPiece>

  @belongsTo(() => Composer, {
    foreignKey: 'composer_id',
  })
  declare composer: BelongsTo<typeof Composer>

  @belongsTo(() => Folder, {
    foreignKey: 'folder_id',
  })
  declare folder: BelongsTo<typeof Folder>

  @column()
  declare arranger: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
