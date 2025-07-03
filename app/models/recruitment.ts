import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import User from '#models/user'
import SectionGroup from '#models/section_group'

// --- MODIFIED RecruitmentStatus TYPE HERE ---
export type RecruitmentStatus =
  | 'not yet contacted' // ADDED: To match migration enum
  | 'awaiting response'
  | 'interested'
  | 'participating'
  | 'registered'
  | 'not available'
  | 'to follow up' // CHANGED: From 'to be contacted' to match migration
  | 'cancelled'
  | 'other'
// | 'withdrawn'         // REMOVED: To match migration
// --- END MODIFIED RecruitmentStatus TYPE ---

export default class Recruitment extends BaseModel {
  public static table = 'recruitments'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column({ columnName: 'section_group_id' }) // Explicitly map snake_case column
  declare sectionGroupId: number

  @column.date({ columnName: 'contact_date' }) // Explicitly map snake_case column
  declare contactDate: DateTime | null // ADDED: Can be null to match migration and 'not yet contacted'

  // --- MODIFIED: contactedBy type to allow null ---
  @column({ columnName: 'contacted_by' }) // Explicitly map snake_case column
  declare contactedBy: number | null // CHANGED: Now 'number | null' to match nullable column in migration
  // --- END MODIFIED contactedBy ---

  @column()
  declare status: RecruitmentStatus // Using the updated custom type

  @column.dateTime({ columnName: 'status_updated_at' })
  declare statusUpdatedAt: DateTime

  @column()
  declare comment: string | null // Correct: As per your confirmation (nullable)

  @column.dateTime({ autoCreate: true, columnName: 'created_at' }) // Explicitly map snake_case column
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' }) // Explicitly map snake_case column
  declare updatedAt: DateTime

  @belongsTo(() => SectionGroup, {
    foreignKey: 'sectionGroupId',
    localKey: 'id',
  })
  declare sectionGroup: BelongsTo<typeof SectionGroup>

  @belongsTo(() => User, {
    foreignKey: 'contactedBy',
    localKey: 'id',
  })
  declare user: BelongsTo<typeof User>
}
