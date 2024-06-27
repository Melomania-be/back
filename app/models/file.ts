import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import Folder from './folder.js'

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

  @manyToMany(() => Folder, {
    pivotTable: 'contains',
    pivotForeignKey: 'file_id',
    pivotRelatedForeignKey: 'folder_id',
    pivotTimestamps: true,
  })
  declare folder_id: ManyToMany<typeof Folder>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
