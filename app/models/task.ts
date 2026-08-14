import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Project from '#models/project'
import User from '#models/user'
import Piece from '#models/piece'
import Section from '#models/section'
import Subtask from '#models/subtask'
import TaskComment from '#models/task_comment'

export default class Task extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare status: 'todo' | 'in_progress' | 'done'

  @column()
  declare priority: 'low' | 'medium' | 'high'

  @column()
  declare taskType: 'logistic' | 'musical' | 'administrative' | 'communication'

  @column()
  declare visibility: 'private' | 'section' | 'all'

  @column.dateTime()
  declare dueDate: DateTime | null

  @column()
  declare isRecurring: boolean

  @column()
  declare recurrenceRule: string | null

  // --- RELATIONS (CLÉS ÉTRANGÈRES) ---

  @column()
  declare projectId: number

  @column()
  declare eventId: number | null

  @column()
  declare pieceId: number | null

  @column()
  declare sectionId: number | null

  @column()
  declare assigneeId: number | null

  @column()
  declare createdBy: number

  // --- DÉFINITION DES LIENS ORM ---

  @belongsTo(() => Project)
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => Piece)
  declare piece: BelongsTo<typeof Piece>

  @belongsTo(() => Section)
  declare section: BelongsTo<typeof Section>

  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>

  // --- TIMESTAMPS ---

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // --- HAS MANY RELATIONS ---

  @hasMany(() => Subtask)
  declare subtasks: HasMany<typeof Subtask>

  @hasMany(() => TaskComment)
  declare comments: HasMany<typeof TaskComment>

  @column()
  declare organizationId: number
}
