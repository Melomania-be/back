// app/Models/RecruitmentAlert.ts

import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Recruitment from '#models/recruitment' // Import Recruitment model

export default class RecruitmentAlert extends BaseModel {
  public static table = 'recruitment_alerts' // Ensure table name matches migration

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'new_recruitment_id' })
  declare newRecruitmentId: number

  @column({ columnName: 'similar_to_recruitment_id' })
  declare similarToRecruitmentId: number | null

  @column()
  declare alertType: string // e.g., 'similarity_conflict'

  @column()
  declare message: string | null

  @column()
  declare isResolved: boolean

  // Add this new property
  @column.dateTime({ autoCreate: true, autoUpdate: true }) // You can choose autoUpdate or manually set
  declare resolvedAt: DateTime | null // Add this line

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Define relationships for easier access
  @belongsTo(() => Recruitment, {
    foreignKey: 'newRecruitmentId',
    localKey: 'id',
  })
  declare newRecruitment: BelongsTo<typeof Recruitment>

  @belongsTo(() => Recruitment, {
    foreignKey: 'similarToRecruitmentId',
    localKey: 'id',
  })
  declare similarToRecruitment: BelongsTo<typeof Recruitment>
}
