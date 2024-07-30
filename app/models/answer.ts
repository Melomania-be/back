import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Form from '#models/form'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Participant from './participant.js'

export default class Answer extends BaseModel {
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
