import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Project from '#models/project'

import User from '#models/user'
// import SectionGroup from '#models/section_group'
import Section from '#models/section'
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
  | 'pending validation' // REMOVED: To match migration
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

  // @column({ columnName: 'section_group_id' }) // Explicitly map snake_case column
  // declare sectionGroupId: number

  @column({ columnName: 'section_id' }) // NEW: Maps to the section_id column in DB
  declare sectionId: number | null

  // --- NEW COLUMN: projectId ---
  @column({ columnName: 'project_id' }) // Maps to the project_id column in DB
  declare projectId: number | null // IMPORTANT: It's nullable as per migration
  // --- END NEW COLUMN ---

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

  // @belongsTo(() => SectionGroup, {
  //   foreignKey: 'sectionGroupId',
  //   localKey: 'id',
  // })
  // declare sectionGroup: BelongsTo<typeof SectionGroup>

  @belongsTo(() => Section, {
    // NEW: Define belongsTo Section relation
    foreignKey: 'sectionId', // The foreign key on this model (Recruitment)
    localKey: 'id', // The primary key on the Section model
  })
  declare section: BelongsTo<typeof Section>

  @belongsTo(() => User, {
    foreignKey: 'contactedBy',
    localKey: 'id',
  })
  declare user: BelongsTo<typeof User>

  // --- NEW RELATIONSHIP: belongsTo Project ---
  @belongsTo(() => Project, {
    foreignKey: 'projectId', // The foreign key on this model (camelCase property name)
    localKey: 'id', // The primary key on the Project model
  })
  declare project: BelongsTo<typeof Project> // Access related Project
  // --- END NEW RELATIONSHIP ---
}
