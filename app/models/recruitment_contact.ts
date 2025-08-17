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

  @column()
  declare contacted_by: string | null

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
    return `${this.first_name || ''} ${this.last_name || ''}`.trim()
  }

  get primaryContact(): string {
    return this.email || this.messenger || this.phone || 'Aucun contact'
  }

  private formatDateSafely(date: DateTime | null): string | null {
    if (!date) return null

    try {
      if (!date.isValid) return null
      return date.toFormat('dd/MM/yyyy HH:mm')
    } catch (error) {
      console.error('Error formatting date:', error)
      return null
    }
  }

  private formatDateTimeToISO(date: DateTime | null): string | null {
    if (!date) return null

    try {
      if (!date.isValid) return null
      return date.toISO()
    } catch (error) {
      console.error('Error formatting date to ISO:', error)
      return null
    }
  }

  serialize() {
    const baseData = super.serialize()

    return {
      ...baseData,
      first_name: this.first_name || '',
      last_name: this.last_name || '',
      display_name: this.displayName,
      primary_contact: this.primaryContact,
      contacted_by: this.contacted_by || null,

      // Dates formatées avec protection complète contre les erreurs
      contact_date: this.formatDateSafely(this.contact_date),
      contact_date_iso: this.formatDateTimeToISO(this.contact_date),
      last_follow_up: this.formatDateSafely(this.last_follow_up),
      last_follow_up_iso: this.formatDateTimeToISO(this.last_follow_up),
      created_at: this.formatDateSafely(this.createdAt),
      created_at_iso: this.formatDateTimeToISO(this.createdAt),
      updated_at: this.formatDateSafely(this.updatedAt),
      updated_at_iso: this.formatDateTimeToISO(this.updatedAt),

      // Relations avec protection contre les valeurs nulles
      section: this.section ? {
        id: this.section.id,
        name: this.section.name || 'Section inconnue'
      } : null,

      contact: this.contact ? {
        id: this.contact.id,
        first_name: this.contact.first_name || '',
        last_name: this.contact.last_name || '',
        email: this.contact.email || null
      } : null,

      recommender: this.recommender ? {
        id: this.recommender.id,
        first_name: this.recommender.first_name || '',
        last_name: this.recommender.last_name || ''
      } : null
    }
  }

  getDaysSinceContact(): number | null {
    if (!this.contact_date || !this.contact_date.isValid) return null
    return Math.floor(DateTime.now().diff(this.contact_date, 'days').days)
  }

  needsFollowUp(followUpDays: number): boolean {
    return this.shouldFollowUp(followUpDays)
  }

  getStatusBadge(): { label: string; color: string; icon: string } {
    const statusConfig = {
      'not_yet_contacted': { label: 'Pas encore contacté', color: 'gray', icon: 'AlertCircle' },
      'awaiting_response': { label: 'En attente de réponse', color: 'blue', icon: 'Clock' },
      'to_follow_up': { label: 'À relancer', color: 'yellow', icon: 'AlertTriangle' },
      'not_available': { label: 'Non disponible', color: 'red', icon: 'XCircle' },
      'pending_validation': { label: 'En validation', color: 'purple', icon: 'Clock' },
      'cancelled': { label: 'Annulé', color: 'gray', icon: 'XCircle' },
      'recruited': { label: 'Recruté', color: 'green', icon: 'CheckCircle' }
    }

    return statusConfig[this.status] || statusConfig['not_yet_contacted']
  }

  static getAvailableStatuses(): Array<{ value: RecruitmentStatus; label: string }> {
    return [
      { value: 'not_yet_contacted', label: 'Pas encore contacté' },
      { value: 'awaiting_response', label: 'En attente de réponse' },
      { value: 'to_follow_up', label: 'À relancer' },
      { value: 'not_available', label: 'Non disponible' },
      { value: 'pending_validation', label: 'En validation' },
      { value: 'cancelled', label: 'Annulé' },
      { value: 'recruited', label: 'Recruté' }
    ]
  }

  static getAvailableContactMethods(): Array<{ value: ContactMethod; label: string }> {
    return [
      { value: 'manual', label: 'Manuel' },
      { value: 'email', label: 'Email' },
      { value: 'messenger', label: 'Messenger' },
      { value: 'phone', label: 'Téléphone' }
    ]
  }
}
