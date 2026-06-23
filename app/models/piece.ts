import { DateTime } from 'luxon'
import { belongsTo, column, manyToMany, hasMany } from '@adonisjs/lucid/orm'
import TenantModel from '#models/tenant_model'
import Composer from '#models/composer'
import TypeOfPiece from '#models/type_of_piece'
import Folder from '#models/folder'
import File from '#models/file'
import Material from '#models/material'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Project from '#models/project'

export default class Piece extends TenantModel {
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

  @column()
  declare selected_material_id: number | null

  @column()
  declare arranger: string | null

  @manyToMany(() => Project, {
    pivotTable: 'performed_ins',
    pivotTimestamps: true,
    pivotColumns: ['order', 'material_id', 'material_specified'],
    localKey: 'id',
    pivotForeignKey: 'piece_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'project_id',
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

  @belongsTo(() => Material, {
    foreignKey: 'selected_material_id',
  })
  declare selectedMaterial: BelongsTo<typeof Material>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  serializeExtras() {
    return {
      pivot_order: this.$extras.pivot_order ?? null,
      pivot_material_id: this.$extras.pivot_material_id ?? null,
      pivot_material_specified: Boolean(this.$extras.pivot_material_specified ?? false),
    }
  }

  async selectMaterial(materialId: number | null) {
    this.selected_material_id = materialId
    await this.save()
  }

  async getSelectedMaterialWithFiles(): Promise<Material | null> {
    if (!this.selected_material_id) return null

    return await Material.query()
      .where('id', this.selected_material_id)
      .where('is_active', true)
      .preload('files')
      .first()
  }

  hasSelectedMaterial(): boolean {
    return this.selected_material_id !== null
  }

  async getSelectedMaterialFiles(): Promise<File[]> {
    const selectedMaterial = await this.getSelectedMaterialWithFiles()
    return selectedMaterial?.files || []
  }

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
      is_active: true,
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
      selected_material_id: this.selected_material_id,
    }
  }
}
