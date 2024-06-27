import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import Piece from './piece.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Composer extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare short_name: string

  @column()
  declare long_name: string

  @column()
  declare birth_date: Date

  @column()
  declare death_date: Date

  @column()
  declare country: string

  @column()
  declare main_style: string

  @hasMany(() => Piece)
  declare pieces: HasMany<typeof Piece>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
