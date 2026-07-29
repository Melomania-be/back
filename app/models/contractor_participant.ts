import { DateTime } from 'luxon'
import {
  BaseModel,
  belongsTo,
  column,
} from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import Project from '#models/project'
import ContractorContact from '#models/contractor_contact'

export default class ContractorParticipant extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare projectId: number

  @column()
  declare contractorContactId: number

  @belongsTo(() => Project)
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => ContractorContact)
  declare contractor: BelongsTo<typeof ContractorContact>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}