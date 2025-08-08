// app/models/recruitment_contact.ts
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Project from './project.js'
import Contact from './contact.js'
import Section from './section.js'

export type RecruitmentStatus =
  | 'not_yet_contacted'
  | 'awaiting_response'
  | 'to_follow_up'
  | 'not_available'
  | 'pending_validation'
  | 'cancelled'
  | 'recruited'

export type ContactMethod = 'manual' | 'email' | 'messenger' | 'phone'

export default class RecruitmentContact extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare project_id: number

  @column()
  declare contact_id: number | null

  @column()
  declare first_name: string

  @column()
  declare last_name: string

  @column()
  declare email: string | null

  @column()
  declare phone: string | null

  @column()
  declare messenger: string | null

  @column()
  declare section_id: number | null

  @column()
  declare status: RecruitmentStatus

  @column()
  declare contact_method: ContactMethod

  @column.dateTime()
  declare contact_date: DateTime | null

  @column.dateTime()
  declare last_follow_up: DateTime | null

  @column()
  declare notes: string | null

  @column()
  declare recommended_by: string | null

  @column()
  declare recommender_contact_id: number | null

  @column()
  declare is_duplicate: boolean

  @column()
  declare source: string | null

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => Contact, {
    foreignKey: 'contact_id',
  })
  declare contact: BelongsTo<typeof Contact>

  @belongsTo(() => Section, {
    foreignKey: 'section_id',
  })
  declare section: BelongsTo<typeof Section>

  @belongsTo(() => Contact, {
    foreignKey: 'recommender_contact_id',
  })
  declare recommender: BelongsTo<typeof Contact>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Méthodes utilitaires
  shouldFollowUp(followUpDays: number): boolean {
    if (this.status !== 'awaiting_response' || !this.contact_date) {
      return false
    }

    const daysSinceContact = DateTime.now().diff(this.contact_date, 'days').days
    return daysSinceContact >= followUpDays
  }

  get displayName(): string {
    return `${this.first_name} ${this.last_name}`
  }

  get primaryContact(): string {
    return this.email || this.messenger || this.phone || 'Aucun contact'
  }
}
