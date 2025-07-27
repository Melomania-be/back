// app/models/piece.ts - Ajouter ces propriétés et relations à votre modèle existant

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

  // ✅ NOUVELLE COLONNE pour le matériel sélectionné
  @column()
  declare selected_material_id: number | null

  @column()
  declare arranger: string | null

  // Relations existantes...
  @manyToMany(() => Project, {
    pivotTable: 'performed_ins',
    pivotTimestamps: true,
    pivotColumns: ['order', 'material_id', 'material_specified'],
    localKey: 'id',
    pivotForeignKey: 'piece_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'project_id'
  })
  declare projects: ManyToMany<typeof Project>

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

  // ✅ NOUVELLE RELATION pour le matériel sélectionné
  @belongsTo(() => Material, {
    foreignKey: 'selected_material_id',
  })
  declare selectedMaterial: BelongsTo<typeof Material>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Méthodes existantes...
  serializeExtras() {
    return {
      pivot_order: this.$extras.pivot_order ?? null,
      pivot_material_id: this.$extras.pivot_material_id ?? null,
      pivot_material_specified: Boolean(this.$extras.pivot_material_specified ?? false)
    }
  }

  serialize(cherryPick?: any[], relations?: any) {
    const serialized = super.serialize(cherryPick, relations)

    if (this.$extras) {
      serialized.pivot_order = this.$extras.pivot_order ?? null
      serialized.pivot_material_id = this.$extras.pivot_material_id ?? null
      serialized.pivot_material_specified = Boolean(this.$extras.pivot_material_specified ?? false)
    }

    return serialized
  }

  // ✅ NOUVELLES MÉTHODES pour la gestion du matériel sélectionné

  /**
   * Sélectionner un matériel pour cette pièce
   */
  async selectMaterial(materialId: number | null) {
    this.selected_material_id = materialId
    await this.save()
  }

  /**
   * Obtenir le matériel sélectionné avec ses fichiers
   */
  async getSelectedMaterialWithFiles(): Promise<Material | null> {
    if (!this.selected_material_id) return null

    return await Material.query()
      .where('id', this.selected_material_id)
      .where('is_active', true)
      .preload('files')
      .first()
  }

  /**
   * Vérifier si cette pièce a un matériel sélectionné
   */
  hasSelectedMaterial(): boolean {
    return this.selected_material_id !== null
  }

  /**
   * Obtenir les fichiers du matériel sélectionné
   */
  async getSelectedMaterialFiles(): Promise<File[]> {
    const selectedMaterial = await this.getSelectedMaterialWithFiles()
    return selectedMaterial?.files || []
  }

  // Méthodes existantes...
  async getDefaultMaterial(): Promise<Material | null> {
    return await Material.query()
      .where('piece_id', this.id)
      .where('is_default', true)
      .where('is_active', true)
      .first()
  }

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

  debugPivotData() {
    return {
      id: this.id,
      name: this.name,
      hasExtras: !!this.$extras,
      extrasKeys: this.$extras ? Object.keys(this.$extras) : [],
      pivot_order: this.$extras?.pivot_order,
      pivot_material_id: this.$extras?.pivot_material_id,
      pivot_material_specified: this.$extras?.pivot_material_specified,
      selected_material_id: this.selected_material_id
    }
  }
}
