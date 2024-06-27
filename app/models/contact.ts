import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import Instrument from './instrument.js'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import List from './list.js'
import Participant from './participant.js'

export default class Contact extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare first_name: string

  @column()
  declare last_name: string

  @column()
  declare email: string

  @column()
  declare phone: string

  @column()
  declare messenger: string

  @column()
  declare comments: string

  @column()
  declare validated: boolean

  @manyToMany(() => Instrument, {
    pivotTable: 'plays',
    pivotColumns: ['proficiency_level'],
    pivotTimestamps: true,
  })
  declare instruments: ManyToMany<typeof Instrument>

  @manyToMany(() => List, {
    pivotTable: 'contacts_lists',
    pivotTimestamps: true,
  })
  declare lists: ManyToMany<typeof List>

  @hasMany(() => Participant, {
    foreignKey: 'contact_id',
  })
  declare participant: HasMany<typeof Participant>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  serializeExtras() {
    return { pivot_proficiency_level: this.$extras.pivot_proficiency_level }
  }
}
