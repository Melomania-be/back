// app/models/material.ts
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, hasMany, column } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Piece from './piece.js'
import File from './file.js'

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

  // Méthode pour mettre à jour le compteur de fichiers
  async updateFilesCount() {
    const count = await File.query().where('material_id', this.id).count('* as total')
    this.files_count = Number(count[0].$extras.total)
    await this.save()
  }

  // Méthode pour mettre à jour le compteur de projets
  async updateProjectsCount() {
    const count = await this.related('piece')
      .query()
      .preload('sections', (query) => {
        query.whereNotNull('pivot_material_id').where('pivot_material_id', this.id)
      })
      .first()

    this.projects_count = count?.sections?.length || 0
    await this.save()
  }
}
