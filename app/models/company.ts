import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

import ContractorContact from './contractor_contact.js'

export default class Company extends BaseModel {
  public static table = 'organizations'
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

@column()
declare comments: string | null

  @hasMany(() => ContractorContact, {
    foreignKey: 'organization_id',
  })
  declare contractorContacts: HasMany<typeof ContractorContact>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}