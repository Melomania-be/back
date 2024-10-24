import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import Instrument from './instrument.js'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import SectionGroup from './section_group.js'

export default class Section extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare size: number

  @manyToMany(() => Instrument, {
    pivotTable: 'played_in_sections',
    localKey: 'id',
    pivotForeignKey: 'section_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'instrument_id',
    pivotTimestamps: true,
  })
  declare instruments: ManyToMany<typeof Instrument>

  @manyToMany(() => SectionGroup, {
    pivotTable: 'section_section_groups',
    localKey: 'id',
    pivotForeignKey: 'sections_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'section_group_id',
    pivotTimestamps: true,
    pivotColumns: ['order'],
  })
  declare section_groups: ManyToMany<typeof SectionGroup>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  serializeExtras() {
    return { pivot_order: this.$extras.pivot_order }
  }
}
