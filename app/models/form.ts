import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import Registration from '#models/registration'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Form extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare text: string

  @column()
  declare type: string

  @column()
  declare registration_id : number

  @belongsTo(() => Registration)
  declare registration: BelongsTo<typeof Registration>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
