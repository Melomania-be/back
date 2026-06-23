import { DateTime } from 'luxon'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import TenantModel from '#models/tenant_model'
import Form from '#models/form'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Participant from './participant.js'

export default class Answer extends TenantModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare text: string

  @column()
  declare form_id: number

  @column()
  declare participant_id: number

  @belongsTo(() => Form, {
    foreignKey: 'form_id',
  })
  declare form: BelongsTo<typeof Form>

  @belongsTo(() => Participant, {
    foreignKey: 'participant_id',
  })
  declare participant: BelongsTo<typeof Participant>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
