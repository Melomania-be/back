import { DateTime } from 'luxon'
import { BaseModel, belongsTo, hasMany, column } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Piece from './piece.js'
import File from './file.js'
import db from '@adonisjs/lucid/services/db'

export default class Material extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare piece_id: number

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare edition: string | null

  @column()
  declare editor: string | null

  @column()
  declare notes: string | null

  @column()
  declare is_default: boolean

  @column()
  declare is_active: boolean

  @column()
  declare files_count: number

  @column()
  declare projects_count: number

  @belongsTo(() => Piece, {
    foreignKey: 'piece_id',
  })
  declare piece: BelongsTo<typeof Piece>

  @hasMany(() => File, {
    foreignKey: 'material_id',
  })
  declare files: HasMany<typeof File>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  async updateFilesCount() {
    const count = await File.query().where('material_id', this.id).count('* as total')
    this.files_count = Number(count[0].$extras.total)
    await this.save()
  }

  async updateProjectsCount() {
    // Compter les projets qui utilisent ce matériel
    const count = await db
      .from('performed_ins')
      .where('material_id', this.id)
      .countDistinct('project_id as total')

    this.projects_count = Number(count[0].total)
    await this.save()
  }
}
