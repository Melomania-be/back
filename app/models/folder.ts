import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import Piece from './piece.js'
import File from './file.js'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'

export default class Folder extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

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
}
