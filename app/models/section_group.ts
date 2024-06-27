import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany, hasMany } from '@adonisjs/lucid/orm'
import Section from './section.js'
import type { ManyToMany, HasMany } from '@adonisjs/lucid/types/relations'
import Project from './project.js'

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
  })
  declare sections: ManyToMany<typeof Section>

  @hasMany(() => Project)
  declare projects: HasMany<typeof Project>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
