// app/models/recruitment_recommendation.ts
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Project from './project.js'
import RecruitmentContact from './recruitment_contact.js'

export type RecommendationStatus = 'pending' | 'ignored' | 'contact_email' | 'contact_manual'

export default class RecruitmentRecommendation extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare project_id: number

  @column()
  declare recommender_name: string

  @column()
  declare recommender_email: string | null

  @column()
  declare recommended_first_name: string

  @column()
  declare recommended_last_name: string

  @column()
  declare recommended_email: string | null

  @column()
  declare recommended_phone: string | null

  @column()
  declare recommended_messenger: string | null

  @column()
  declare recommended_instrument: string | null

  @column()
  declare recommendation_message: string | null

  @column()
  declare status: RecommendationStatus

  @column()
  declare recruitment_contact_id: number | null

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => RecruitmentContact, {
    foreignKey: 'recruitment_contact_id',
  })
  declare recruitment_contact: BelongsTo<typeof RecruitmentContact>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  get recommendedDisplayName(): string {
    return `${this.recommended_first_name || ''} ${this.recommended_last_name || ''}`.trim()
  }

  get formattedCreatedAt(): string {
    return this.createdAt && this.createdAt.isValid
      ? this.createdAt.toFormat('dd/MM/yyyy HH:mm')
      : ''
  }

  getStatusBadge(): { label: string; color: string } {
    const statusConfig = {
      pending: { label: 'En attente', color: 'yellow' },
      ignored: { label: 'Ignorée', color: 'gray' },
      contact_email: { label: 'Contact par email', color: 'blue' },
      contact_manual: { label: 'Contact manuel', color: 'green' },
    }

    return statusConfig[this.status] || statusConfig['pending']
  }

  isPending(): boolean {
    return this.status === 'pending'
  }

  isProcessed(): boolean {
    return this.status !== 'pending'
  }

  serialize() {
    const baseData = super.serialize()

    return {
      ...baseData,
      recommended_display_name: this.recommendedDisplayName,
      formatted_created_at: this.formattedCreatedAt,
      created_at_iso: this.createdAt && this.createdAt.isValid ? this.createdAt.toISO() : null,
      updated_at_iso: this.updatedAt && this.updatedAt.isValid ? this.updatedAt.toISO() : null,
      status_badge: this.getStatusBadge(),
      is_pending: this.isPending(),
      is_processed: this.isProcessed(),
    }
  }

  static getAvailableStatuses(): Array<{ value: RecommendationStatus; label: string }> {
    return [
      { value: 'pending', label: 'En attente' },
      { value: 'ignored', label: 'Ignorée' },
      { value: 'contact_email', label: 'Contact par email' },
      { value: 'contact_manual', label: 'Contact manuel' },
    ]
  }
}
