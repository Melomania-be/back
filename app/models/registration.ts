import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import ContentRegistration from './content_registration.js'
import Project from '#models/project'
import Form from '#models/form'

export default class Registration extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare project_id: number

  @column()
  declare last_send_date: Date

  @hasMany(() => ContentRegistration, {
    foreignKey: 'registration_id',
  })
  declare content: HasMany<typeof ContentRegistration>

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @hasMany(() => Form, {
    foreignKey: 'registration_id',
  })
  declare form: HasMany<typeof Form>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
