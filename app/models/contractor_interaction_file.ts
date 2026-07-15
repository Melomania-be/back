import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import ContractorInteraction from '#models/contractor_interaction'
import File from '#models/file'

export default class ContractorInteractionFile extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare contractorInteractionId: number

  @column()
  declare fileId: number

  @belongsTo(() => ContractorInteraction)
  declare interaction: BelongsTo<typeof ContractorInteraction>

  @belongsTo(() => File)
  declare file: BelongsTo<typeof File>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}