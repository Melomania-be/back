// app/models/audition_pdf_file.ts
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Audition from './audition.js'
import File from './file.js'
import Section from './section.js'

export default class AuditionPdfFile extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare audition_id: number

  @column()
  declare file_id: number

  @column()
  declare section_id: number

  @column()
  declare title: string

  @column()
  declare description: string

  @column()
  declare order: number

  @belongsTo(() => Audition, {
    foreignKey: 'audition_id',
  })
  declare audition: BelongsTo<typeof Audition>

  @belongsTo(() => File, {
    foreignKey: 'file_id',
  })
  declare file: BelongsTo<typeof File>

  @belongsTo(() => Section, {
    foreignKey: 'section_id',
  })
  declare section: BelongsTo<typeof Section>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
