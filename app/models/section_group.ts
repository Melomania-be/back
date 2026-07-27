import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import type { ManyToMany, HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import Section from './section.js'
import Project from './project.js'
import Organization from '#models/organization'

export default class SectionGroup extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @manyToMany(() => Section, {
    pivotTable: 'section_section_groups',
    localKey: 'id',
    pivotForeignKey: 'section_group_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'section_id',
    pivotTimestamps: true,
    pivotColumns: ['order'],
  })
  declare sections: ManyToMany<typeof Section>

  @hasMany(() => Project)
  declare projects: HasMany<typeof Project>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare organizationId: number | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  serializeExtras() {
    return { pivot_order: this.$extras.pivot_order }
  }
}
