// app/models/recruitment_contact.ts - Version complète corrigée
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

  // Méthodes utilitaires avec validation robuste
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

  // ✅ CORRECTION : Méthode serialize corrigée pour éviter les undefined
  serialize() {
    const baseData = super.serialize()

    return {
      ...baseData,
      // ✅ S'assurer que les noms ne sont jamais undefined
      first_name: this.first_name || '',
      last_name: this.last_name || '',
      display_name: this.displayName,
      primary_contact: this.primaryContact,

      // Dates formatées
      contact_date: this.contact_date ? this.contact_date.toFormat('dd/MM/yyyy HH:mm') : null,
      contact_date_iso: this.contact_date ? this.contact_date.toISO() : null,
      created_at: this.createdAt ? this.createdAt.toFormat('dd/MM/yyyy HH:mm') : null,
      created_at_iso: this.createdAt ? this.createdAt.toISO() : null,
      updated_at: this.updatedAt ? this.updatedAt.toFormat('dd/MM/yyyy HH:mm') : null,
      updated_at_iso: this.updatedAt ? this.updatedAt.toISO() : null,

      // Relations avec protection
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

  // Méthode pour obtenir les jours depuis le contact
  getDaysSinceContact(): number | null {
    if (!this.contact_date) return null
    return Math.floor(DateTime.now().diff(this.contact_date, 'days').days)
  }

  // Méthode pour vérifier si le contact doit être relancé
  needsFollowUp(followUpDays: number): boolean {
    return this.shouldFollowUp(followUpDays)
  }

  // Méthode pour obtenir le statut avec badge
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

  // Méthode statique pour obtenir tous les statuts disponibles
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

  // Méthode statique pour obtenir tous les moyens de contact
  static getAvailableContactMethods(): Array<{ value: ContactMethod; label: string }> {
    return [
      { value: 'manual', label: 'Manuel' },
      { value: 'email', label: 'Email' },
      { value: 'messenger', label: 'Messenger' },
      { value: 'phone', label: 'Téléphone' }
    ]
  }
}
