import { DateTime } from 'luxon'
import ContractorParticipant from '#models/contractor_participant'
import {
  BaseModel,
  column,
  belongsTo,
  manyToMany,
  hasMany,
} from '@adonisjs/lucid/orm'

import type {
  BelongsTo,
  ManyToMany,
  HasMany,
} from '@adonisjs/lucid/types/relations'

import Organization from './organization.js'
import ContractorCategory from './contractor_category.js'

export default class ContractorContact extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare first_name: string

  @column()
  declare last_name: string

  @column()
  declare email_1: string | null

  @column()
  declare email_2: string | null

  @column()
  declare email_3: string | null

  @column()
  declare phone_1: string | null

  @column()
  declare phone_2: string | null

  @column()
  declare phone_3: string | null

  @column()
  declare comments: string | null

  @column()
  declare organization_id: number | null

  @belongsTo(() => Organization, {
    foreignKey: 'organization_id',
  })
  declare organization: BelongsTo<typeof Organization>

  @manyToMany(() => ContractorCategory, {
    pivotTable: 'contractor_contact_categories',
  })
  declare categories: ManyToMany<typeof ContractorCategory>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => ContractorParticipant, {
  foreignKey: 'contractor_contact_id',
})
declare projectParticipations: HasMany<typeof ContractorParticipant>
}