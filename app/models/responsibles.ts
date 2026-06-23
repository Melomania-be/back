import { DateTime } from 'luxon'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import TenantModel from '#models/tenant_model'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Project from './project.js'
import Contact from './contact.js'

export default class Responsibles extends TenantModel {
  @column()
  declare project_id: number

  @column()
  declare contact_id: number

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => Contact, {
    foreignKey: 'contact_id',
  })
  declare contact: BelongsTo<typeof Contact>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
