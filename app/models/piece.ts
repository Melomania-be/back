// app/models/piece.ts - Version corrigée complète

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

  // ✅ CORRECTION DE LA RELATION : Utiliser le bon nom pour la relation
  @manyToMany(() => Project, {
    pivotTable: 'performed_ins',
    pivotTimestamps: true,
    pivotColumns: ['order', 'material_id', 'material_specified'],
    // ✅ IMPORTANT : Spécifier explicitement les clés
    localKey: 'id',
    pivotForeignKey: 'piece_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'project_id'
  })
  declare projects: ManyToMany<typeof Project> // ✅ Renommé de 'sections' vers 'projects'

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

  // ✅ CORRECTION MAJEURE : Sérialisation complète des données pivot
  serializeExtras() {
    return {
      pivot_order: this.$extras.pivot_order ?? null,
      pivot_material_id: this.$extras.pivot_material_id ?? null,
      pivot_material_specified: Boolean(this.$extras.pivot_material_specified ?? false)
    }
  }

  // ✅ OVERRIDE complet de la méthode serialize
  serialize(cherryPick?: any[], relations?: any) {
    const serialized = super.serialize(cherryPick, relations)

    // ✅ DEBUG : Logger les données extras
    if (process.env.NODE_ENV === 'development') {
      console.log(`🎵 PIECE ${this.id} SERIALIZE:`, {
        name: this.name,
        hasExtras: !!this.$extras,
        extras: this.$extras,
        pivot_material_id: this.$extras?.pivot_material_id,
        pivot_material_specified: this.$extras?.pivot_material_specified,
        pivot_order: this.$extras?.pivot_order
      })
    }

    // ✅ Ajouter automatiquement les données pivot si elles existent
    if (this.$extras) {
      serialized.pivot_order = this.$extras.pivot_order ?? null
      serialized.pivot_material_id = this.$extras.pivot_material_id ?? null
      serialized.pivot_material_specified = Boolean(this.$extras.pivot_material_specified ?? false)
    }

    return serialized
  }

  // Méthode pour obtenir le matériel par défaut
  async getDefaultMaterial(): Promise<Material | null> {
    return await Material.query()
      .where('piece_id', this.id)
      .where('is_default', true)
      .where('is_active', true)
      .first()
  }

  // Méthode pour créer un matériel par défaut
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

  // ✅ NOUVELLE MÉTHODE : Debug pour vérifier les données pivot
  debugPivotData() {
    return {
      id: this.id,
      name: this.name,
      hasExtras: !!this.$extras,
      extrasKeys: this.$extras ? Object.keys(this.$extras) : [],
      pivot_order: this.$extras?.pivot_order,
      pivot_material_id: this.$extras?.pivot_material_id,
      pivot_material_specified: this.$extras?.pivot_material_specified
    }
  }
}
