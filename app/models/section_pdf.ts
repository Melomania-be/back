// app/models/section_pdf.ts
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Project from './project.js'
import Section from './section.js'
import File from './file.js'

export default class SectionPdf extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare project_id: number

  @column()
  declare section_id: number

  @column()
  declare file_id: number

  @column()
  declare title: string

  @column()
  declare description: string

  @column()
  declare order: number

  // ✅ COLONNES ADDITIONNELLES - Configuration d'audition
  @column()
  declare is_required: boolean

  @column()
  declare is_active: boolean

  // ✅ COLONNES ADDITIONNELLES - Statistiques d'usage
  @column()
  declare auditions_count: number

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => Section, {
    foreignKey: 'section_id',
  })
  declare section: BelongsTo<typeof Section>

  @belongsTo(() => File, {
    foreignKey: 'file_id',
  })
  declare file: BelongsTo<typeof File>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
