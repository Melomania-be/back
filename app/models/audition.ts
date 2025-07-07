// app/models/audition.ts
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Participant from './participant.js'
import Project from './project.js'
import AuditionFile from './audition_file.js'
import AuditionPdfFile from './audition_pdf_file.js'

function safeParseJson(value: string): any[] {
  try {
    const parsed = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return [] // retourne tableau vide si parsing échoue
  }
}

function safeStringify(value: any): string {
  try {
    return JSON.stringify(value ?? [])
  } catch (e) {
    return '[]'
  }
}

export default class Audition extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare participant_id: number

  @column()
  declare project_id: number

  @column()
  declare secure_token: string

  @column()
  declare instructions: string

  @column({
    serialize: (value: string) => safeParseJson(value),
    prepare: (value: any) => safeStringify(value),
  })
  declare required_files: string[]

  @column.dateTime()
  declare deadline: DateTime | null

  // ✅ CORRECTION : Ajouter valeur par défaut et sérialisation explicite
  @column({
    serialize: (value: any) => Boolean(value),
    prepare: (value: any) => Boolean(value),
  })
  declare is_submitted: boolean = false

  @column.dateTime()
  declare submitted_at: DateTime | null

  @column()
  declare candidate_notes: string

  @belongsTo(() => Participant, {
    foreignKey: 'participant_id',
  })
  declare participant: BelongsTo<typeof Participant>

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @hasMany(() => AuditionFile, {
    foreignKey: 'audition_id',
  })
  declare files: HasMany<typeof AuditionFile>

  @hasMany(() => AuditionPdfFile, {
    foreignKey: 'audition_id',
  })
  declare pdfFiles: HasMany<typeof AuditionPdfFile>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
