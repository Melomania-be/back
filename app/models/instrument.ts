import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import Contact from './contact.js'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import Section from './section.js'

export default class Instrument extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare family: string

  @manyToMany(() => Contact, {
    pivotTable: 'plays',
    pivotColumns: ['proficiency_level'],
    pivotTimestamps: true,
  })
  declare played_by: ManyToMany<typeof Contact>

  @manyToMany(() => Section, {
    pivotTable: 'played_in_sections',
    localKey: 'id',
    pivotForeignKey: 'instrument_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'sections_id',
    pivotTimestamps: true,
  })
  declare played_in_sections: ManyToMany<typeof Section>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  serializeExtras() {
    return { pivot_proficiency_level: this.$extras.pivot_proficiency_level }
  }
}
