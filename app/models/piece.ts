// app/models/piece.ts (version mise à jour)
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, manyToMany, hasMany } from '@adonisjs/lucid/orm'
import Composer from '#models/composer'
import TypeOfPiece from '#models/type_of_piece'
import Folder from '#models/folder'
import File from '#models/file'
import Material from '#models/material'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
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
    pivotColumns: ['order', 'material_id', 'material_specified'],
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

  @hasMany(() => File, {
    foreignKey: 'piece_id',
  })
  declare files: HasMany<typeof File>

  // ✅ NOUVEAU : Relation avec les matériels
  @hasMany(() => Material, {
    foreignKey: 'piece_id',
  })
  declare materials: HasMany<typeof Material>

  @column()
  declare arranger: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  serializeExtras() {
    return {
      pivot_order: this.$extras.pivot_order,
      pivot_material_id: this.$extras.pivot_material_id,
      pivot_material_specified: this.$extras.pivot_material_specified
    }
  }

  // ✅ NOUVEAU : Méthode pour obtenir le matériel par défaut
  async getDefaultMaterial(): Promise<Material | null> {
    return await Material.query()
      .where('piece_id', this.id)
      .where('is_default', true)
      .where('is_active', true)
      .first()
  }

  // ✅ NOUVEAU : Méthode pour créer un matériel par défaut
  async createDefaultMaterial(name?: string): Promise<Material> {
    const materialName = name || `Matériel principal - ${this.name}`

    return await Material.create({
      piece_id: this.id,
      name: materialName,
      description: 'Matériel par défaut',
      is_default: true,
      is_active: true
    })
  }
}
