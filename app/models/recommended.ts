import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import Instrument from './instrument.js'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'

export default class Recommended extends BaseModel {
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

  @manyToMany(() => Instrument, {
    pivotTable: 'recommendeds_instruments',
  })
  declare instruments: ManyToMany<typeof Instrument>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
