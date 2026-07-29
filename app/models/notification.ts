import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Contact from '#models/contact'
import Project from '#models/project'

function safeParseJson(value: string | object | null): Record<string, any> | null {
  if (!value) return null
  if (typeof value === 'object') return value as Record<string, any>

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function safeStringify(value: Record<string, any> | null | undefined): string | null {
  if (!value) return null

  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

export default class Notification extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare user_id: number | null

  @column()
  declare contact_id: number | null

  @column()
  declare project_id: number | null

  @column()
  declare actor_user_id: number | null

  @column()
  declare type: string

  @column()
  declare title: string

  @column()
  declare body: string

  @column({
    serialize: (value: string | object | null) => safeParseJson(value),
    prepare: (value: Record<string, any> | null | undefined) => safeStringify(value),
  })
  declare data: Record<string, any> | null

  @column.dateTime()
  declare read_at: DateTime | null

  @column.dateTime()
  declare sent_push_at: DateTime | null

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'actor_user_id',
  })
  declare actor: BelongsTo<typeof User>

  @belongsTo(() => Contact, {
    foreignKey: 'contact_id',
  })
  declare contact: BelongsTo<typeof Contact>

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
