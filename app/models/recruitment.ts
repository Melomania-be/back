// import { DateTime } from 'luxon'
// import { BaseModel, column } from '@adonisjs/lucid/orm'

// export default class Recruitment extends BaseModel {
//   @column({ isPrimary: true })
//   declare id: number

//   @column()
//   declare firstName: string

//   @column()
//   declare lastName: string

//   @column()
//   declare sectionGroupId: number

//   @column.dateTime()
//   declare contactDate: DateTime

//   @column()
//   declare contactedBy: number // or string depending on your user ID type

//   @column()
//   declare status: string

//   @column.dateTime()
//   declare statusUpdatedAt: DateTime

//   @column()
//   declare comment: string | null

//   @column.dateTime({ autoCreate: true })
//   declare createdAt: DateTime

//   @column.dateTime({ autoCreate: true, autoUpdate: true })
//   declare updatedAt: DateTime
// }

import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm' // Ensure belongsTo is imported
import type { BelongsTo } from '@adonisjs/lucid/types/relations' // Ensure BelongsTo type is imported

import User from '#models/user'
import SectionGroup from '#models/section_group'

// Optional: Define a type for the status enum values for better type safety
export type RecruitmentStatus =
  | 'awaiting response'
  | 'interested'
  | 'participating'
  | 'registered'
  | 'not available'
  | 'to be contacted'
  | 'cancelled'
  | 'other'
  | 'withdrawn'

export default class Recruitment extends BaseModel {
  public static table = 'recruitments' // Good practice to explicitly set table name, though inferred from class name

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare sectionGroupId: number

  // Changed to .date() to match table.date() in migration
  @column.date()
  declare contactDate: DateTime

  @column()
  declare contactedBy: number // Confirmed as number based on migration

  @column()
  declare status: RecruitmentStatus // Using the custom type

  @column.dateTime({ columnName: 'status_updated_at' }) // Added columnName mapping for snake_case
  declare statusUpdatedAt: DateTime

  @column()
  declare comment: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => SectionGroup, {
    foreignKey: 'sectionGroupId',
    localKey: 'id',
  })
  declare sectionGroup: BelongsTo<typeof SectionGroup> // Access related SectionGroup

  @belongsTo(() => User, {
    foreignKey: 'contactedBy',
    localKey: 'id',
  })
  declare user: BelongsTo<typeof User> // Access related User
}
