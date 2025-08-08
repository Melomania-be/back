// app/models/recruitment_recommendation.ts
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Project from './project.js'
import RecruitmentContact from './recruitment_contact.js'

export type RecommendationStatus = 'pending' | 'ignored' | 'contacted_email' | 'contacted_manual'

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
  declare recruitmentContact: BelongsTo<typeof RecruitmentContact>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  get recommendedDisplayName(): string {
    return `${this.recommended_first_name} ${this.recommended_last_name}`
  }
}
